import { sdk } from '@audius/sdk';
import { config } from './config.js';

/**
 * Wrapper for the Audius SDK to handle initialization and provide helper methods
 */
export class AudiusClient {
  private static instance: AudiusClient;
  private audiusSDK: ReturnType<typeof sdk>;

  private constructor() {
    try {
      console.error('Initializing Audius SDK...');
      
      // Initialize the Audius SDK with minimal configuration
      // Let the SDK initialize its own services with defaults
      this.audiusSDK = sdk({
        appName: config.server.name,
        apiKey: config.audius.apiKey,
        apiSecret: config.audius.apiSecret,
        environment: config.audius.environment as any
        
        // Important: do NOT provide a services object
        // The SDK will initialize the necessary services with defaults
      });
      
      // Verify that all required APIs are available
      const endpointStatus = {
        users: !!this.audiusSDK.users,
        tracks: !!this.audiusSDK.tracks,
        playlists: !!this.audiusSDK.playlists,
        trending: !!this.audiusSDK.tracks?.getTrendingTracks,
        search: !!this.audiusSDK.tracks?.searchTracks
      };
      
      console.error(`Audius SDK initialized with environment: ${config.audius.environment}`);
      console.error('SDK endpoint availability:', endpointStatus);
      
      // Log available APIs
      console.error('Available SDK APIs:', Object.keys(this.audiusSDK));
      
      // Add extra logging for the first API call
      if (this.audiusSDK.tracks && this.audiusSDK.tracks.getTrack) {
        const originalGetTrack = this.audiusSDK.tracks.getTrack;
        this.audiusSDK.tracks.getTrack = async function(params: any) {
          console.error('Making first API call to getTrack...');
          console.error('Arguments:', JSON.stringify(params));
          try {
            const result = await originalGetTrack.call(this, params);
            console.error('First API call successful!');
            
            // Restore original function
            (AudiusClient.getInstance() as any).audiusSDK.tracks.getTrack = originalGetTrack;
            
            return result;
          } catch (error) {
            console.error('First API call failed:', error);
            throw error;
          }
        };
      } else {
        console.error('WARNING: tracks API or getTrack method not available');
      }
      
    } catch (error) {
      console.error('Failed to initialize Audius SDK:', error);
      throw error;
    }
  }

  /**
   * Get the singleton instance of the AudiusClient
   */
  public static getInstance(): AudiusClient {
    if (!AudiusClient.instance) {
      AudiusClient.instance = new AudiusClient();
    }
    return AudiusClient.instance;
  }

  /**
   * Get the raw Audius SDK instance
   */
  public getSDK() {
    return this.audiusSDK;
  }

  /**
   * Helper method to search for tracks
   */
  public async searchTracks(query: string, limit = 10) {
    try {
      const result = await this.audiusSDK.tracks.searchTracks({
        query
      });
      // Apply limit client-side since the API might not support it correctly
      return result.data?.slice(0, limit) || [];
    } catch (error) {
      console.error('Error searching tracks:', error);
      throw error;
    }
  }

