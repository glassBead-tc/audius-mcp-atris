import { sdk } from '@audius/sdk';
import { z } from 'zod';

// Types
interface GenreScore {
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
}

// Schema for genre popularity analysis
export const GetGenrePopularitySchema = z.object({
  timeRange: z.enum(['day', 'week', 'month']).optional().describe('Time range for trending tracks'),
  totalPoints: z.number().optional().describe('Total points to distribute (default: 10000)'),
  includeDetails: z.boolean().optional().describe('Include distribution analysis details')
}).describe('Calculate genre popularity using trending tracks and Pareto distribution');
