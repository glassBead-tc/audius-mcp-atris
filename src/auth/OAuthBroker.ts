/**
 * MCP-native OAuth broker for "Log in with Audius" (capability roadmap Phase 2).
 *
 * Audius ships a real OAuth 2.0 Authorization Code + PKCE flow (March 2026)
 * but exposes no RFC 8414 discovery metadata and no dynamic client
 * registration, so standard MCP clients cannot use it directly. This broker
 * bridges the gap: the MCP server presents itself as an OAuth authorization
 * server (per the MCP authorization spec) and brokers the flow to Audius.
 *
 *   MCP client ─▶ POST /oauth/register        stateless DCR (RFC 7591)
 *   MCP client ─▶ GET  /oauth/authorize  ─302▶ api.audius.co/v1/oauth/authorize
 *   Audius     ─▶ GET  /oauth/callback        exchanges the code upstream,
 *                                             mints a short-lived sealed code
 *   MCP client ─▶ POST /oauth/token           verifies the client's PKCE and
 *                                             returns the raw Audius token pair
 *   MCP client ─▶ POST /oauth/revoke          proxied to Audius (RFC 7009)
 *
 * The access token handed to the MCP client IS the Audius access token, so
 * the existing bearer pass-through in the transport and AudiusClient works
 * unchanged. Refreshes proxy through /oauth/token, letting the client's
 * standard OAuth machinery drive Audius's single-use rotation.
 *
 * Statelessness: all flow state is sealed with AES-256-GCM (see Crypto.ts)
 * under MCP_AUTH_SECRET — no session store, no database. The trade-off is
 * that our authorization codes are not strictly single-use; they are bound
 * to the client's PKCE verifier and expire in 2 minutes instead.
 */
import type { IncomingMessage, ServerResponse } from "node:http"
import { deriveKey, randomToken, s256Challenge, seal, unseal } from "./Crypto.js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OAuthBrokerConfig {
  /** Symmetric secret (MCP_AUTH_SECRET) for sealing flow state. */
  readonly secret: string
  /** Audius developer app API key — the upstream OAuth client_id. */
  readonly audiusApiKey: string
  /** Public base URL override (MCP_PUBLIC_URL); derived per-request if unset. */
  readonly publicUrl?: string
  /** Upstream Audius API base (tests override this). */
  readonly upstreamBase?: string
  /** Scope requested from Audius when the client doesn't specify. */
  readonly defaultScope?: string
  /**
   * Sink for tokens obtained via session-mode logins (the `login` tool path).
   * Called by the callback handler with the login id and the raw Audius
   * token response.
   */
  readonly onSessionTokens?: (loginId: string, tokens: Record<string, unknown>) => void
}

export interface OAuthBroker {
  /** Returns true if the request was an auth route and has been handled. */
  readonly handle: (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean>
  /**
   * Begin a session-mode login (the `login` tool path): returns the Audius
   * consent URL the user must open. The callback deposits the resulting
   * tokens via onSessionTokens instead of redirecting to an MCP client.
   */
  readonly startSessionLogin: (base: string) => { loginId: string; url: string }
}

interface RegisteredClient {
  readonly ru: string[] // redirect_uris
  readonly n?: string // client_name
}

interface PendingLogin {
  readonly v: string // upstream PKCE verifier
  readonly cc: string // client's code_challenge
  readonly cru: string // client's redirect_uri
  readonly cs?: string // client's state
}

/** Session-mode login (the `login` tool path) — no downstream MCP client. */
interface PendingSessionLogin {
  readonly m: "session"
  readonly v: string // upstream PKCE verifier
  readonly li: string // login id the tokens get deposited under
}

interface UpstreamTokens {
  readonly access_token: string
  readonly token_type?: string
  readonly expires_in?: number
  readonly refresh_token?: string
  readonly refresh_expires_in?: number
  readonly scope?: string
}

interface SealedCode {
  readonly t: UpstreamTokens
  readonly cc: string // client's code_challenge, verified at /oauth/token
  readonly cru: string // client's redirect_uri, must match at /oauth/token
}

const CLIENT_PURPOSE = "client"
const LOGIN_PURPOSE = "login"
const CODE_PURPOSE = "code"

const LOGIN_TTL_SECONDS = 600 // user has 10 minutes to complete the consent screen
const CODE_TTL_SECONDS = 120 // client must redeem our code within 2 minutes

const DEFAULT_UPSTREAM = "https://api.audius.co/v1"

// ---------------------------------------------------------------------------
// Small HTTP helpers
// ---------------------------------------------------------------------------

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    // Standard OAuth endpoints carry no cookies; open CORS lets browser-based
    // MCP clients complete the flow.
    "Access-Control-Allow-Origin": "*"
  })
  res.end(JSON.stringify(body))
}

