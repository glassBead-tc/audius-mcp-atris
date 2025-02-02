import { LRUCache } from './lru-cache.js';
import { StreamUrlCacheEntry } from './types.js';

/**
 * Cache manager for handling different types of caches
 */
export class CacheManager {
  private static instance: CacheManager;
  private streamUrlCache: LRUCache<string, StreamUrlCacheEntry>;

  private constructor() {
    // Initialize stream URL cache with reasonable defaults
    this.streamUrlCache = new LRUCache<string, StreamUrlCacheEntry>({
      maxSize: 1000, // Store up to 1000 stream URLs
      ttlMs: 3600000, // 1 hour TTL
    });

    // Set up periodic cleanup
    setInterval(() => {
      this.streamUrlCache.cleanup();
    }, 300000); // Clean up every 5 minutes
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
   * Get a stream URL from cache
   */
  public getStreamUrl(trackIdentifier: string): string | undefined {
    const entry = this.streamUrlCache.get(trackIdentifier);
    if (!entry) return undefined;

    // Check if URL has expired
    if (entry.expiresAt < Date.now()) {
      this.streamUrlCache.delete(trackIdentifier);
      return undefined;
    }

    return entry.url;
  }

  /**
   * Cache a stream URL
   */
  public setStreamUrl(trackIdentifier: string, url: string, expiresAt: number): void {
    this.streamUrlCache.set(trackIdentifier, { url, expiresAt });
  }

  /**
   * Invalidate a cached stream URL
   */
  public invalidateStreamUrl(trackIdentifier: string): void {
    this.streamUrlCache.delete(trackIdentifier);
  }

  /**
   * Get cache statistics
   */
  public getStreamUrlCacheStats() {
    return this.streamUrlCache.getStats();
  }

  /**
   * Clear all caches
   */
  public clearAll(): void {
    this.streamUrlCache.clear();
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();