  /**
   * Helper method to get a track by ID
   */
  public async getTrack(trackId: string) {
    try {
      const result = await this.audiusSDK.tracks.getTrack({
        trackId
      });
      return result.data;
    } catch (error) {
      console.error(`Error getting track ${trackId}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to search for users
   */
  public async searchUsers(query: string, limit = 10) {
    try {
      const result = await this.audiusSDK.users.searchUsers({
        query
      });
      // Apply limit client-side since the API might not support it
      return result.data?.slice(0, limit) || [];
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Helper method to get a user by ID
   */
  public async getUser(userId: string) {
    try {
      // Using getBulkUsers with a single ID
      const result = await this.audiusSDK.users.getBulkUsers({
        id: [userId]
      });
      if (result.data && result.data.length > 0) {
        return result.data[0]; // Return the first (and only) user
      }
      throw new Error(`User with ID ${userId} not found`);
    } catch (error) {
      console.error(`Error getting user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to get a playlist by ID
   */
  public async getPlaylist(playlistId: string) {
    try {
      console.error(`Requesting playlist with ID: ${playlistId}`);
      
      // Verify the SDK playlists API is properly initialized
      if (!this.audiusSDK.playlists) {
        console.error('ERROR: SDK playlists API is not available');
        throw new Error('Playlists API not initialized');
      }
      
      console.error('SDK playlists API methods:', Object.keys(this.audiusSDK.playlists));
      
      // Get the playlist
      console.error('Attempting to get playlist...');
      const result = await this.audiusSDK.playlists.getPlaylist({
        playlistId
      });
      
      if (!result || !result.data) {
        throw new Error(`No data returned for playlist ${playlistId}`);
      }
      
      // Log successful response
      console.error('Playlist API response successful:', {
        hasData: !!result.data
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error getting playlist ${playlistId}:`, error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  }

  /**
   * Helper method to get an album by ID
   */
  public async getAlbum(albumId: string) {
    try {
      console.error(`Requesting album with ID: ${albumId}`);
      
      // Verify the SDK playlists API is properly initialized
      if (!this.audiusSDK.playlists) {
        console.error('ERROR: SDK playlists API is not available');
        throw new Error('Playlists API not initialized');
      }
      
      // Albums in Audius are actually playlists with isAlbum flag
      console.error('Attempting to get album as playlist...');
      
      // Try the same approach as getPlaylist
      const playlistData = await this.getPlaylist(albumId);
      
      if (!playlistData) {
        throw new Error(`No data returned for album ${albumId}`);
      }
      
      // Try to verify if this is actually an album
      try {
        // The album property might have different names depending on API version
        const isAlbum = Array.isArray(playlistData) 
          ? playlistData[0]?.isAlbum || (playlistData[0] as any).is_album
          : (playlistData as any).isAlbum || (playlistData as any).is_album;
          
        if (isAlbum !== true) {
          console.error('Warning: Retrieved playlist is not marked as an album');
        }
      } catch (err) {
        console.error('Could not verify if playlist is an album:', err);
      }
      
      return playlistData;
    } catch (error) {
      console.error(`Error getting album ${albumId}:`, error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  }

  /**
   * Helper method to get trending tracks
   */
  public async getTrendingTracks(genre?: string, limit = 10) {
    try {
      console.error(`Requesting trending tracks${genre ? ` for genre: ${genre}` : ''}, limit: ${limit}`);
      
      // Verify the tracks API has getTrendingTracks
      if (!this.audiusSDK.tracks) {
        console.error('ERROR: tracks API is not available');
        throw new Error('Tracks API not initialized');
      }
      
      console.error('Tracks API methods:', Object.keys(this.audiusSDK.tracks));
      
      // Request trending tracks
      const params: any = {};
      if (genre) params.genre = genre;
      
      // Try different time parameters if needed
      const timeOptions = ['week', 'month', 'year', 'allTime'];
      
      for (const time of timeOptions) {
        try {
          console.error(`Attempting to get trending tracks with time=${time}...`);
          params.time = time;
          
          const result = await this.audiusSDK.tracks.getTrendingTracks(params);
          
          if (result && result.data && result.data.length > 0) {
            // Log successful response
            console.error('Trending tracks API response successful:', {
              hasData: !!result.data,
              dataLength: result.data.length,
              time
            });
            
            return result.data.slice(0, limit); // Apply limit client-side
          }
          
          console.error(`No trending tracks returned for time=${time}, trying next option...`);
        } catch (err) {
          console.error(`Error with time=${time}:`, err);
          // Continue to the next time option
        }
      }
      
      // If all time options fail, try without time parameter
      try {
        console.error('Attempting to get trending tracks without time parameter...');
        delete params.time;
        
        const result = await this.audiusSDK.tracks.getTrendingTracks(params);
        
        if (result && result.data && result.data.length > 0) {
          console.error('Trending tracks API response successful (no time param)');
          return result.data.slice(0, limit);
        }
      } catch (finalErr) {
        console.error('Final trending tracks attempt failed:', finalErr);
      }
      
      // If all direct API methods failed, try a different approach
      console.error('All trending track methods failed, falling back to search...');
      const fallbackResults = await this.searchTracks(genre || 'trending', limit);
      
      return fallbackResults || [];
    } catch (error) {
      console.error('Error getting trending tracks:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  }

  /**
   * Helper method to get user's tracks
   */
  public async getUserTracks(userId: string, limit = 10) {
    try {
      const result = await this.audiusSDK.users.getTracksByUser({
        id: userId,
        limit
      });
      return result.data;
    } catch (error) {
      console.error(`Error getting tracks for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to get track comments
   */
  public async getTrackComments(trackId: string, limit = 10) {
    try {
      const result = await this.audiusSDK.tracks.trackComments({
        trackId,
        limit
      });
      return result.data;
    } catch (error) {
      console.error(`Error getting comments for track ${trackId}:`, error);
      throw error;
    }
  }
}