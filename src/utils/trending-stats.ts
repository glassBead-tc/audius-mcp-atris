/**
 * Statistical utility functions for trending analysis
 */

/**
 * Calculate median value with error handling
 * @param values Array of numbers to calculate median from
 * @returns Median value, or 0 if array is empty
 */
export function calculateMedian(values: number[]): number {
  if (!values.length) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate skewness for heavy-tail detection
 * Uses the third standardized moment
 * @param values Array of values
 * @param mean Mean of the distribution
 * @param stdDev Standard deviation
 * @returns Skewness value, or 0 if stdDev is too small
 */
export function calculateSkewness(
  values: number[],
  mean: number,
  stdDev: number
): number {
  if (Math.abs(stdDev) < 1e-10) return 0;
  
  const n = values.length;
  if (n < 3) return 0;
  
  const m3 = values.reduce((sum, x) => sum + Math.pow(x - mean, 3), 0) / n;
  return m3 / Math.pow(stdDev, 3);
}

/**
 * Calculate kurtosis for distribution shape
 * Uses the fourth standardized moment
 * @param values Array of values
 * @param mean Mean of the distribution
 * @param stdDev Standard deviation
 * @returns Kurtosis value, or 3 (normal distribution) if stdDev is too small
 */
export function calculateKurtosis(
  values: number[],
  mean: number,
  stdDev: number
): number {
  if (Math.abs(stdDev) < 1e-10) return 3; // Normal distribution kurtosis
  
  const n = values.length;
  if (n < 4) return 3;
  
  const m4 = values.reduce((sum, x) => sum + Math.pow(x - mean, 4), 0) / n;
  return m4 / Math.pow(stdDev, 4);
}

/**
 * Calculate Median Absolute Deviation (MAD)
 * More robust measure of variability than standard deviation
 * @param values Array of values
 * @param median Precomputed median (optional)
 * @returns MAD value
 */
export function calculateMAD(values: number[], median?: number): number {
  if (!values.length) return 0;
  
  const med = median ?? calculateMedian(values);
  return calculateMedian(values.map(v => Math.abs(v - med)));
}

/**
 * Calculate trimmed mean to reduce impact of outliers
 * @param values Array of values
 * @param trimPercent Percentage to trim from each end (0-50)
 * @returns Trimmed mean
 */
export function calculateTrimmedMean(
  values: number[],
  trimPercent: number = 10
): number {
  if (!values.length) return 0;
  if (trimPercent < 0 || trimPercent > 50) {
    throw new Error('Trim percentage must be between 0 and 50');
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const trimAmount = Math.floor(values.length * (trimPercent / 100));
  const trimmedValues = sorted.slice(trimAmount, -trimAmount || undefined);
  
  return trimmedValues.reduce((a, b) => a + b, 0) / trimmedValues.length;
}

/**
 * Calculate robust z-score using median and MAD
 * More resistant to outliers than traditional z-score
 * @param value Value to calculate z-score for
 * @param median Median of the distribution
 * @param mad Median Absolute Deviation
 * @param minMAD Minimum MAD value to prevent division by zero
 * @returns Robust z-score
 */
export function calculateRobustZScore(
  value: number,
  median: number,
  mad: number,
  minMAD: number = 0.0001
): number {
  // Use constant to convert MAD to equivalent standard deviation
  const MAD_TO_STD = 1.4826; // For normal distribution
  
  if (mad < minMAD) return 0;
  return (value - median) / (mad * MAD_TO_STD);
}

/**
 * Calculate Spearman rank correlation between two sets of ranks
 * @param ranks1 First set of ranks
 * @param ranks2 Second set of ranks
 * @returns Correlation coefficient between -1 and 1
 */
export function calculateRankCorrelation(
  ranks1: number[],
  ranks2: number[]
): number {
  if (ranks1.length !== ranks2.length) {
    throw new Error('Rank arrays must have the same length');
  }

  const n = ranks1.length;
  if (n < 2) return 0;

  // Calculate sum of squared differences in ranks
  const diffSum = ranks1.reduce((sum, rank, i) => {
    return sum + Math.pow(rank - ranks2[i], 2);
  }, 0);
  
  // Spearman's rank correlation formula
  return 1 - (6 * diffSum) / (n * (n * n - 1));
}

/**
 * Calculate sigmoid decay with adjustable parameters
 * @param age Age of the content (e.g., days old)
 * @param midpoint Point at which decay is 50%
 * @param steepness Controls how quickly decay happens
 * @param sustainedEngagementFactor Slower decay for sustained engagement (0-1)
 * @returns Decay factor between 0 and 1
 */
export function calculateSigmoidDecay(
  age: number,
  midpoint: number,
  steepness: number,
  sustainedEngagementFactor: number = 0.8
): number {
  // Basic sigmoid decay
  const baseDecay = 1 / (1 + Math.exp(steepness * (age - midpoint)));
  
  // Apply sustained engagement adjustment
  return Math.pow(baseDecay, sustainedEngagementFactor);
}

/**
 * Calculate momentum factor based on velocity changes
 * @param recentVelocity Recent velocity metric
 * @param averageVelocity Average velocity over longer period
 * @param timeDecayFactor Current time decay factor
 * @param minVelocity Minimum velocity to consider (prevent division by zero)
 * @returns Momentum factor >= 1.0
 */
export function calculateMomentum(
  recentVelocity: number,
  averageVelocity: number,
  timeDecayFactor: number,
  minVelocity: number = 0.001
): number {
  const safeAvgVelocity = Math.max(minVelocity, averageVelocity);
  const acceleration = (recentVelocity - safeAvgVelocity) / safeAvgVelocity;
  
  return Math.max(1.0, 1.0 + acceleration * timeDecayFactor);
}

/**
 * Calculate viral coefficient based on engagement metrics
 * @param repostsZ Z-score of reposts
 * @param favoritesZ Z-score of favorites
 * @param timeDecayFactor Current time decay
 * @param threshold Threshold for viral detection
 * @param maxMultiplier Maximum viral boost
 * @returns Viral coefficient >= 1.0
 */
export function calculateViralCoefficient(
  repostsZ: number,
  favoritesZ: number,
  timeDecayFactor: number,
  threshold: number = 2.0,
  maxMultiplier: number = 1.5
): number {
  // Weight reposts more heavily as they represent network spread
  const viralSpread = (repostsZ * 0.7 + favoritesZ * 0.3);
  const isViral = viralSpread > threshold;
  
  if (!isViral) return 1.0;
  
  // Calculate viral boost with time decay
  return Math.min(
    maxMultiplier,
    1.0 + viralSpread * 0.1
  ) * timeDecayFactor;
}
