/**
 * Audius REST API client using native fetch.
 *
 * Wraps all API calls with:
 * - Base URL: https://api.audius.co/v1
 * - Automatic x-api-key header injection
 * - JSON response parsing
 * - Effect-based error handling
 */
import { Context, Effect, Layer } from "effect"
import { AppConfig } from "../AppConfig.js"
import { parseJsonPreservingLargeInts } from "./Json.js"

const BASE_URL = "https://api.audius.co/v1"

export interface RequestOptions {
  readonly query?: Record<string, string | number | boolean | undefined>
  readonly body?: unknown
  readonly headers?: Record<string, string>
}

export interface AuthContext {
  readonly bearerToken: string
}

export class AudiusClient extends Context.Tag("AudiusClient")<
  AudiusClient,
  {
    readonly request: (
      method: string,
      path: string,
      options?: RequestOptions,
      authContext?: AuthContext
    ) => Effect.Effect<unknown, Error>
  }
>() {}

export const AudiusClientLive: Layer.Layer<AudiusClient, never, AppConfig> = Layer.effect(
  AudiusClient,
  Effect.gen(function* () {
    const config = yield* AppConfig

    const request = (
      method: string,
      path: string,
      options?: RequestOptions,
      authContext?: AuthContext
    ): Effect.Effect<unknown, Error> =>
      Effect.gen(function* () {
        // Validate path to prevent SSRF via host hijacking
        if (typeof path !== "string" || !path.startsWith("/") || path.includes("@")) {
          return yield* Effect.fail(new Error(`Invalid API path: ${path}`))
        }

        // Validate query shape — must be an object, not a string
        if (options?.query !== undefined && (typeof options.query !== "object" || options.query === null)) {
          return yield* Effect.fail(new Error(
            `Invalid options.query: expected an object like { query: "search term" }, got ${typeof options.query}. ` +
            `Example: audius.request("GET", "/tracks/search", { query: { query: "What You Want" } })`
          ))
        }

        // Build URL with query params
        const url = new URL(`${BASE_URL}${path}`)
        if (options?.query) {
          for (const [key, value] of Object.entries(options.query)) {
            if (value !== undefined) {
              url.searchParams.set(key, String(value))
            }
          }
        }

        // Build headers
        const headers: Record<string, string> = {
          "Accept": "application/json",
          ...options?.headers
        }
        if (config.apiKey) {
          headers["x-api-key"] = config.apiKey
        }
        if (authContext?.bearerToken) {
          headers["Authorization"] = `Bearer ${authContext.bearerToken}`
        }
        if (options?.body) {
          headers["Content-Type"] = "application/json"
        }

        const response = yield* Effect.tryPromise({
          try: () =>
            fetch(url.toString(), {
              method: method.toUpperCase(),
              headers,
              body: options?.body ? JSON.stringify(options.body) : undefined
            }),
          catch: (e) => new Error(`Audius API request failed: ${e}`)
        })

        if (!response.ok) {
          const text = yield* Effect.tryPromise({
            try: () => response.text(),
            catch: () => new Error("Failed to read error response")
          })
          return yield* Effect.fail(
            new Error(`Audius API ${response.status}: ${text}`)
          )
        }

        // Binary/redirect endpoints (e.g. /tracks/{id}/stream resolves to a
        // signed CDN MP3). Don't download or JSON-parse the body — hand back
        // the final post-redirect URL so the agent can use it directly.
        const contentType = response.headers.get("content-type") ?? ""
        if (!contentType.includes("json")) {
          yield* Effect.promise(() =>
            response.body?.cancel().catch(() => undefined) ?? Promise.resolve(undefined)
          )
          return {
            url: response.url,
            contentType: contentType || "unknown",
            note: "Non-JSON response; body not downloaded. Use this URL directly."
          }
        }

        const text = yield* Effect.tryPromise({
          try: () => response.text(),
          catch: (e) => new Error(`Failed to read response body: ${e}`)
        })

        // Wei-scale integer amounts (tips, transactions, coins) must survive
        // as strings — plain JSON.parse corrupts them past 2^53.
        const json = yield* Effect.try({
          try: () => parseJsonPreservingLargeInts(text),
          catch: (e) => new Error(`Failed to parse JSON response: ${e}`)
        })

        return json
      })

    return { request }
  })
)
