import { sdk } from '@audius/sdk';
import { z } from 'zod';
import { CALM_MOODS, ENERGETIC_MOODS, NEUTRAL_MIXED_MOODS, MOOD_MAPPINGS } from './genre-mood-constants.js';

// Types
interface Score {
  name: string;
  points: number;
  trackCount: number;
  totalPlays: number;
  totalFavorites: number;
  topTrack: {
    title: string;
    plays: number;
    favorites: number;
  };
}

interface GenreScore extends Score {}
interface MoodScore extends Score {
  category: 'Calm' | 'Energetic' | 'Neutral/Mixed';
}

/**
 * Manages analytics functionality for the Audius MCP server
 */
export class AnalyticsManager {
  private audiusSdk: ReturnType<typeof sdk>;

  constructor(audiusSdk: ReturnType<typeof sdk>) {
    this.audiusSdk = audiusSdk;
  }

  /**
   * Calculate genre popularity using trending tracks and Pareto distribution
   */
  async getGenrePopularity({ 
    timeRange = 'week',
    totalPoints = 10000,
    includeDetails = false 
  }: {
    timeRange?: 'day' | 'week' | 'month';
    totalPoints?: number;
    includeDetails?: boolean;
  }): Promise<{
    genres: GenreScore[];
    analysis?: {
      totalGenres: number;
      top20Percent: number;
      top20PointsShare: number;
    };
  }> {
    try {
      // Get trending tracks
      const trendingTracks = await this.audiusSdk.tracks.getTrendingTracks({});
      
      if (!trendingTracks.data) {
        return { genres: [] };
      }

      // Calculate Pareto-distributed points
      const paretoPoints = trendingTracks.data.map((_, index) => {
        const position = index + 1;
        const subdivision = Math.ceil(position / 20);
        const basePoints = totalPoints / Math.pow(5, subdivision - 1);
        return basePoints / 20;
      });

      // Group tracks by genre
      const genreTracks = new Map<string, {
        tracks: typeof trendingTracks.data[0][];
        points: number;
      }>();

      trendingTracks.data.forEach((track, index) => {
        const genre = track.genre || 'Unknown';
        if (!genreTracks.has(genre)) {
          genreTracks.set(genre, {
            tracks: [],
            points: 0
          });
        }
        const genreGroup = genreTracks.get(genre)!;
        genreGroup.tracks.push(track);
        genreGroup.points += paretoPoints[index];
      });

      // Calculate metrics for each genre
      const genreScores: GenreScore[] = Array.from(genreTracks.entries())
        .map(([genre, data]) => {
          const totalPlays = data.tracks.reduce((sum, track) => 
            sum + (track.playCount || 0), 0);
          const totalFavorites = data.tracks.reduce((sum, track) => 
            sum + (track.favoriteCount || 0), 0);

          // Find top track for this genre
          const topTrack = data.tracks.reduce((best, track) => {
            const trackScore = (track.playCount || 0) + ((track.favoriteCount || 0) * 2);
            const bestScore = (best.playCount || 0) + ((best.favoriteCount || 0) * 2);
            return trackScore > bestScore ? track : best;
          }, data.tracks[0]);

          return {
            name: genre,
            points: data.points,
            trackCount: data.tracks.length,
            totalPlays,
            totalFavorites,
            topTrack: {
              title: topTrack.title,
              plays: topTrack.playCount || 0,
              favorites: topTrack.favoriteCount || 0
            }
          };
        });

      // Sort by points
      const sortedGenres = genreScores.sort((a, b) => b.points - a.points);

      // Include distribution analysis if requested
      if (includeDetails) {
        const totalGenres = sortedGenres.length;
        const top20Percent = Math.ceil(totalGenres * 0.2);
        const top20Points = sortedGenres
          .slice(0, top20Percent)
          .reduce((sum, genre) => sum + genre.points, 0);

        return {
          genres: sortedGenres,
          analysis: {
            totalGenres,
            top20Percent,
            top20PointsShare: Math.round((top20Points / totalPoints) * 100)
          }
        };
      }

      return { genres: sortedGenres };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to calculate genre popularity: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Calculate mood popularity using trending tracks and Pareto distribution
   */
  async getMoodPopularity({ 
    timeRange = 'week',
    totalPoints = 10000,
    includeDetails = false 
  }: {
    timeRange?: 'day' | 'week' | 'month';
    totalPoints?: number;
    includeDetails?: boolean;
  }): Promise<{
    moods: MoodScore[];
    analysis?: {
      totalMoods: number;
      moodCategories: {
        calm: number;
        energetic: number;
        neutral: number;
      };
      dominantCategory: string;
    };
  }> {
    try {
      // Get trending tracks
      const trendingTracks = await this.audiusSdk.tracks.getTrendingTracks({});
      
      if (!trendingTracks.data) {
        return { moods: [] };
      }

      // Calculate Pareto-distributed points
      const paretoPoints = trendingTracks.data.map((_, index) => {
        const position = index + 1;
        const subdivision = Math.ceil(position / 20);
        const basePoints = totalPoints / Math.pow(5, subdivision - 1);
        return basePoints / 20;
      });

      // Group tracks by mood
      const moodTracks = new Map<string, {
        tracks: typeof trendingTracks.data[0][];
        points: number;
        category: 'Calm' | 'Energetic' | 'Neutral/Mixed';
      }>();

      trendingTracks.data.forEach((track, index) => {
        const mood = track.mood || 'Unknown';
        if (!moodTracks.has(mood)) {
          // Determine mood category
          let category: 'Calm' | 'Energetic' | 'Neutral/Mixed';
          if (CALM_MOODS.includes(mood as any)) {
            category = 'Calm';
          } else if (ENERGETIC_MOODS.includes(mood as any)) {
            category = 'Energetic';
          } else {
            category = 'Neutral/Mixed';
          }

          moodTracks.set(mood, {
            tracks: [],
            points: 0,
            category
          });
        }
        const moodGroup = moodTracks.get(mood)!;
        moodGroup.tracks.push(track);
        moodGroup.points += paretoPoints[index];
      });

      // Calculate metrics for each mood
      const moodScores: MoodScore[] = Array.from(moodTracks.entries())
        .map(([mood, data]) => {
          const totalPlays = data.tracks.reduce((sum, track) => 
            sum + (track.playCount || 0), 0);
          const totalFavorites = data.tracks.reduce((sum, track) => 
            sum + (track.favoriteCount || 0), 0);

          // Find top track for this mood
          const topTrack = data.tracks.reduce((best, track) => {
            const trackScore = (track.playCount || 0) + ((track.favoriteCount || 0) * 2);
            const bestScore = (best.playCount || 0) + ((best.favoriteCount || 0) * 2);
            return trackScore > bestScore ? track : best;
          }, data.tracks[0]);

          return {
            name: mood,
            category: data.category,
            points: data.points,
            trackCount: data.tracks.length,
            totalPlays,
            totalFavorites,
            topTrack: {
              title: topTrack.title,
              plays: topTrack.playCount || 0,
              favorites: topTrack.favoriteCount || 0
            }
          };
        });

      // Sort by points
      const sortedMoods = moodScores.sort((a, b) => b.points - a.points);

      // Include distribution analysis if requested
      if (includeDetails) {
        const totalMoods = sortedMoods.length;
        
        // Calculate points per category
        const categoryPoints = sortedMoods.reduce((acc, mood) => {
          acc[mood.category.toLowerCase() as 'calm' | 'energetic' | 'neutral'] += mood.points;
          return acc;
        }, { calm: 0, energetic: 0, neutral: 0 });

        // Find dominant category
        const dominantCategory = Object.entries(categoryPoints)
          .reduce((a, b) => a[1] > b[1] ? a : b)[0];

        return {
          moods: sortedMoods,
          analysis: {
            totalMoods,
            moodCategories: categoryPoints,
            dominantCategory: dominantCategory.charAt(0).toUpperCase() + dominantCategory.slice(1)
          }
        };
      }

      return { moods: sortedMoods };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to calculate mood popularity: ${error.message}`);
      }
      throw error;
    }
  }
}

// Schema for genre popularity analysis
export const GetGenrePopularitySchema = z.object({
  timeRange: z.enum(['day', 'week', 'month']).optional().describe('Time range for trending tracks'),
  totalPoints: z.number().optional().describe('Total points to distribute (default: 10000)'),
  includeDetails: z.boolean().optional().describe('Include distribution analysis details')
}).describe('Calculate genre popularity using trending tracks and Pareto distribution');

// Schema for mood popularity analysis
export const GetMoodPopularitySchema = z.object({
  timeRange: z.enum(['day', 'week', 'month']).optional().describe('Time range for trending tracks'),
  totalPoints: z.number().optional().describe('Total points to distribute (default: 10000)'),
  includeDetails: z.boolean().optional().describe('Include distribution analysis details')
}).describe('Calculate mood popularity using trending tracks and Pareto distribution');
