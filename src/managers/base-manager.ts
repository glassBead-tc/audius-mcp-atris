import { sdk } from '@audius/sdk';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { cacheManager } from '../cache/cache-manager.js';
import { CacheType } from '../cache/types.js';

interface CircuitBreakerConfig {
  threshold: number;
  resetTimeout: number;
  backoffMultiplier: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
  consecutiveSuccesses: number;
  currentBackoffMs: number;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds

const ENDPOINT_CONFIGS: Record<string, CircuitBreakerConfig> = {
  'track': {
    threshold: 3,
    resetTimeout: 30000,
    backoffMultiplier: 2
  },
  'user': {
    threshold: 5,
    resetTimeout: 60000,
    backoffMultiplier: 1.5
  },
  'default': {
    threshold: 4,
    resetTimeout: 45000,
    backoffMultiplier: 1.75
  }
};

/**
 * Base manager class with shared functionality
 */
export abstract class BaseManager {
  protected audiusSdk: ReturnType<typeof sdk>;
  protected circuitBreakers: Map<string, CircuitBreakerState>;
  
  constructor(audiusSdk: ReturnType<typeof sdk>) {
    this.audiusSdk = audiusSdk;
    this.circuitBreakers = new Map();
  }

  /**
   * Execute an API call with timeout, circuit breaker, and caching
   */
  protected async executeWithTimeout<T>(
    operation: string,
    func: () => Promise<T>,
    options: {
      timeout?: number;
      useCache?: boolean;
      cacheTtl?: number;
      cacheType?: CacheType;
    } = {}
  ): Promise<T> {
    const {
      timeout = DEFAULT_TIMEOUT,
      useCache = true,
      cacheTtl,
      cacheType = CacheType.ApiResponse
    } = options;

    // Check circuit breaker
    const circuitBreaker = this.getCircuitBreaker(operation);
    if (circuitBreaker.isOpen) {
      const timeSinceFailure = Date.now() - circuitBreaker.lastFailure;
      if (timeSinceFailure < circuitBreaker.currentBackoffMs) {
        throw new McpError(
          ErrorCode.InternalError,
          `Service ${operation} is temporarily unavailable (backoff: ${Math.round(circuitBreaker.currentBackoffMs / 1000)}s)`
        );
      }
      // Allow retry after backoff
      this.setHalfOpenState(operation);
    }

    // Check cache first if enabled
    if (useCache) {
      const cachedResult = cacheManager.getApiResponse<T>(operation);
      if (cachedResult) {
        return cachedResult;
      }
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        func(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new McpError(
              ErrorCode.InternalError,
              `Operation ${operation} timed out after ${timeout}ms`
            ));
          }, timeout);
        })
      ]);

      // Cache successful result if enabled
      if (useCache) {
        cacheManager.setApiResponse(operation, result, cacheTtl);
      }

      // Record success
      this.recordSuccess(operation);

      return result;
    } catch (error) {
      // Update circuit breaker on failure
      this.recordFailure(operation);

      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Operation ${operation} failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private getCircuitBreaker(operation: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(operation)) {
      this.circuitBreakers.set(operation, {
        failures: 0,
        lastFailure: 0,
        isOpen: false,
        consecutiveSuccesses: 0,
        currentBackoffMs: this.getConfig(operation).resetTimeout
      });
    }
    return this.circuitBreakers.get(operation)!;
  }

  private getConfig(operation: string): CircuitBreakerConfig {
    // Get endpoint-specific config or default
    const endpointType = operation.split(':')[0];
    return ENDPOINT_CONFIGS[endpointType] || ENDPOINT_CONFIGS.default;
  }

  private recordFailure(operation: string): void {
    const state = this.getCircuitBreaker(operation);
    const config = this.getConfig(operation);
    
    state.failures++;
    state.lastFailure = Date.now();
    state.consecutiveSuccesses = 0;
    
    if (state.failures >= config.threshold) {
      state.isOpen = true;
      // Increase backoff exponentially
      state.currentBackoffMs = Math.min(
        state.currentBackoffMs * config.backoffMultiplier,
        config.resetTimeout * 8 // Cap at 8x the base timeout
      );
    }
  }

  private recordSuccess(operation: string): void {
    const state = this.getCircuitBreaker(operation);
    
    if (state.isOpen) {
      state.consecutiveSuccesses++;
      if (state.consecutiveSuccesses >= 2) { // Require 2 consecutive successes to close
        this.resetCircuitBreaker(operation);
      }
    } else {
      // Gradually reduce backoff on success
      state.currentBackoffMs = Math.max(
        state.currentBackoffMs * 0.75, // Reduce by 25%
        this.getConfig(operation).resetTimeout
      );
      state.failures = Math.max(0, state.failures - 1); // Gradually reduce failure count
    }
  }

  private setHalfOpenState(operation: string): void {
    const state = this.getCircuitBreaker(operation);
    state.consecutiveSuccesses = 0;
    // Keep isOpen true until we get enough consecutive successes
  }

  private resetCircuitBreaker(operation: string): void {
    const config = this.getConfig(operation);
    this.circuitBreakers.set(operation, {
      failures: 0,
      lastFailure: 0,
      isOpen: false,
      consecutiveSuccesses: 0,
      currentBackoffMs: config.resetTimeout
    });
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.circuitBreakers.clear();
  }
}
