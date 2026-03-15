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

const BASE_URL = "https://api.audius.co/v1"

export interface RequestOptions {
  readonly query?: Record<string, string | number | boolean | undefined>
  readonly body?: unknown
  readonly headers?: Record<string, string>
}

export class AudiusClient extends Context.Tag("AudiusClient")<
  AudiusClient,
  {
    readonly request: (
      method: string,
      path: string,
      options?: RequestOptions
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
      options?: RequestOptions
    ): Effect.Effect<unknown, Error> =>
      Effect.gen(function* () {
        // Validate path to prevent SSRF via host hijacking
        if (typeof path !== "string" || !path.startsWith("/") || path.includes("@")) {
          return yield* Effect.fail(new Error(`Invalid API path: ${path}`))
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

        const json = yield* Effect.tryPromise({
          try: () => response.json() as Promise<unknown>,
          catch: (e) => new Error(`Failed to parse JSON response: ${e}`)
        })

        return json
      })

    return { request }
  })
)
