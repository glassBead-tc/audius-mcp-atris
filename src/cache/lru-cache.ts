import { CacheConfig, CacheStats, ICache } from './types.js';

/**
 * LRU Cache implementation using Map for O(1) operations
 */
export class LRUCache<K, V> implements ICache<K, V> {
  private cache: Map<K, V>;
  private accessOrder: K[];
  private readonly maxSize: number;
  private readonly ttlMs?: number;
  private stats: CacheStats;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.accessOrder = [];
    this.maxSize = config.maxSize;
    this.ttlMs = config.ttlMs;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      evictions: 0,
    };
  }

  /**
   * Get a value from the cache
   */
  get(identifier: K): V | undefined {
    const value = this.cache.get(identifier);
    
    if (value === undefined) {
      this.stats.misses++;
      return undefined;
    }

    // Move to most recently used
    this.accessOrder = this.accessOrder.filter(id => id !== identifier);
    this.accessOrder.push(identifier);
    
    this.stats.hits++;
    return value;
  }

  /**
   * Set a value in the cache
   */
  set(identifier: K, value: V): void {
    // If identifier exists, update it
    if (this.cache.has(identifier)) {
      this.cache.set(identifier, value);
      this.accessOrder = this.accessOrder.filter(id => id !== identifier);
      this.accessOrder.push(identifier);
      return;
    }

    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      const leastUsed = this.accessOrder[0];
      this.cache.delete(leastUsed);
      this.accessOrder.shift();
      this.stats.evictions++;
    }

    // Add new entry
    this.cache.set(identifier, value);
    this.accessOrder.push(identifier);
    this.stats.size = this.cache.size;
  }

  /**
   * Remove a specific entry from the cache
   */
  delete(identifier: K): void {
    this.cache.delete(identifier);
    this.accessOrder = this.accessOrder.filter(id => id !== identifier);
    this.stats.size = this.cache.size;
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.size = 0;
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clean up expired entries if TTL is set
   */
  cleanup(): void {
    if (!this.ttlMs) return;
    
    const now = Date.now();
    const expired = this.accessOrder.filter(identifier => {
      const value = this.cache.get(identifier);
      if (!value || (value as any).expiresAt < now) {
        return true;
      }
      return false;
    });

    expired.forEach(identifier => this.delete(identifier));
  }
}
