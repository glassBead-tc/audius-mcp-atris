/**
 * Verified identity for MCP-native OAuth bearers.
 *
 * The OAuth broker hands MCP clients the RAW Audius access token, so a
 * request's bearer can be verified upstream (GET /me) to recover the user id
 * — and the verified user id is what authorizes app-signed writes in
 * AudiusClient. Historically only the login-tool session path set a userId
 * (MCP clients never attached bearers — claude-code#46140); now that clients
 * do attach them, this module gives the bearer path the same verified
 * identity.
 *
 * Clients resend the same bearer on every request, so verification results
 * are cached: successes for ttlMs, failures briefly (negativeTtlMs) so a bad
 * token can't hammer /me. Concurrent resolves of the same token share one
 * in-flight verification.
 */

export interface BearerIdentityOptions {
  /** Cache lifetime for successful verifications (default 10 minutes). */
  readonly ttlMs?: number
  /** Cache lifetime for failed verifications (default 60 seconds). */
  readonly negativeTtlMs?: number
  /** Max cached tokens; oldest entry evicted beyond this (default 256). */
  readonly maxEntries?: number
  /** Injectable clock for tests. */
  readonly now?: () => number
}

export interface BearerIdentity {
  /**
   * Resolve the verified user id for a bearer token, calling `verify` on
   * cache miss. A `verify` failure (undefined or throw) resolves to
   * undefined and is negative-cached.
   */
  readonly resolve: (
    token: string,
    verify: (token: string) => Promise<string | undefined>
  ) => Promise<string | undefined>
}

export const makeBearerIdentity = (options: BearerIdentityOptions = {}): BearerIdentity => {
  const ttlMs = options.ttlMs ?? 10 * 60 * 1000
  const negativeTtlMs = options.negativeTtlMs ?? 60 * 1000
  const maxEntries = options.maxEntries ?? 256
  const now = options.now ?? Date.now

  const entries = new Map<string, { userId: string | undefined; at: number }>()
  const inflight = new Map<string, Promise<string | undefined>>()

  return {
    resolve: (token, verify) => {
      const cached = entries.get(token)
      if (cached !== undefined) {
        const ttl = cached.userId !== undefined ? ttlMs : negativeTtlMs
        if (now() - cached.at < ttl) return Promise.resolve(cached.userId)
        entries.delete(token)
      }

      const pending = inflight.get(token)
      if (pending !== undefined) return pending

      const run = verify(token)
        .catch(() => undefined)
        .then((userId) => {
          entries.set(token, { userId, at: now() })
          while (entries.size > maxEntries) {
            const oldest = entries.keys().next().value
            if (oldest === undefined) break
            entries.delete(oldest)
          }
          return userId
        })
        .finally(() => inflight.delete(token))
      inflight.set(token, run)
      return run
    }
  }
}
