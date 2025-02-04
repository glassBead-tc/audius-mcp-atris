import { LRUCache } from './lru-cache.js';
import { 
  StreamUrlCacheEntry, 
  ApiResponseCacheEntry,
  CacheType,
  CacheStats,
  CACHE_CONFIGS,
  BaseCacheConfig
} from './types.js';

/**
 * Enhanced cache manager supporting multiple cache types and memory management
 */
export class CacheManager {
  private static instance: CacheManager;
  private caches: Map<CacheType, LRUCache<string, any>>;
  private initialized: boolean = false;

  private constructor() {
    this.caches = new Map();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Initialize specific cache types as needed
   */
  private initializeCache(type: CacheType): void {
    if (this.caches.has(type)) return;

    const config: BaseCacheConfig = {
      ...CACHE_CONFIGS[type],
      name: type
    };

    this.caches.set(type, new LRUCache(config));
  }

  /**
   * Initialize all cache types
   */
  public initialize(): void {
    if (this.initialized) return;
    
    Object.values(CacheType).forEach(type => {
      this.initializeCache(type as CacheType);
    });

    this.initialized = true;
  }

  /**
   * Get a value from specified cache type
   */
  public get<T>(type: CacheType, key: string): T | undefined {
    this.initializeCache(type);
    return this.caches.get(type)?.get(key);
  }

  /**
   * Set a value in specified cache type with optional prefetching
   */
  public set<T>(type: CacheType, key: string, value: T, prefetch: boolean = true): void {
    this.initializeCache(type);
    this.caches.get(type)?.set(key, value);

    // Prefetch related data if enabled
    if (prefetch) {
      this.prefetchRelatedData(type, key, value).catch(() => {
        // Ignore prefetch errors
      });
    }
  }

  /**
   * Prefetch related data based on cache type and value
   */
  private async prefetchRelatedData(type: CacheType, key: string, value: any): Promise<void> {
    switch (type) {
      case CacheType.TrackMetadata:
        // Prefetch artist data when caching track
        if (value?.userId) {
          const userKey = `user:${value.userId}`;
          if (!this.get(CacheType.UserProfile, userKey)) {
            try {
              const userData = await this.fetchUserProfile(value.userId);
              this.set(CacheType.UserProfile, userKey, userData, false);
            } catch {
              // Ignore prefetch errors
            }
          }
        }
        break;

      case CacheType.ArtistTracks:
        // Prefetch track metadata when caching artist tracks
        if (Array.isArray(value)) {
          value.slice(0, 5).forEach(track => {
            const trackKey = `track:${track.id}`;
            if (!this.get(CacheType.TrackMetadata, trackKey)) {
              this.set(CacheType.TrackMetadata, trackKey, track, false);
            }
          });
        }
        break;
    }
  }

  /**
   * Fetch user profile for prefetching
   */
  private async fetchUserProfile(userId: string): Promise<any> {
    // This would be implemented to fetch from your API
    throw new Error('Not implemented');
  }

  /**
   * Get a stream URL from cache
   */
  public getStreamUrl(trackIdentifier: string): string | undefined {
    const entry = this.get<StreamUrlCacheEntry>(CacheType.StreamUrl, trackIdentifier);
    if (!entry || entry.expiresAt < Date.now()) {
      this.invalidateStreamUrl(trackIdentifier);
      return undefined;
    }
    return entry.url;
  }

  /**
   * Cache a stream URL
   */
  public setStreamUrl(trackIdentifier: string, url: string, expiresAt: number): void {
    this.set<StreamUrlCacheEntry>(CacheType.StreamUrl, trackIdentifier, { url, expiresAt });
  }

  /**
   * Get an API response from cache
   */
  public getApiResponse<T>(endpoint: string): T | undefined {
    const entry = this.get<ApiResponseCacheEntry>(CacheType.ApiResponse, endpoint);
    if (!entry || entry.expiresAt < Date.now()) {
      this.invalidateApiResponse(endpoint);
      return undefined;
    }
    return entry.data as T;
  }

  /**
   * Cache an API response
   */
  public setApiResponse<T>(endpoint: string, data: T, ttlMs?: number): void {
    const config = CACHE_CONFIGS[CacheType.ApiResponse];
    const expiresAt = Date.now() + (ttlMs || config.ttlMs);
    this.set<ApiResponseCacheEntry>(CacheType.ApiResponse, endpoint, { data, expiresAt });
  }

  /**
   * Invalidate a cached stream URL
   */
  public invalidateStreamUrl(trackIdentifier: string): void {
    this.caches.get(CacheType.StreamUrl)?.delete(trackIdentifier);
  }

  /**
   * Invalidate a cached API response
   */
  public invalidateApiResponse(endpoint: string): void {
    this.caches.get(CacheType.ApiResponse)?.delete(endpoint);
  }

  /**
   * Get cache statistics for all or specific cache type
   */
  public getStats(type?: CacheType): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    
    if (type) {
      const cache = this.caches.get(type);
      if (cache) {
        stats[type] = cache.getStats();
      }
    } else {
      this.caches.forEach((cache, cacheType) => {
        stats[cacheType] = cache.getStats();
      });
    }
    
    return stats;
  }

  /**
   * Clear specific cache type
   */
  public clearCache(type: CacheType): void {
    this.caches.get(type)?.clear();
  }

  /**
   * Clear all caches
   */
  public clearAll(): void {
    this.caches.forEach(cache => cache.clear());
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.caches.forEach(cache => {
      if ('destroy' in cache) {
        (cache as LRUCache<string, any>).destroy();
      }
    });
    this.caches.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();
