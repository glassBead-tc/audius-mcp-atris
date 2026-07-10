/**
 * In-session user authentication (capability roadmap Phase 2, login tool path).
 *
 * Claude Code has a known bug (anthropics/claude-code#46140) where MCP OAuth
 * completes but the bearer token is never attached to subsequent requests.
 * This module provides the workaround path: a `login` tool hands the user the
 * Audius consent URL, the approval lands on our own /oauth/callback, and the
 * tokens are deposited HERE — an in-memory, single-active-login store the
 * server consults when a request carries no Authorization header.
 *
 * Deliberately single-user: one active Audius login per server process. That
 * matches a personal/local deployment; multi-user deployments should rely on
 * MCP-native OAuth (the broker), where each client carries its own bearer.
 *
 * The store owns token refresh: Audius access tokens live 1 hour and refresh
 * tokens are single-use with family revocation on reuse, so refreshes are
 * serialized through a promise chain and the stored pair is swapped
 * atomically.
 */
import { Context, Layer } from "effect"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredTokens {
  readonly accessToken: string
  readonly refreshToken?: string
  /** Epoch ms when the access token expires. */
  readonly expiresAt: number
}

export interface UpstreamTokenResponse {
  readonly access_token: string
  readonly expires_in?: number
  readonly refresh_token?: string
}

export interface UserAuthService {
  /** False when MCP_AUTH_SECRET is not configured. */
  readonly enabled: boolean
  /** Begin a login: returns the consent URL + login id, or null when disabled. */
  readonly startLogin: () => { loginId: string; url: string } | null
  /** Claim tokens deposited by the OAuth callback for this login id. */
  readonly claimLogin: (loginId: string) => "claimed" | "pending" | "unknown"
  /** True if a login is active (does not validate against Audius). */
  readonly isActive: () => boolean
  /** Current access token, auto-refreshing when near expiry. */
  readonly bearer: () => Promise<string | undefined>
  /** Verified user id of the active login (set after /me verification). */
  readonly userId: () => string | undefined
  /** Record the verified user id for the active login. */
  readonly setUserId: (id: string) => void
  /** Revoke upstream (best-effort) and clear the active login. */
  readonly logout: () => Promise<boolean>
  /** HTTP router for the OAuth broker endpoints (undefined when disabled). */
  readonly authRouter?: (
    req: import("node:http").IncomingMessage,
    res: import("node:http").ServerResponse,
    url: URL
  ) => Promise<boolean>
}

export class UserAuth extends Context.Tag("UserAuth")<UserAuth, UserAuthService>() {}

// ---------------------------------------------------------------------------
// Token store
// ---------------------------------------------------------------------------

export interface TokenStoreConfig {
  /** Audius API base, e.g. https://api.audius.co/v1 (tests override). */
  readonly upstreamBase: string
  /** Audius developer app API key (upstream OAuth client_id). */
  readonly clientId: string
}

const PENDING_TTL_MS = 10 * 60 * 1000 // staged logins expire after 10 minutes
const REFRESH_SKEW_MS = 60 * 1000 // refresh 1 minute before expiry

export const toStoredTokens = (t: UpstreamTokenResponse): StoredTokens => ({
  accessToken: t.access_token,
  ...(t.refresh_token !== undefined ? { refreshToken: t.refresh_token } : {}),
  expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000
})

export interface TokenStore {
  readonly deposit: (loginId: string, tokens: UpstreamTokenResponse) => void
  readonly claim: (loginId: string) => "claimed" | "pending" | "unknown"
  readonly isActive: () => boolean
  readonly bearer: () => Promise<string | undefined>
  readonly userId: () => string | undefined
  readonly setUserId: (id: string) => void
  readonly logout: () => Promise<boolean>
}

export const makeTokenStore = (config: TokenStoreConfig): TokenStore => {
  const pending = new Map<string, { tokens: StoredTokens; at: number }>()
  let active: StoredTokens | undefined
  let activeUserId: string | undefined
  // Serializes refreshes: a concurrent refresh would consume the same
  // single-use refresh token twice and revoke the whole family upstream.
  let chain: Promise<unknown> = Promise.resolve()

  const prunePending = (): void => {
    const cutoff = Date.now() - PENDING_TTL_MS
    for (const [id, entry] of pending) {
      if (entry.at < cutoff) pending.delete(id)
    }
  }

  const refresh = async (tokens: StoredTokens): Promise<StoredTokens | undefined> => {
    if (!tokens.refreshToken) return undefined
    try {
      const resp = await fetch(`${config.upstreamBase}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: tokens.refreshToken,
          client_id: config.clientId
        })
      })
      const json = (await resp.json()) as Record<string, unknown>
      if (!resp.ok || typeof json["access_token"] !== "string") return undefined
      return toStoredTokens(json as unknown as UpstreamTokenResponse)
    } catch {
      return undefined
    }
  }

  return {
    deposit: (loginId, tokens) => {
      prunePending()
      pending.set(loginId, { tokens: toStoredTokens(tokens), at: Date.now() })
    },

    claim: (loginId) => {
      prunePending()
      const entry = pending.get(loginId)
      if (entry) {
        pending.delete(loginId)
        active = entry.tokens
        activeUserId = undefined // set after /me verification
        return "claimed"
      }
      return active ? "pending" : "unknown"
    },

    isActive: () => active !== undefined,

    userId: () => (active !== undefined ? activeUserId : undefined),

    setUserId: (id) => {
      activeUserId = id
    },

    bearer: () => {
      const run = chain.then(async (): Promise<string | undefined> => {
        if (!active) return undefined
        if (Date.now() < active.expiresAt - REFRESH_SKEW_MS) return active.accessToken
        const rotated = await refresh(active)
        if (rotated) {
          active = rotated
          return active.accessToken
        }
        // Refresh failed (expired chain, family revoked, network): drop the
        // login rather than hand out a token we know is dead.
        active = undefined
        return undefined
      })
      chain = run.catch(() => undefined)
      return run
    },

    logout: async () => {
      const had = active !== undefined
      const refreshToken = active?.refreshToken
      active = undefined
      activeUserId = undefined
      if (refreshToken) {
        try {
          await fetch(`${config.upstreamBase}/oauth/revoke`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: refreshToken, client_id: config.clientId })
          })
        } catch {
          // RFC 7009: revocation failures are non-fatal.
        }
      }
      return had
    }
  }
}

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

/** No-op service for deployments without MCP_AUTH_SECRET. */
export const UserAuthDisabled: Layer.Layer<UserAuth> = Layer.succeed(UserAuth, {
  enabled: false,
  startLogin: () => null,
  claimLogin: () => "unknown",
  isActive: () => false,
  bearer: () => Promise.resolve(undefined),
  userId: () => undefined,
  setUserId: () => undefined,
  logout: () => Promise.resolve(false)
})
