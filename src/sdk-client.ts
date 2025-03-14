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
   * Helper method to search for tracks with advanced filtering
   */
  public async searchTracks(query: string, options: {
    limit?: number;
    genres?: string[];
    moods?: string[];
    bpmMin?: number;
    bpmMax?: number;
    key?: string;
    onlyDownloadable?: boolean;
    sort?: 'relevant' | 'popular' | 'recent';
  } = {}) {
    try {
      const limit = options.limit || 10;
      
      const params: any = { query };
      
      // Add optional filters
      if (options.genres && options.genres.length > 0) params.genres = options.genres;
      if (options.moods && options.moods.length > 0) params.moods = options.moods;
      if (options.bpmMin) params.minBpm = options.bpmMin;
      if (options.bpmMax) params.maxBpm = options.bpmMax;
      if (options.key) params.key = options.key;
      if (options.onlyDownloadable) params.onlyDownloadable = options.onlyDownloadable;
      if (options.sort) params.sort = options.sort;
      
      const result = await this.audiusSDK.tracks.searchTracks(params);
      
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
  
  /**
   * Helper method to get related artists
   */
  public async getRelatedArtists(userId: string, limit = 10) {
    try {
      if (!this.audiusSDK.users) {
        throw new Error('Users API not initialized');
      }
      
      const result = await this.audiusSDK.users.getRelatedUsers({
        id: userId,
        limit
      });
      
      return result.data || [];
    } catch (error) {
      console.error(`Error getting related artists for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get underground trending tracks
   */
  public async getUndergroundTrendingTracks(genre?: string, limit = 10) {
    try {
      console.error(`Requesting underground trending tracks${genre ? ` for genre: ${genre}` : ''}, limit: ${limit}`);
      
      if (!this.audiusSDK.tracks) {
        throw new Error('Tracks API not initialized');
      }
      
      const params: any = { limit };
      if (genre) params.genre = genre;
      
      const result = await this.audiusSDK.tracks.getUndergroundTrendingTracks(params);
      
      if (result && result.data) {
        console.error('Underground trending tracks API response successful');
        return result.data.slice(0, limit);
      }
      
      return [];
    } catch (error) {
      console.error('Error getting underground trending tracks:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to perform full search (tracks, users, playlists)
   */
  public async fullSearch(query: string, limit = 5) {
    try {
      if (!this.audiusSDK.general) {
        throw new Error('General search API not initialized');
      }
      
      const result = await this.audiusSDK.general.searchFull({ 
        query,
        limit 
      });
      
      return result.data || { tracks: [], users: [], playlists: [], albums: [] };
    } catch (error) {
      console.error(`Error performing full search for "${query}":`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get a user's favorites
   */
  public async getUserFavorites(userId: string, limit = 10) {
    try {
      const result = await this.audiusSDK.users.getFavorites({
        id: userId,
        limit
      });
      return result.data || [];
    } catch (error) {
      console.error(`Error getting favorites for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get a user's reposts
   */
  public async getUserReposts(userId: string, limit = 10) {
    try {
      const result = await this.audiusSDK.users.getReposts({
        id: userId,
        limit
      });
      return result.data || [];
    } catch (error) {
      console.error(`Error getting reposts for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get a user's followers
   */
  public async getUserFollowers(userId: string, limit = 10) {
    try {
      const result = await this.audiusSDK.users.getFollowers({
        id: userId,
        limit
      });
      return result.data || [];
    } catch (error) {
      console.error(`Error getting followers for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get a user's following
   */
  public async getUserFollowing(userId: string, limit = 10) {
    try {
      const result = await this.audiusSDK.users.getFollowing({
        id: userId,
        limit
      });
      return result.data || [];
    } catch (error) {
      console.error(`Error getting following for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to check if a user is following another user
   */
  public async isUserFollowing(userId: string, followeeUserId: string) {
    try {
      const result = await this.audiusSDK.users.isFollowing({
        id: userId,
        followeeId: followeeUserId
      });
      return result.data;
    } catch (error) {
      console.error(`Error checking if user ${userId} is following ${followeeUserId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get a track's favorites
   */
  public async getTrackFavorites(trackId: string, limit = 10) {
    try {
      const result = await this.audiusSDK.tracks.getFavorites({
        id: trackId,
        limit
      });
      return result.data || [];
    } catch (error) {
      console.error(`Error getting favorites for track ${trackId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get a track's reposts
   */
  public async getTrackReposts(trackId: string, limit = 10) {
    try {
      const result = await this.audiusSDK.tracks.getReposts({
        id: trackId,
        limit
      });
      return result.data || [];
    } catch (error) {
      console.error(`Error getting reposts for track ${trackId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to add a comment to a track
   */
  public async addTrackComment(trackId: string, userId: string, comment: string) {
    try {
      if (!this.audiusSDK.tracks) {
        throw new Error('Tracks API not initialized');
      }
      
      const result = await this.audiusSDK.tracks.addTrackComment({
        trackId,
        userId,
        comment
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error adding comment to track ${trackId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to delete a comment from a track
   */
  public async deleteTrackComment(commentId: string, userId: string) {
    try {
      if (!this.audiusSDK.tracks) {
        throw new Error('Tracks API not initialized');
      }
      
      const result = await this.audiusSDK.tracks.deleteTrackComment({
        commentId,
        userId
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error deleting comment ${commentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to upload a track
   */
  public async uploadTrack(params: {
    userId: string;
    title: string;
    description?: string;
    genre?: string;
    mood?: string;
    tags?: string[];
    audioFile: File;
    artworkFile?: File;
    isDownloadable?: boolean;
    isPrivate?: boolean;
  }) {
    try {
      if (!this.audiusSDK.tracks) {
        throw new Error('Tracks API not initialized');
      }
      
      // Build upload metadata
      const uploadParams: any = {
        userId: params.userId,
        title: params.title,
        description: params.description || '',
        genre: params.genre,
        mood: params.mood,
        tags: params.tags || [],
        downloadable: params.isDownloadable || false,
        is_private: params.isPrivate || false,
        track: params.audioFile
      };
      
      if (params.artworkFile) {
        uploadParams.artwork = params.artworkFile;
      }
      
      // Use the TrackUploadHelper from the SDK
      const result = await this.audiusSDK.tracks.uploadTrack(uploadParams);
      
      return result.data;
    } catch (error) {
      console.error('Error uploading track:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to update a track
   */
  public async updateTrack(params: {
    trackId: string;
    userId: string;
    title?: string;
    description?: string;
    genre?: string;
    mood?: string;
    tags?: string[];
    artworkFile?: File;
    isDownloadable?: boolean;
    isPrivate?: boolean;
  }) {
    try {
      if (!this.audiusSDK.tracks) {
        throw new Error('Tracks API not initialized');
      }
      
      // Build update parameters
      const updateParams: any = {
        trackId: params.trackId,
        userId: params.userId
      };
      
      // Add optional parameters if provided
      if (params.title) updateParams.title = params.title;
      if (params.description) updateParams.description = params.description;
      if (params.genre) updateParams.genre = params.genre;
      if (params.mood) updateParams.mood = params.mood;
      if (params.tags) updateParams.tags = params.tags;
      if (params.isDownloadable !== undefined) updateParams.downloadable = params.isDownloadable;
      if (params.isPrivate !== undefined) updateParams.is_private = params.isPrivate;
      
      if (params.artworkFile) {
        updateParams.artwork = params.artworkFile;
      }
      
      const result = await this.audiusSDK.tracks.updateTrack(updateParams);
      
      return result.data;
    } catch (error) {
      console.error(`Error updating track ${params.trackId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to delete a track
   */
  public async deleteTrack(trackId: string, userId: string) {
    try {
      if (!this.audiusSDK.tracks) {
        throw new Error('Tracks API not initialized');
      }
      
      const result = await this.audiusSDK.tracks.deleteTrack({
        trackId,
        userId
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error deleting track ${trackId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to create a playlist
   */
  public async createPlaylist(params: {
    userId: string;
    playlistName: string;
    isPrivate?: boolean;
    isAlbum?: boolean;
    description?: string;
    artworkFile?: File;
    trackIds?: string[];
  }) {
    try {
      if (!this.audiusSDK.playlists) {
        throw new Error('Playlists API not initialized');
      }
      
      // Build parameters for creating a playlist
      const createParams: any = {
        userId: params.userId,
        playlistName: params.playlistName,
        isPrivate: params.isPrivate || false,
        isAlbum: params.isAlbum || false,
        description: params.description || ''
      };
      
      if (params.artworkFile) {
        createParams.artwork = params.artworkFile;
      }
      
      if (params.trackIds && params.trackIds.length > 0) {
        createParams.trackIds = params.trackIds;
      }
      
      const result = await this.audiusSDK.playlists.createPlaylist(createParams);
      
      return result.data;
    } catch (error) {
      console.error(`Error creating playlist for user ${params.userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to update a playlist
   */
  public async updatePlaylist(params: {
    userId: string;
    playlistId: string;
    playlistName?: string;
    isPrivate?: boolean;
    description?: string;
    artworkFile?: File;
  }) {
    try {
      if (!this.audiusSDK.playlists) {
        throw new Error('Playlists API not initialized');
      }
      
      // Build parameters for updating a playlist
      const updateParams: any = {
        userId: params.userId,
        playlistId: params.playlistId
      };
      
      if (params.playlistName) updateParams.playlistName = params.playlistName;
      if (params.description) updateParams.description = params.description;
      if (params.isPrivate !== undefined) updateParams.isPrivate = params.isPrivate;
      if (params.artworkFile) updateParams.artwork = params.artworkFile;
      
      const result = await this.audiusSDK.playlists.updatePlaylist(updateParams);
      
      return result.data;
    } catch (error) {
      console.error(`Error updating playlist ${params.playlistId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to delete a playlist
   */
  public async deletePlaylist(playlistId: string, userId: string) {
    try {
      if (!this.audiusSDK.playlists) {
        throw new Error('Playlists API not initialized');
      }
      
      const result = await this.audiusSDK.playlists.deletePlaylist({
        playlistId,
        userId
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error deleting playlist ${playlistId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to add tracks to a playlist
   */
  public async addTracksToPlaylist(playlistId: string, userId: string, trackIds: string[]) {
    try {
      if (!this.audiusSDK.playlists) {
        throw new Error('Playlists API not initialized');
      }
      
      const result = await this.audiusSDK.playlists.addPlaylistTrack({
        playlistId,
        userId,
        trackIds
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error adding tracks to playlist ${playlistId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to remove a track from a playlist
   */
  public async removeTrackFromPlaylist(playlistId: string, userId: string, trackId: string) {
    try {
      if (!this.audiusSDK.playlists) {
        throw new Error('Playlists API not initialized');
      }
      
      const result = await this.audiusSDK.playlists.deletePlaylistTrack({
        playlistId,
        userId,
        trackId
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error removing track ${trackId} from playlist ${playlistId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to reorder tracks in a playlist
   */
  public async reorderPlaylistTracks(playlistId: string, userId: string, trackIds: string[]) {
    try {
      if (!this.audiusSDK.playlists) {
        throw new Error('Playlists API not initialized');
      }
      
      const result = await this.audiusSDK.playlists.orderPlaylistTracks({
        playlistId,
        userId,
        trackIds
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error reordering tracks in playlist ${playlistId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to send a direct message
   */
  public async sendMessage(fromUserId: string, toUserId: string, message: string) {
    try {
      if (!this.audiusSDK.chats) {
        throw new Error('Chats API not initialized');
      }
      
      const result = await this.audiusSDK.chats.sendMessage({
        fromUserId,
        toUserId,
        message
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error sending message from ${fromUserId} to ${toUserId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get messages between two users
   */
  public async getMessages(userId: string, withUserId: string, limit = 50) {
    try {
      if (!this.audiusSDK.chats) {
        throw new Error('Chats API not initialized');
      }
      
      const result = await this.audiusSDK.chats.getMessages({
        userId,
        withUserId,
        limit
      });
      
      return result.data || [];
    } catch (error) {
      console.error(`Error getting messages between ${userId} and ${withUserId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get a user's message threads
   */
  public async getMessageThreads(userId: string, limit = 20) {
    try {
      if (!this.audiusSDK.chats) {
        throw new Error('Chats API not initialized');
      }
      
      const result = await this.audiusSDK.chats.getMessageThreads({
        userId,
        limit
      });
      
      return result.data || [];
    } catch (error) {
      console.error(`Error getting message threads for ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to mark a message as read
   */
  public async markMessageAsRead(userId: string, messageId: string) {
    try {
      if (!this.audiusSDK.chats) {
        throw new Error('Chats API not initialized');
      }
      
      const result = await this.audiusSDK.chats.markAsRead({
        userId,
        messageId
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error marking message ${messageId} as read:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get track listen counts
   */
  public async getTrackListenCounts(trackId: string) {
    try {
      if (!this.audiusSDK.tracks) {
        throw new Error('Tracks API not initialized');
      }
      
      const result = await this.audiusSDK.tracks.getTrackListenCount({
        trackId
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error getting listen counts for track ${trackId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get user's track listen counts
   */
  public async getUserTrackListenCounts(userId: string) {
    try {
      if (!this.audiusSDK.users) {
        throw new Error('Users API not initialized');
      }
      
      const result = await this.audiusSDK.users.getUserTrackListenCounts({
        userId
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error getting track listen counts for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get top listeners for a track
   */
  public async getTrackTopListeners(trackId: string, limit = 10) {
    try {
      if (!this.audiusSDK.tracks) {
        throw new Error('Tracks API not initialized');
      }
      
      const result = await this.audiusSDK.tracks.getTopListeners({
        trackId,
        limit
      });
      
      return result.data || [];
    } catch (error) {
      console.error(`Error getting top listeners for track ${trackId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get track listener insights (aggregate play data)
   */
  public async getTrackListenerInsights(trackId: string) {
    try {
      if (!this.audiusSDK.tracks) {
        throw new Error('Tracks API not initialized');
      }
      
      const result = await this.audiusSDK.tracks.getListenerInsights({
        trackId
      });
      
      // Aggregate result with different time periods
      return result.data || {};
    } catch (error) {
      console.error(`Error getting listener insights for track ${trackId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get user's aggregate play metrics
   */
  public async getUserAggregatePlayMetrics(userId: string) {
    try {
      if (!this.audiusSDK.users) {
        throw new Error('Users API not initialized');
      }
      
      const result = await this.audiusSDK.users.getAggregatePlayMetrics({
        userId
      });
      
      return result.data || {};
    } catch (error) {
      console.error(`Error getting aggregate play metrics for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get a user's supporter information
   */
  public async getUserSupporters(userId: string, limit = 10) {
    try {
      if (!this.audiusSDK.users) {
        throw new Error('Users API not initialized');
      }
      
      const result = await this.audiusSDK.users.getSupporters({
        userId,
        limit
      });
      
      return result.data || [];
    } catch (error) {
      console.error(`Error getting supporters for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get artists a user is supporting
   */
  public async getUserSupporting(userId: string, limit = 10) {
    try {
      if (!this.audiusSDK.users) {
        throw new Error('Users API not initialized');
      }
      
      const result = await this.audiusSDK.users.getSupporting({
        userId,
        limit
      });
      
      return result.data || [];
    } catch (error) {
      console.error(`Error getting supporting info for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get monthly trending data for a track
   */
  public async getTrackMonthlyTrending(trackId: string) {
    try {
      if (!this.audiusSDK.tracks) {
        throw new Error('Tracks API not initialized');
      }
      
      const result = await this.audiusSDK.tracks.getMonthlyTrending({
        trackId
      });
      
      return result.data || {};
    } catch (error) {
      console.error(`Error getting monthly trending data for track ${trackId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get Solana wallet info for a user
   */
  public async getUserSolanaWallets(userId: string) {
    try {
      if (!this.audiusSDK.users) {
        throw new Error('Users API not initialized');
      }
      
      const result = await this.audiusSDK.users.getConnectedWallets({
        id: userId
      });
      
      return result.data || [];
    } catch (error) {
      console.error(`Error getting Solana wallets for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get associated Ethereum wallet for a user
   */
  public async getUserEthereumWallet(userId: string) {
    try {
      if (!this.audiusSDK.users) {
        throw new Error('Users API not initialized');
      }
      
      const result = await this.audiusSDK.users.getAssociatedEthWallet({
        id: userId
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error getting Ethereum wallet for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get transaction history for a user
   */
  public async getUserTransactionHistory(userId: string, limit = 20) {
    try {
      if (!this.audiusSDK.transactions) {
        throw new Error('Transactions API not initialized');
      }
      
      const result = await this.audiusSDK.transactions.getTransactionHistory({
        userId,
        limit
      });
      
      return result.data || [];
    } catch (error) {
      console.error(`Error getting transaction history for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get token claims for a user
   */
  public async getUserClaimableTokens(userId: string) {
    try {
      if (!this.audiusSDK.rewards) {
        throw new Error('Rewards API not initialized');
      }
      
      const result = await this.audiusSDK.rewards.getClaimableTokens({
        userId
      });
      
      return result.data || [];
    } catch (error) {
      console.error(`Error getting claimable tokens for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to claim tokens
   */
  public async claimTokens(userId: string, challengeId: string) {
    try {
      if (!this.audiusSDK.rewards) {
        throw new Error('Rewards API not initialized');
      }
      
      const result = await this.audiusSDK.rewards.claimChallengeReward({
        userId,
        challengeId
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error claiming tokens for user ${userId} and challenge ${challengeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get available challenges
   */
  public async getAvailableChallenges() {
    try {
      if (!this.audiusSDK.challenges) {
        throw new Error('Challenges API not initialized');
      }
      
      const result = await this.audiusSDK.challenges.getAvailableChallenges();
      
      return result.data || [];
    } catch (error) {
      console.error('Error getting available challenges:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to get undisbursed challenges for a user
   */
  public async getUserUndisbursedChallenges(userId: string) {
    try {
      if (!this.audiusSDK.challenges) {
        throw new Error('Challenges API not initialized');
      }
      
      const result = await this.audiusSDK.challenges.getUndisbursedChallenges({
        userId
      });
      
      return result.data || [];
    } catch (error) {
      console.error(`Error getting undisbursed challenges for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to check AUDIO token balance
   */
  public async getAudioTokenBalance(walletAddress: string) {
    try {
      if (!this.audiusSDK.tokens) {
        throw new Error('Tokens API not initialized');
      }
      
      const result = await this.audiusSDK.tokens.getAudioBalance({
        address: walletAddress
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error getting AUDIO token balance for wallet ${walletAddress}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to send AUDIO tokens
   */
  public async sendAudioTokens(params: {
    senderWalletAddress: string;
    receiverWalletAddress: string;
    amount: string;
    privateKey: string;
  }) {
    try {
      if (!this.audiusSDK.tokens) {
        throw new Error('Tokens API not initialized');
      }
      
      const result = await this.audiusSDK.tokens.sendTokens({
        senderAddress: params.senderWalletAddress,
        receiverAddress: params.receiverWalletAddress,
        amount: params.amount,
        privateKey: params.privateKey
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error sending AUDIO tokens from ${params.senderWalletAddress} to ${params.receiverWalletAddress}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper method to get Solana SPL token balance
   */
  public async getSolanaTokenBalance(walletAddress: string, tokenMint: string) {
    try {
      if (!this.audiusSDK.solana) {
        throw new Error('Solana API not initialized');
      }
      
      const result = await this.audiusSDK.solana.getTokenBalance({
        address: walletAddress,
        mint: tokenMint
      });
      
      return result.data;
    } catch (error) {
      console.error(`Error getting Solana token balance for wallet ${walletAddress}:`, error);
      throw error;
    }
  }
}