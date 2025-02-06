import { sdk } from '@audius/sdk';
import { z } from 'zod';
import { TrendingAnalyticsManager } from './trending-analytics.js';

/**
 * Manages trending content with pagination support
 */
export class TrendingManager {
  private audiusSdk: ReturnType<typeof sdk>;
  private readonly DEFAULT_CHUNK_SIZE = 10;
  private analyticsManager?: TrendingAnalyticsManager;

  constructor(audiusSdk: ReturnType<typeof sdk>, enableAnalytics: boolean = false) {
    this.audiusSdk = audiusSdk;
    if (enableAnalytics) {
      this.analyticsManager = new TrendingAnalyticsManager(audiusSdk);
    }
  }

  /**
   * Get the analytics manager instance if analytics are enabled
   */
  getAnalyticsManager(): TrendingAnalyticsManager | undefined {
    return this.analyticsManager;
  }

  /**
   * Analyze trending tracks with advanced metrics
   */
  async analyzeTrendingTracks(options: { 
    limit?: number;
    includeStats?: boolean;
  } = {}) {
    if (!this.analyticsManager) {
      throw new Error('Analytics manager not enabled. Initialize TrendingManager with enableAnalytics=true');
    }
    return this.analyticsManager.analyzeTrendingTracks(options);
  }

  /**
   * Get trending tracks with pagination support
   * @param options Trending tracks options
   * @returns Paginated trending tracks
   */
  async getTrendingTracks({ 
    genre, 
    limit = this.DEFAULT_CHUNK_SIZE,
    offset = 0 
  }: {
    genre?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      // Get trending tracks
      const allTracks = await this.audiusSdk.tracks.getTrendingTracks({ genre });
      
      if (!allTracks.data) {
        return { data: [] };
      }

      // Slice tracks to match limit and offset
      const paginatedTracks = allTracks.data.slice(offset, offset + limit);

      return {
        data: paginatedTracks,
        count: paginatedTracks.length,
        total: allTracks.data.length,
        offset,
        limit
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get trending tracks: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get trending playlists with pagination support
   * @param options Trending playlists options
   * @returns Paginated trending playlists
   */
  async getTrendingPlaylists({ 
    time,
    limit = this.DEFAULT_CHUNK_SIZE,
    offset = 0 
  }: {
    time?: 'week' | 'month' | 'year';
    limit?: number;
    offset?: number;
  }) {
    try {
      // First get all trending playlists
      const allPlaylists = await this.audiusSdk.playlists.getTrendingPlaylists({ time });
      
      if (!allPlaylists.data) {
        return { data: [] };
      }

      // Then handle pagination manually
      const paginatedPlaylists = allPlaylists.data.slice(offset, offset + limit);

      return {
        data: paginatedPlaylists,
        count: paginatedPlaylists.length,
        total: allPlaylists.data.length,
        offset,
        limit
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get trending playlists: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get trending users with pagination support
   * @param options Trending users options
   * @returns Paginated trending users
   */
  async getTrendingUsers({ 
    genre,
    limit = this.DEFAULT_CHUNK_SIZE,
    offset = 0 
  }: {
    genre?: string[];
    limit?: number;
    offset?: number;
  }) {
    try {
      // Get trending users by using search with empty query and popular sort
      const allUsers = await this.audiusSdk.users.searchUsers({ 
        query: '', 
        sortMethod: 'popular',
        genre
      });
      
      if (!allUsers.data) {
        return { data: [] };
      }

      // Then handle pagination manually
      const paginatedUsers = allUsers.data.slice(offset, offset + limit);

      return {
        data: paginatedUsers,
        count: paginatedUsers.length,
        total: allUsers.data.length,
        offset,
        limit
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get trending users: ${error.message}`);
      }
      throw error;
    }
  }
}

// Schema for trending tracks with pagination
export const GetTrendingTracksSchema = z.object({
  genre: z.string().optional(),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
}).describe("Get trending tracks with pagination support");

// Schema for trending playlists with pagination
export const GetTrendingPlaylistsSchema = z.object({
  time: z.enum(['week', 'month', 'year']).optional(),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
}).describe("Get trending playlists with pagination support");

// Schema for trending users with pagination
export const GetTrendingUsersSchema = z.object({
  genre: z.array(z.string()).optional(),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
}).describe("Get trending users with pagination support");
