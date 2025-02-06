import { sdk } from '@audius/sdk';
import { z } from 'zod';
import {
  calculateMedian,
  calculateMAD,
  calculateTrimmedMean,
  calculateSkewness,
  calculateKurtosis,
  calculateRobustZScore,
  calculateRankCorrelation,
  calculateSigmoidDecay,
  calculateMomentum,
  calculateViralCoefficient
} from './utils/trending-stats.js';

/**
 * Configuration options for trending analysis based on music popularity research
 */
export interface TrendingAnalyticsConfig {
  // Time windows and momentum
  recentWindow: number;      // Days to consider "recent" (for early momentum)
  decayMidpoint: number;     // Days until 50% decay (network effect decay)
  decaySteepness: number;    // Controls decay curve steepness
  momentumWindow: number;    // Window for momentum calculation (hours)
  
  // Thresholds and scaling
  burstThreshold: number;    // Z-score threshold for viral detection
  minPlays: number;         // Minimum plays to be considered
  minStdDev: number;        // Minimum standard deviation before falling back
  viralMultiplier: number;  // Boost for viral growth patterns
  
  // Weights for multi-factor scoring
  weights: {
    // Core metrics (60% total)
    playsPerDay: number;       // Base play velocity
    recentVelocity: number;    // Short-term momentum
    relativePerformance: number; // Artist-relative performance
    
    // Engagement signals (25% total)
    favorites: number;         // Direct user engagement
    reposts: number;          // Network propagation signal
    
    // Growth patterns (15% total)
    momentum: number;         // Growth acceleration
    viralCoefficient: number; // Viral spread potential
  };
}

/**
 * Default configuration values based on empirical research
 */
const DEFAULT_CONFIG: TrendingAnalyticsConfig = {
  // Time windows calibrated for typical viral growth patterns
  recentWindow: 7,           // 7 days for recent performance
  decayMidpoint: 7,         // Week-based decay
  decaySteepness: 0.5,      // Moderate decay curve
  momentumWindow: 24,       // 24-hour momentum window
  
  // Thresholds based on empirical observations
  burstThreshold: 2.0,      // 2 std deviations for viral detection
  minPlays: 100,           // Minimum viable audience
  minStdDev: 0.0001,       // Statistical significance threshold
  viralMultiplier: 1.5,    // 50% boost for viral patterns
  
  // Weights derived from hit prediction research
  weights: {
    // Core metrics (60% total)
    playsPerDay: 0.25,        // Base growth
    recentVelocity: 0.20,     // Short-term performance
    relativePerformance: 0.15, // Artist context
    
    // Engagement (25% total)
    favorites: 0.15,          // Direct engagement
    reposts: 0.10,           // Network effects
    
    // Growth patterns (15% total)
    momentum: 0.10,          // Growth acceleration
    viralCoefficient: 0.05   // Viral potential
  }
};

/**
 * Extended metrics for trending track analysis
 */
export interface TrendingMetrics {
  id: string;
  title: string;
  artist: string;
  
  // Raw metrics
  plays: number;
  favorites: number;
  reposts: number;
  releaseDate: Date;
  daysOld: number;
  apiRank?: number;
  
  // Velocity metrics
  playsPerDay: number;
  favoritesPerDay: number;
  repostsPerDay: number;
  recentPlaysVelocity: number;
  recentFavoritesVelocity: number;
  recentRepostsVelocity: number;
  
  // Growth and momentum
  momentum: number;          // Rate of change in velocity
  viralCoefficient: number; // Measure of viral spread
  relativePerformance: number;
  
  // Normalized metrics
  normalizedScore: number;
  
  // Time factors
  timeDecayFactor: number;
  burstFactor: number;
  
  // Final scores
  trendingScore: number;
  computedRank: number;
}

/**
 * Statistical summary with heavy-tail adjustments
 */
interface MetricStats {
  mean: number;
  stdDev: number;
  median: number;
  min: number;
  max: number;
  skewness?: number;    // For heavy-tail detection
  kurtosis?: number;    // For distribution shape
}

/**
 * Cache for intermediate statistical calculations
 */
interface StatsCache {
  timestamp: number;
  stats: Record<string, MetricStats>;
}

/**
 * Enhanced trending analytics with research-based scoring
 */
