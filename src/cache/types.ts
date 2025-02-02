/**
 * Base cache configuration options
 */
export interface CacheConfig {
  maxSize: number;
  ttlMs?: number;
}

/**
 * Cache entry for stream URLs
 */
export interface StreamUrlCacheEntry {
  url: string;
  expiresAt: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}

/**
 * Generic cache interface
 */
export interface ICache<K, V> {
  get(identifier: K): V | undefined;
  set(identifier: K, value: V): void;
  delete(identifier: K): void;
  clear(): void;
  size(): number;
  getStats(): CacheStats;
}
