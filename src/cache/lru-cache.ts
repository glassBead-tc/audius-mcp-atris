import { BaseCacheConfig, CacheEntry, CacheStats, ICache } from './types.js';

/**
 * Enhanced LRU Cache implementation with memory management and adaptive cleanup
 */
export class LRUCache<K, V> implements ICache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private accessOrder: K[];
  private readonly maxSize: number;
  private readonly ttlMs?: number;
  private readonly maxMemoryBytes?: number;
  private readonly name: string;
  private cleanupInterval?: NodeJS.Timeout;
  private stats: CacheStats;

  constructor(config: BaseCacheConfig) {
    this.cache = new Map();
    this.accessOrder = [];
    this.maxSize = config.maxSize;
    this.ttlMs = config.ttlMs;
    this.name = config.name || 'default';
    this.maxMemoryBytes = config.maxMemoryMB ? config.maxMemoryMB * 1024 * 1024 : undefined;
    
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      evictions: 0,
      memoryUsed: 0,
      lastCleanup: Date.now()
    };

    // Set up adaptive cleanup interval
    if (config.cleanupIntervalMs) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, config.cleanupIntervalMs);
    }
  }

  /**
   * Get a value from the cache
   */
  get(identifier: K): V | undefined {
    const entry = this.cache.get(identifier);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.delete(identifier);
      this.stats.misses++;
      return undefined;
    }

    // Update last accessed time
    entry.lastAccessed = Date.now();
    this.cache.set(identifier, entry);

    // Move to most recently used
    this.accessOrder = this.accessOrder.filter(id => id !== identifier);
    this.accessOrder.push(identifier);
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in the cache with memory tracking
   */
  set(identifier: K, value: V): void {
    const now = Date.now();
    const size = this.calculateSize(value);

    // Check if adding this entry would exceed memory limit
    if (this.maxMemoryBytes && (this.stats.memoryUsed + size) > this.maxMemoryBytes) {
      this.evictByMemory(size);
    }

    const entry: CacheEntry<V> = {
      value,
      expiresAt: this.ttlMs ? now + this.ttlMs : Infinity,
      size,
      lastAccessed: now
    };

    // If identifier exists, update it
    if (this.cache.has(identifier)) {
      const oldEntry = this.cache.get(identifier)!;
      this.stats.memoryUsed -= oldEntry.size;
      this.cache.set(identifier, entry);
      this.accessOrder = this.accessOrder.filter(id => id !== identifier);
      this.accessOrder.push(identifier);
      this.stats.memoryUsed += size;
      return;
    }

    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add new entry
    this.cache.set(identifier, entry);
    this.accessOrder.push(identifier);
    this.stats.size = this.cache.size;
    this.stats.memoryUsed += size;
  }

  /**
   * Remove a specific entry from the cache
   */
  delete(identifier: K): void {
    const entry = this.cache.get(identifier);
    if (entry) {
      this.stats.memoryUsed -= entry.size;
    }
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
    this.stats.memoryUsed = 0;
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
   * Clean up expired entries and manage memory
   */
  cleanup(): void {
    const now = Date.now();
    let cleanupCount = 0;
    
    // Remove expired entries
    this.accessOrder = this.accessOrder.filter(identifier => {
      const entry = this.cache.get(identifier);
      if (!entry || entry.expiresAt < now) {
        if (entry) {
          this.stats.memoryUsed -= entry.size;
        }
        this.cache.delete(identifier);
        cleanupCount++;
        return false;
      }
      return true;
    });

    // Adaptive memory cleanup if needed
    if (this.maxMemoryBytes && this.stats.memoryUsed > this.maxMemoryBytes * 0.9) {
      this.evictByMemory(this.stats.memoryUsed - (this.maxMemoryBytes * 0.7));
    }

    this.stats.size = this.cache.size;
    this.stats.lastCleanup = now;
    
    if (cleanupCount > 0) {
      this.stats.evictions += cleanupCount;
    }
  }

  /**
   * Calculate approximate memory size of a value
   */
  private calculateSize(value: V): number {
    if (typeof value === 'string') {
      return value.length * 2; // Approximate UTF-16 string size
    }
    return JSON.stringify(value).length * 2; // Rough estimation
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    
    const leastUsed = this.accessOrder[0];
    const entry = this.cache.get(leastUsed);
    if (entry) {
      this.stats.memoryUsed -= entry.size;
    }
    this.cache.delete(leastUsed);
    this.accessOrder.shift();
    this.stats.evictions++;
  }

  /**
   * Evict entries to free up specified amount of memory
   */
  private evictByMemory(bytesToFree: number): void {
    let freedBytes = 0;
    while (freedBytes < bytesToFree && this.accessOrder.length > 0) {
      const leastUsed = this.accessOrder[0];
      const entry = this.cache.get(leastUsed);
      if (entry) {
        freedBytes += entry.size;
        this.stats.memoryUsed -= entry.size;
        this.cache.delete(leastUsed);
        this.accessOrder.shift();
        this.stats.evictions++;
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}