export class TrendingAnalyticsManager {
  private audiusSdk: ReturnType<typeof sdk>;
  private config: TrendingAnalyticsConfig;
  private statsCache: StatsCache | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    audiusSdk: ReturnType<typeof sdk>, 
    config: Partial<TrendingAnalyticsConfig> = {}
  ) {
    this.audiusSdk = audiusSdk;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      weights: {
        ...DEFAULT_CONFIG.weights,
        ...config.weights
      }
    };
  }

  /**
   * Update configuration parameters
   */
  updateConfig(newConfig: Partial<TrendingAnalyticsConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
      weights: {
        ...this.config.weights,
        ...newConfig.weights
      }
    };
    // Clear cache when config changes
    this.clearCache();
  }

  /**
   * Clear the stats cache
   */
  private clearCache() {
    this.statsCache = null;
  }

  /**
   * Check if cached stats are still valid
   */
  private isCacheValid(): boolean {
    if (!this.statsCache) return false;
    return Date.now() - this.statsCache.timestamp < this.CACHE_TTL;
  }

  /**
   * Calculate robust statistics with heavy-tail adjustments
   * Uses caching to avoid redundant calculations
   */
  private calculateRobustStats(
    metrics: TrendingMetrics[],
    field: keyof TrendingMetrics
  ): MetricStats {
    // Try to use cached stats
    if (this.isCacheValid() && this.statsCache?.stats[field]) {
      return this.statsCache.stats[field];
    }

    const values = metrics.map(m => m[field] as number);
    
    // Calculate median and MAD
    const median = calculateMedian(values);
    const mad = calculateMAD(values, median);
    
    // Calculate trimmed mean
    const mean = calculateTrimmedMean(values);
    
    // Convert MAD to equivalent standard deviation
    const stdDev = mad * 1.4826; // Constant for normal distribution
    
    // Calculate distribution shape metrics
    const skewness = calculateSkewness(values, mean, stdDev);
    const kurtosis = calculateKurtosis(values, mean, stdDev);
    
    const stats = {
      mean,
      stdDev,
      median,
      min: Math.min(...values),
      max: Math.max(...values),
      skewness,
      kurtosis
    };

    // Update cache
    if (!this.statsCache) {
      this.statsCache = {
        timestamp: Date.now(),
        stats: {}
      };
    }
    this.statsCache.stats[field] = stats;

    return stats;
  }

  /**
   * Analyze trending tracks with research-based scoring
   */
  async analyzeTrendingTracks({ 
    limit = 100,
    includeStats = false 
  }: {
    limit?: number;
    includeStats?: boolean;
  }): Promise<{
    metrics: TrendingMetrics[];
    stats?: {
      correlations: Record<string, number>;
      metricStats: Record<string, MetricStats>;
      config: TrendingAnalyticsConfig;
    };
  }> {
    try {
      // Validate response schema
      const responseSchema = z.object({
        data: z.array(z.object({
          id: z.string(),
          title: z.string(),
          play_count: z.number(),
          favorite_count: z.number(),
          repost_count: z.number(),
          release_date: z.string(),
          user: z.object({
            name: z.string(),
            total_play_count: z.number().optional(),
            track_count: z.number().optional(),
            follower_count: z.number().optional()
          })
        }))
      });

      const response = await this.audiusSdk.tracks.getTrendingTracks({
        time: 'week'
      });

      const validatedResponse = responseSchema.parse(response);
      if (!validatedResponse.data) {
        throw new Error('No data returned from trending tracks endpoint');
      }

      // Filter and limit data
      const filteredData = validatedResponse.data
        .filter(track => track.play_count >= this.config.minPlays)
        .slice(0, limit);

      const now = new Date();
      
      // Calculate initial metrics
      let metrics: TrendingMetrics[] = filteredData.map((track, index) => {
        const releaseDate = new Date(track.release_date + 'Z');
        const daysOld = Math.max(0.001, 
          (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Calculate velocity metrics with error handling
        const playsPerDay = track.play_count / daysOld;
        const favoritesPerDay = track.favorite_count / daysOld;
        const repostsPerDay = track.repost_count / daysOld;

        const recentWindow = Math.min(daysOld, this.config.recentWindow);
        const recentPlaysVelocity = track.play_count / recentWindow;
        const recentFavoritesVelocity = track.favorite_count / recentWindow;
        const recentRepostsVelocity = track.repost_count / recentWindow;
        
        // Calculate relative performance with safety checks
        const artistAvgPlays = (track.user.total_play_count || 1) / 
          Math.max(1, track.user.track_count || 1);
        const relativePerformance = track.play_count / Math.max(1, artistAvgPlays);

        // Calculate time decay with network effects
        const timeDecayFactor = calculateSigmoidDecay(
          daysOld,
          this.config.decayMidpoint,
          this.config.decaySteepness
        );

        // Initialize metrics object
        const metric: TrendingMetrics = {
          id: track.id,
          title: track.title,
          artist: track.user.name,
          plays: track.play_count,
          favorites: track.favorite_count,
          reposts: track.repost_count,
          releaseDate,
          daysOld,
          apiRank: index + 1,
          playsPerDay,
          favoritesPerDay,
          repostsPerDay,
          recentPlaysVelocity,
          recentFavoritesVelocity,
          recentRepostsVelocity,
          relativePerformance,
          momentum: 0,
          viralCoefficient: 1.0,
          normalizedScore: 0,
          timeDecayFactor,
          burstFactor: 1.0,
          trendingScore: 0,
          computedRank: 0
        };
        return metric;
      });

      // Calculate robust statistics
      const stats = {
        playsPerDay: this.calculateRobustStats(metrics, 'playsPerDay'),
        favoritesPerDay: this.calculateRobustStats(metrics, 'favoritesPerDay'),
        repostsPerDay: this.calculateRobustStats(metrics, 'repostsPerDay'),
        recentPlaysVelocity: this.calculateRobustStats(metrics, 'recentPlaysVelocity'),
        recentFavoritesVelocity: this.calculateRobustStats(metrics, 'recentFavoritesVelocity'),
        recentRepostsVelocity: this.calculateRobustStats(metrics, 'recentRepostsVelocity'),
        relativePerformance: this.calculateRobustStats(metrics, 'relativePerformance')
      };

      // Calculate normalized scores with advanced metrics
      metrics = metrics.map(track => {
        // Calculate z-scores with heavy-tail adjustments
        const playsZ = calculateRobustZScore(
          track.playsPerDay,
          stats.playsPerDay.median,
          stats.playsPerDay.stdDev,
          this.config.minStdDev
        );
        const favoritesZ = calculateRobustZScore(
          track.favoritesPerDay,
          stats.favoritesPerDay.median,
          stats.favoritesPerDay.stdDev,
          this.config.minStdDev
        );
        const repostsZ = calculateRobustZScore(
          track.repostsPerDay,
          stats.repostsPerDay.median,
          stats.repostsPerDay.stdDev,
          this.config.minStdDev
        );
        const velocityZ = calculateRobustZScore(
          track.recentPlaysVelocity,
          stats.recentPlaysVelocity.median,
          stats.recentPlaysVelocity.stdDev,
          this.config.minStdDev
        );
        const performanceZ = calculateRobustZScore(
          track.relativePerformance,
          stats.relativePerformance.median,
          stats.relativePerformance.stdDev,
          this.config.minStdDev
        );

        // Calculate momentum and viral factors
        const momentum = calculateMomentum(
          track.recentPlaysVelocity,
          track.playsPerDay,
          track.timeDecayFactor
        );

        const viralCoefficient = calculateViralCoefficient(
          repostsZ,
          favoritesZ,
          track.timeDecayFactor,
          this.config.burstThreshold,
          this.config.viralMultiplier
        );

        // Calculate weighted score
        const normalizedScore = 
          (playsZ * this.config.weights.playsPerDay) +
          (velocityZ * this.config.weights.recentVelocity) +
          (performanceZ * this.config.weights.relativePerformance) +
          (favoritesZ * this.config.weights.favorites) +
          (repostsZ * this.config.weights.reposts) +
          (momentum * this.config.weights.momentum) +
          (viralCoefficient * this.config.weights.viralCoefficient);

        // Final trending score with network effects
        const trendingScore = normalizedScore * track.timeDecayFactor * viralCoefficient;

        return {
          ...track,
          momentum,
          viralCoefficient,
          normalizedScore,
          trendingScore
        };
      });

      // Sort by trending score and update ranks
      metrics.sort((a, b) => b.trendingScore - a.trendingScore)
        .forEach((track, index) => {
          track.computedRank = index + 1;
        });

      if (includeStats) {
        const apiRanks = metrics.map(m => m.apiRank || 0);
        const computedRanks = metrics.map(m => m.computedRank);

        const correlations = {
          apiCorrelation: calculateRankCorrelation(apiRanks, computedRanks),
          playsPerDay: calculateRankCorrelation(
            apiRanks,
            [...metrics].sort((a, b) => b.playsPerDay - a.playsPerDay).map((_, i) => i + 1)
          ),
          recentVelocity: calculateRankCorrelation(
            apiRanks,
            [...metrics].sort((a, b) => b.recentPlaysVelocity - a.recentPlaysVelocity)
              .map((_, i) => i + 1)
          ),
          momentum: calculateRankCorrelation(
            apiRanks,
            [...metrics].sort((a, b) => b.momentum - a.momentum).map((_, i) => i + 1)
          ),
          viral: calculateRankCorrelation(
            apiRanks,
            [...metrics].sort((a, b) => b.viralCoefficient - a.viralCoefficient)
              .map((_, i) => i + 1)
          )
        };

        return {
          metrics,
          stats: {
            correlations,
            metricStats: stats,
            config: this.config
          }
        };
      }

      return { metrics };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to analyze trending tracks: ${error.message}`);
      }
      throw error;
    }
  }
}

// Schema for trending analytics
export const AnalyzeTrendingTracksSchema = z.object({
  limit: z.number().optional().default(100)
    .describe('Number of tracks to analyze'),
  includeStats: z.boolean().optional().default(false)
    .describe('Include statistical analysis with results')
}).describe('Analyze trending tracks with data-driven scoring');