const sendRedirect = (res: ServerResponse, location: string): void => {
  res.writeHead(302, { Location: location, "Cache-Control": "no-store" })
  res.end()
}

const oauthError = (res: ServerResponse, status: number, error: string, description: string): void =>
  sendJson(res, status, { error, error_description: description })

const redirectWithParams = (redirectUri: string, params: Record<string, string | undefined>): string => {
  const url = new URL(redirectUri)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, v)
  }
  return url.toString()
}

const readBody = async (req: IncomingMessage): Promise<string> => {
  const MAX = 100 * 1024
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    total += (chunk as Buffer).length
    if (total > MAX) throw new Error("Body too large")
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString("utf-8")
}

/** Parse a POST body as JSON or application/x-www-form-urlencoded. */
const parseBody = (raw: string, contentType: string): Record<string, unknown> => {
  if (contentType.includes("application/json")) {
    return JSON.parse(raw) as Record<string, unknown>
  }
  const params = new URLSearchParams(raw)
  const out: Record<string, unknown> = {}
  for (const [k, v] of params) out[k] = v
  return out
}

const isAcceptableRedirectUri = (uri: string): boolean => {
  let parsed: URL
  try {
    parsed = new URL(uri)
  } catch {
    return false
  }
  if (parsed.username || parsed.password || parsed.hash) return false
  if (parsed.protocol === "https:") return true
  if (parsed.protocol === "http:") {
    // Loopback only — native MCP clients (Claude Code etc.) listen locally.
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]"
  }
  // Custom app schemes (e.g. cursor://) are allowed for native clients.
  return /^[a-z][a-z0-9+.-]*:$/i.test(parsed.protocol)
}

// ---------------------------------------------------------------------------
// Broker
// ---------------------------------------------------------------------------

