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
import { signPersonalMessage } from "./RequestSigner.js"

const BASE_URL = process.env["AUDIUS_API_BASE"] ?? "https://api.audius.co/v1"

export interface RequestOptions {
  readonly query?: Record<string, string | number | boolean | undefined>
  readonly body?: unknown
  readonly headers?: Record<string, string>
  /** Required for DELETE requests — the destructive-operation speed bump. */
  readonly confirm?: boolean
  /**
   * Force a specific auth scheme. Default: writes are app-signed (Basic) when
   * possible, everything else uses the user bearer. "bearer" forces the user
   * token even on writes — needed for endpoints that authenticate the user
   * rather than the app (e.g. developer-app management). "signed" attaches
   * user_data/user_signature query params (eth personal-sign with the app
   * secret) — the shape gated reads (fan club feed, private history) accept;
   * requires an active user login for the grant to resolve.
   */
  readonly auth?: "bearer" | "app" | "signed"
}

export interface AuthContext {
  readonly bearerToken?: string
  /**
   * Verified user id of the active session login. Its presence is what
   * authorizes write signing: writes are signed with the app secret and
   * user_id is injected only when a user has logged in via the login tool.
   */
  readonly userId?: string
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

        const httpMethod = method.toUpperCase()
        const isWrite = httpMethod === "POST" || httpMethod === "PUT" || httpMethod === "DELETE"

        // Destructive-operation guard: DELETE performs a real, user-visible
        // removal (unfavorite, unfollow, delete playlist/comment). Require an
        // explicit opt-in so agents pause before destroying state.
        if (httpMethod === "DELETE" && options?.confirm !== true) {
          return yield* Effect.fail(new Error(
            "DELETE is a destructive operation. Re-run with { confirm: true } in options " +
            "after confirming the action with the user, e.g. " +
            `audius.request("DELETE", "${path}", { confirm: true })`
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

        // Signed reads (auth: "signed"): gated endpoints authenticate via
        // user_data/user_signature QUERY PARAMS — an eth personal-sign the
        // API recovers to a wallet and authorizes through the user's grant.
        // (The equivalent Encoded-Data-* headers are stripped upstream of
        // api.audius.co; query params are the reliable transport.) Gated on
        // an active login, same as write signing.
        if (options?.auth === "signed") {
          if (config.apiSecret === undefined || authContext?.userId === undefined) {
            return yield* Effect.fail(new Error(
              "auth: 'signed' requires the server's app secret and an active user login " +
              "(MCP OAuth or login tool) — the signature is authorized via the user's grant."
            ))
          }
          const message = `Atris signed read: ${Math.round(Date.now() / 1000)}`
          url.searchParams.set("user_data", message)
          url.searchParams.set("user_signature", signPersonalMessage(message, config.apiSecret))
          if (!url.searchParams.has("user_id")) {
            url.searchParams.set("user_id", authContext.userId)
          }
        }

        // Auth. Writes: sign with the app secret (HTTP Basic; password = app
        // private key) — the shape the Audius indexer honors — and inject the
        // logged-in user's id, which the write endpoints require. Gated on an
        // active session login (authContext.userId) so the secret never acts
        // without a user having authenticated. Reads: bearer for viewer
        // context (/me, has_current_user_* flags).
        if (!headers["Authorization"] && options?.auth !== "signed") {
          const appSigned = options?.auth !== "bearer" &&
            (isWrite || options?.auth === "app") &&
            config.apiSecret !== undefined && authContext?.userId !== undefined
          if (appSigned) {
            headers["Authorization"] =
              `Basic ${Buffer.from(`app:${config.apiSecret}`).toString("base64")}`
            if (!url.searchParams.has("user_id")) {
              url.searchParams.set("user_id", authContext!.userId!)
            }
          } else if (authContext?.bearerToken) {
            headers["Authorization"] = `Bearer ${authContext.bearerToken}`
          }
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
