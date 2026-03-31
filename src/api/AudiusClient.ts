/**
 * Audius REST API client using native fetch.
 *
 * Wraps all API calls with:
 * - Base URL: https://api.audius.co/v1
 * - Automatic x-api-key header injection
 * - JSON response parsing
 * - Effect-based error handling
 *
 * Also provides commsRequest() for the /comms/ messaging system
 * which uses x-sig header authentication (secp256k1 + keccak256).
 */
import { Context, Effect, Layer } from "effect"
import { secp256k1 } from "@noble/curves/secp256k1.js"
import { keccak_256 } from "@noble/hashes/sha3.js"
import { hexToBytes } from "@noble/hashes/utils.js"
import { AppConfig } from "../AppConfig.js"

const BASE_URL = "https://api.audius.co/v1"
const COMMS_BASE_URL = "https://api.audius.co"

export interface RequestOptions {
  readonly query?: Record<string, string | number | boolean | undefined>
  readonly body?: unknown
  readonly headers?: Record<string, string>
}

/**
 * Sign a payload for the Audius comms system (x-sig header).
 *
 * @noble/curves v2 "recovered" format returns [recovery, r(32), s(32)].
 * The Audius SDK expects [r(32), s(32), recovery] so we rearrange.
 */
function signForComms(payload: string, privateKeyHex: string): string {
  const hash = keccak_256(new TextEncoder().encode(payload))
  const recovered = secp256k1.sign(hash, hexToBytes(privateKeyHex), { format: "recovered" })
  const sigBytes = new Uint8Array(65)
  sigBytes.set(recovered.subarray(1)) // r + s (64 bytes)
  sigBytes[64] = recovered[0]         // recovery bit
  let binary = ""
  for (let i = 0; i < sigBytes.length; i++) {
    binary += String.fromCharCode(sigBytes[i])
  }
  return btoa(binary)
}

/** Validate path to prevent SSRF via host hijacking. */
function validatePath(path: string, label: string): Effect.Effect<void, Error> {
  if (typeof path !== "string" || !path.startsWith("/") || path.includes("@")) {
    return Effect.fail(new Error(`Invalid ${label} path: ${path}`))
  }
  return Effect.void
}

/** Build a URL with base and optional query params. */
function buildUrl(base: string, path: string, query?: RequestOptions["query"]): URL {
  const url = new URL(`${base}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url
}

/** Execute a fetch request, parse JSON, and map errors into Effect failures. */
function fetchJson(
  url: URL,
  method: string,
  headers: Record<string, string>,
  body: unknown | undefined,
  errorPrefix: string
): Effect.Effect<unknown, Error> {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(url.toString(), {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined
        }),
      catch: (e) => new Error(`${errorPrefix} request failed: ${e}`)
    })

    if (!response.ok) {
      const text = yield* Effect.tryPromise({
        try: () => response.text(),
        catch: () => new Error("Failed to read error response")
      })
      return yield* Effect.fail(new Error(`${errorPrefix} ${response.status}: ${text}`))
    }

    return yield* Effect.tryPromise({
      try: () => response.json() as Promise<unknown>,
      catch: (e) => new Error(`Failed to parse JSON response: ${e}`)
    })
  })
}

export class AudiusClient extends Context.Tag("AudiusClient")<
  AudiusClient,
  {
    readonly request: (
      method: string,
      path: string,
      options?: RequestOptions
    ) => Effect.Effect<unknown, Error>
    readonly commsRequest: (
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

    /** Build common headers (Accept, x-api-key, Content-Type). */
    const baseHeaders = (
      extra: Record<string, string> | undefined,
      hasBody: boolean
    ): Record<string, string> => {
      const h: Record<string, string> = { "Accept": "application/json", ...extra }
      if (config.apiKey) h["x-api-key"] = config.apiKey
      if (hasBody) h["Content-Type"] = "application/json"
      return h
    }

    const request = (
      method: string,
      path: string,
      options?: RequestOptions
    ): Effect.Effect<unknown, Error> =>
      Effect.gen(function* () {
        yield* validatePath(path, "API")
        const url = buildUrl(BASE_URL, path, options?.query)
        const headers = baseHeaders(options?.headers, !!options?.body)
        return yield* fetchJson(url, method.toUpperCase(), headers, options?.body, "Audius API")
      })

    const commsRequest = (
      method: string,
      path: string,
      options?: RequestOptions
    ): Effect.Effect<unknown, Error> =>
      Effect.gen(function* () {
        if (!config.apiSecret) {
          return yield* Effect.fail(
            new Error("AUDIUS_API_SECRET is required for comms requests")
          )
        }

        yield* validatePath(path, "comms")
        const url = buildUrl(COMMS_BASE_URL, path, options?.query)

        // GET signs the path+query; POST signs the JSON body
        const upperMethod = method.toUpperCase()
        const sigPayload = (upperMethod === "POST" && options?.body)
          ? JSON.stringify(options.body)
          : url.pathname + url.search

        const headers = baseHeaders(options?.headers, !!options?.body)
        headers["x-sig"] = signForComms(sigPayload, config.apiSecret)

        return yield* fetchJson(url, upperMethod, headers, options?.body, "Audius comms")
      })

    return { request, commsRequest }
  })
)
