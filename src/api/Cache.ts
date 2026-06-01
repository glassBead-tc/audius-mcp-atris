/**
 * Cache.ts — a tiny per-instance TTL cache for hot, idempotent reads (AX-23).
 *
 * Atris authenticates public reads with one shared API key, so a burst from
 * one agent can rate-limit another. Caching slow-moving GETs (trending, search)
 * for a short TTL absorbs duplicate upstream load — and is a context-economy
 * win too: a cache hit serves the same bytes with zero upstream calls.
 *
 * Per-instance and best-effort by design — Cloud Run instances are ephemeral,
 * so only data that tolerates a few seconds of staleness should be cached.
 */
export interface CacheEntry {
  value: unknown
  expiresAt: number
}

export class TtlCache {
  private readonly store = new Map<string, CacheEntry>()

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number = 200
  ) {}

  get(key: string): unknown | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: unknown): void {
    // Simple bound: evict the oldest insertion when full.
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }
}