export const makeOAuthBroker = (config: OAuthBrokerConfig): OAuthBroker => {
  const key = deriveKey(config.secret)
  const upstream = (config.upstreamBase ?? DEFAULT_UPSTREAM).replace(/\/$/, "")
  const defaultScope = config.defaultScope ?? "write"

  /** Public base URL: explicit override, else derived from the request. */
  const baseUrl = (req: IncomingMessage): string => {
    if (config.publicUrl) return config.publicUrl.replace(/\/$/, "")
    const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "http"
    const host = req.headers.host ?? "localhost"
    return `${proto}://${host}`
  }

  // -- Metadata ------------------------------------------------------------

  const protectedResourceMetadata = (base: string) => ({
    resource: `${base}/mcp`,
    authorization_servers: [base],
    bearer_methods_supported: ["header"],
    scopes_supported: ["read", "write"]
  })

  const authServerMetadata = (base: string) => ({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    revocation_endpoint: `${base}/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["read", "write"]
  })

  /** Build the upstream Audius consent URL for a sealed pending login. */
  const upstreamAuthorizeUrl = (base: string, scope: string, sealedState: string, verifier: string): string => {
    const authorizeUrl = new URL(`${upstream}/oauth/authorize`)
    authorizeUrl.searchParams.set("response_type", "code")
    authorizeUrl.searchParams.set("scope", scope)
    authorizeUrl.searchParams.set("api_key", config.audiusApiKey)
    authorizeUrl.searchParams.set("redirect_uri", `${base}/oauth/callback`)
    authorizeUrl.searchParams.set("state", sealedState)
    authorizeUrl.searchParams.set("code_challenge", s256Challenge(verifier))
    authorizeUrl.searchParams.set("code_challenge_method", "S256")
    authorizeUrl.searchParams.set("response_mode", "query")
    authorizeUrl.searchParams.set("display", "fullScreen")
    return authorizeUrl.toString()
  }

  /** Exchange an upstream authorization code for Audius tokens. */
  const exchangeUpstreamCode = async (base: string, code: string, verifier: string): Promise<
    { ok: true; tokens: UpstreamTokens } | { ok: false; error: string; description: string }
  > => {
    try {
      const resp = await fetch(`${upstream}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          code_verifier: verifier,
          client_id: config.audiusApiKey,
          redirect_uri: `${base}/oauth/callback`
        })
      })
      const json = (await resp.json()) as Record<string, unknown>
      if (!resp.ok || typeof json["access_token"] !== "string") {
        return {
          ok: false,
          error: (json["error"] as string) ?? "server_error",
          description: (json["error_description"] as string) ?? `Audius token exchange failed (HTTP ${resp.status})`
        }
      }
      return { ok: true, tokens: json as unknown as UpstreamTokens }
    } catch (e) {
      return { ok: false, error: "server_error", description: `Audius token exchange failed: ${e}` }
    }
  }

  // -- /oauth/register (RFC 7591, stateless) --------------------------------

  const handleRegister = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    let body: Record<string, unknown>
    try {
      body = parseBody(await readBody(req), (req.headers["content-type"] as string) ?? "application/json")
    } catch {
      return oauthError(res, 400, "invalid_client_metadata", "Body must be JSON")
    }

    const redirectUris = body["redirect_uris"]
    if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every((u) => typeof u === "string")) {
      return oauthError(res, 400, "invalid_client_metadata", "redirect_uris (non-empty string array) is required")
    }
    const bad = (redirectUris as string[]).find((u) => !isAcceptableRedirectUri(u))
    if (bad !== undefined) {
      return oauthError(res, 400, "invalid_redirect_uri", `Unacceptable redirect_uri: ${bad}`)
    }

    const clientName = typeof body["client_name"] === "string" ? (body["client_name"] as string) : undefined
    const client: RegisteredClient = { ru: redirectUris as string[], ...(clientName ? { n: clientName } : {}) }
    // No expiry: the client_id is self-contained and there is nothing to
    // clean up server-side. Clients re-register freely.
    const clientId = seal(key, CLIENT_PURPOSE, client)

    sendJson(res, 201, {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      ...(clientName ? { client_name: clientName } : {})
    })
  }

  // -- /oauth/authorize ------------------------------------------------------

  const handleAuthorize = (req: IncomingMessage, res: ServerResponse, url: URL): void => {
    const q = url.searchParams
    const clientId = q.get("client_id") ?? ""
    const redirectUri = q.get("redirect_uri") ?? ""

    const client = unseal<RegisteredClient>(key, CLIENT_PURPOSE, clientId)
    if (!client) {
      return oauthError(res, 400, "invalid_client", "Unknown client_id — register at /oauth/register first")
    }
    if (!client.ru.includes(redirectUri)) {
      return oauthError(res, 400, "invalid_request", "redirect_uri does not match the registered redirect_uris")
    }

    // From here on, errors go back to the client's redirect_uri per OAuth.
    const state = q.get("state") ?? undefined
    const fail = (error: string, description: string): void =>
      sendRedirect(res, redirectWithParams(redirectUri, { error, error_description: description, state }))

    if (q.get("response_type") !== "code") return fail("unsupported_response_type", "response_type must be 'code'")
    const codeChallenge = q.get("code_challenge")
    if (!codeChallenge) return fail("invalid_request", "code_challenge is required (PKCE S256)")
    if ((q.get("code_challenge_method") ?? "S256") !== "S256") {
      return fail("invalid_request", "code_challenge_method must be S256")
    }

    // Scope: honor an explicit read-only request; everything else gets the
    // deployment default (write) — that's what the user consents to on Audius.
    const requested = q.get("scope")
    const scope = requested && /\bwrite\b/.test(requested)
      ? "write"
      : requested && /\bread\b/.test(requested)
        ? "read"
        : defaultScope

    const pending: PendingLogin = {
      v: randomToken(48),
      cc: codeChallenge,
      cru: redirectUri,
      ...(state !== undefined ? { cs: state } : {})
    }
    const upstreamState = seal(key, LOGIN_PURPOSE, pending, LOGIN_TTL_SECONDS)
    sendRedirect(res, upstreamAuthorizeUrl(baseUrl(req), scope, upstreamState, pending.v))
  }

  // -- Session-mode login (the `login` tool path) ------------------------------

  const startSessionLogin = (base: string): { loginId: string; url: string } => {
    const pending: PendingSessionLogin = { m: "session", v: randomToken(48), li: randomToken(16) }
    const sealedState = seal(key, LOGIN_PURPOSE, pending, LOGIN_TTL_SECONDS)
    return { loginId: pending.li, url: upstreamAuthorizeUrl(base, defaultScope, sealedState, pending.v) }
  }

  // -- /oauth/callback (from Audius) ------------------------------------------

  const sendCallbackPage = (res: ServerResponse, status: number, title: string, detail: string): void => {
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" })
    res.end(`<!doctype html><html><head><title>Audius MCP</title><style>
body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;background:#f5f3ff;color:#1f2937}
main{text-align:center;max-width:28rem;padding:2rem}h1{font-size:1.4rem}p{color:#6b7280}
</style></head><body><main><h1>${title}</h1><p>${detail}</p></main></body></html>`)
  }

  const handleCallback = async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> => {
    const q = url.searchParams
    const state = q.get("state") ?? ""
    const sessionPending = unseal<PendingSessionLogin>(key, LOGIN_PURPOSE, state)

    // -- Session-mode (login tool): deposit tokens, render a page ------------
    if (sessionPending && sessionPending.m === "session") {
      const upstreamError = q.get("error")
      if (upstreamError) {
        return sendCallbackPage(res, 400, "Login failed", `Audius reported: ${upstreamError} — ${q.get("error_description") ?? "no details"}. Return to your agent and try again.`)
      }
      const code = q.get("code")
      if (!code) return sendCallbackPage(res, 400, "Login failed", "Audius returned no authorization code. Return to your agent and try again.")

      const result = await exchangeUpstreamCode(baseUrl(req), code, sessionPending.v)
      if (!result.ok) {
        return sendCallbackPage(res, 502, "Login failed", `${result.error}: ${result.description}`)
      }
      config.onSessionTokens?.(sessionPending.li, result.tokens as unknown as Record<string, unknown>)
      return sendCallbackPage(res, 200, "✅ Logged in with Audius", "You can close this tab and return to your agent — it will pick the session up from here.")
    }

    // -- Client-mode (MCP-native OAuth) ---------------------------------------
    const pending = unseal<PendingLogin>(key, LOGIN_PURPOSE, state)
    if (!pending) {
      return oauthError(res, 400, "invalid_request", "Login state is missing, expired (10 min), or tampered — restart the login")
    }

    const clientRedirect = (params: Record<string, string | undefined>): void =>
      sendRedirect(res, redirectWithParams(pending.cru, { ...params, state: pending.cs }))

    const upstreamError = q.get("error")
    if (upstreamError) {
      return clientRedirect({
        error: upstreamError,
        error_description: q.get("error_description") ?? undefined
      })
    }

    const code = q.get("code")
    if (!code) return clientRedirect({ error: "invalid_request", error_description: "Audius returned no code" })

    // Exchange immediately — the upstream verifier only exists inside the
    // sealed state, so this is the one moment the exchange can happen.
    const result = await exchangeUpstreamCode(baseUrl(req), code, pending.v)
    if (!result.ok) {
      return clientRedirect({ error: result.error, error_description: result.description })
    }

    const sealedCode: SealedCode = { t: result.tokens, cc: pending.cc, cru: pending.cru }
    clientRedirect({ code: seal(key, CODE_PURPOSE, sealedCode, CODE_TTL_SECONDS) })
  }

  // -- /oauth/token -------------------------------------------------------------

  const handleToken = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    let body: Record<string, unknown>
    try {
      body = parseBody(await readBody(req), (req.headers["content-type"] as string) ?? "")
    } catch {
      return oauthError(res, 400, "invalid_request", "Body must be JSON or form-encoded")
    }

    const grantType = body["grant_type"]

    if (grantType === "authorization_code") {
      const sealed = unseal<SealedCode>(key, CODE_PURPOSE, (body["code"] as string) ?? "")
      if (!sealed) {
        return oauthError(res, 400, "invalid_grant", "Authorization code is invalid or expired (2 min) — restart the login")
      }
      const verifier = body["code_verifier"]
      if (typeof verifier !== "string" || s256Challenge(verifier) !== sealed.cc) {
        return oauthError(res, 400, "invalid_grant", "PKCE verification failed")
      }
      const redirectUri = body["redirect_uri"]
      if (typeof redirectUri === "string" && redirectUri !== sealed.cru) {
        return oauthError(res, 400, "invalid_grant", "redirect_uri does not match the authorization request")
      }
      return sendJson(res, 200, {
        access_token: sealed.t.access_token,
        token_type: "Bearer",
        ...(sealed.t.expires_in !== undefined ? { expires_in: sealed.t.expires_in } : {}),
        ...(sealed.t.refresh_token !== undefined ? { refresh_token: sealed.t.refresh_token } : {}),
        ...(sealed.t.refresh_expires_in !== undefined ? { refresh_expires_in: sealed.t.refresh_expires_in } : {}),
        ...(sealed.t.scope !== undefined ? { scope: sealed.t.scope } : {})
      })
    }

    if (grantType === "refresh_token") {
      const refreshToken = body["refresh_token"]
      if (typeof refreshToken !== "string" || !refreshToken) {
        return oauthError(res, 400, "invalid_request", "refresh_token is required")
      }
      // Proxy the rotation to Audius. Reuse of a consumed refresh token
      // revokes the whole family upstream — the client owns serialization.
      try {
        const resp = await fetch(`${upstream}/oauth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: config.audiusApiKey
          })
        })
        const json = (await resp.json()) as Record<string, unknown>
        return sendJson(res, resp.ok ? 200 : resp.status, json)
      } catch (e) {
        return oauthError(res, 502, "server_error", `Audius refresh failed: ${e}`)
      }
    }

    return oauthError(res, 400, "unsupported_grant_type", "grant_type must be 'authorization_code' or 'refresh_token'")
  }

  // -- /oauth/revoke ---------------------------------------------------------

  const handleRevoke = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    let body: Record<string, unknown>
    try {
      body = parseBody(await readBody(req), (req.headers["content-type"] as string) ?? "")
    } catch {
      return oauthError(res, 400, "invalid_request", "Body must be JSON or form-encoded")
    }
    const token = body["token"]
    if (typeof token !== "string" || !token) {
      return oauthError(res, 400, "invalid_request", "token is required")
    }
    try {
      await fetch(`${upstream}/oauth/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, client_id: config.audiusApiKey })
      })
    } catch {
      // RFC 7009: revocation failures are non-fatal to the client.
    }
    sendJson(res, 200, {})
  }

  // -- Router -----------------------------------------------------------------

  const handle = async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    const path = url.pathname
    const method = req.method ?? "GET"

    // RFC 9728 allows the resource path appended to the well-known path.
    if (method === "GET" && (path === "/.well-known/oauth-protected-resource" || path === "/.well-known/oauth-protected-resource/mcp")) {
      sendJson(res, 200, protectedResourceMetadata(baseUrl(req)))
      return true
    }
    if (method === "GET" && (path === "/.well-known/oauth-authorization-server" || path === "/.well-known/oauth-authorization-server/mcp")) {
      sendJson(res, 200, authServerMetadata(baseUrl(req)))
      return true
    }
    if (path === "/oauth/register" && method === "POST") {
      await handleRegister(req, res)
      return true
    }
    if (path === "/oauth/authorize" && method === "GET") {
      handleAuthorize(req, res, url)
      return true
    }
    if (path === "/oauth/callback" && method === "GET") {
      await handleCallback(req, res, url)
      return true
    }
    if (path === "/oauth/token" && method === "POST") {
      await handleToken(req, res)
      return true
    }
    if (path === "/oauth/revoke" && method === "POST") {
      await handleRevoke(req, res)
      return true
    }
    return false
  }

  return { handle, startSessionLogin }
}
