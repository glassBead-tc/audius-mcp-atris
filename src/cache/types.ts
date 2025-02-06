/**
 * Cache types enum
 */
export enum CacheType {
  StreamUrl = 'stream_url',
  ApiResponse = 'api_response',
  UserProfile = 'user_profile',
  TrackMetadata = 'track_metadata',
  ArtistTracks = 'artist_tracks',
  RelatedData = 'related_data'
}

/**
 * Base cache configuration options
 */
export interface BaseCacheConfig {
  maxSize: number;
  ttlMs: number;
  maxMemoryMB?: number;
  cleanupIntervalMs?: number;
  name?: string;
}

/**
 * Cache entry wrapper with metadata
 */
export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  size: number;
  lastAccessed: number;
}

/**
 * Cache entry for stream URLs
 */
export interface StreamUrlCacheEntry {
  url: string;
  expiresAt: number;
}

/**
 * Cache entry for API responses
 */
export interface ApiResponseCacheEntry {
  data: unknown;
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
  memoryUsed: number;
  lastCleanup: number;
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
  cleanup(): void;
}

/**
 * Cache configurations for each type
 */
export const CACHE_CONFIGS: Record<CacheType, BaseCacheConfig> = {
  [CacheType.StreamUrl]: {
    maxSize: 500,
    ttlMs: 1800000, // 30 minutes
    cleanupIntervalMs: 300000 // 5 minutes
  },
  [CacheType.ApiResponse]: {
    maxSize: 2000,
    ttlMs: 900000, // 15 minutes
    cleanupIntervalMs: 300000
  },
  [CacheType.UserProfile]: {
    maxSize: 1000,
    ttlMs: 86400000, // 24 hours
    cleanupIntervalMs: 3600000 // 1 hour
  },
  [CacheType.TrackMetadata]: {
    maxSize: 5000,
    ttlMs: 3600000, // 1 hour
    cleanupIntervalMs: 300000
  },
  [CacheType.ArtistTracks]: {
    maxSize: 1000,
    ttlMs: 1800000, // 30 minutes
    cleanupIntervalMs: 300000
  },
  [CacheType.RelatedData]: {
    maxSize: 2000,
    ttlMs: 1800000, // 30 minutes
    cleanupIntervalMs: 300000
  }
}
