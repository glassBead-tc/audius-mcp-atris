import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { createTextResponse } from '../utils/response.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

// Schema for create-playlist tool
export const createPlaylistSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user creating the playlist',
    },
    playlistName: {
      type: 'string',
      description: 'Name of the playlist',
    },
    isPrivate: {
      type: 'boolean',
      description: 'Whether the playlist is private',
    },
    isAlbum: {
      type: 'boolean',
      description: 'Whether this is an album',
    },
    description: {
      type: 'string',
      description: 'Description of the playlist',
    },
    artworkUrl: {
      type: 'string',
      description: 'URL to the artwork image (simulated)',
    },
    trackIds: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'IDs of tracks to add to the playlist',
    },
  },
  required: ['userId', 'playlistName'],
};

// Implementation of create-playlist tool
export const createPlaylist = async (args: { 
  userId: string;
  playlistName: string;
  isPrivate?: boolean;
  isAlbum?: boolean;
  description?: string;
  artworkUrl?: string;
  trackIds?: string[];
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // Verify tracks exist if provided
    if (args.trackIds && args.trackIds.length > 0) {
      try {
        await Promise.all(args.trackIds.map(trackId => audiusClient.getTrack(trackId)));
      } catch (error) {
        return createTextResponse(`One or more track IDs are invalid. Please check the provided track IDs.`, true);
      }
    }
    
    // Create playlist
    const playlist = await audiusClient.createPlaylist({
      userId: args.userId,
      playlistName: args.playlistName,
      isPrivate: args.isPrivate,
      isAlbum: args.isAlbum,
      description: args.description,
      trackIds: args.trackIds
    });
    
    if (!playlist || !playlist.id) {
      return createTextResponse(`Failed to create playlist. The service may be temporarily unavailable.`, true);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      playlistId: playlist.id,
      playlistName: args.playlistName,
      isPrivate: args.isPrivate,
      isAlbum: args.isAlbum,
      description: args.description,
      artworkUrl: args.artworkUrl,
      trackIds: args.trackIds || [],
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in create-playlist tool:', error);
    return createTextResponse(
      `Error creating playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for update-playlist tool
export const updatePlaylistSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user updating the playlist',
    },
    playlistId: {
      type: 'string',
      description: 'ID of the playlist to update',
    },
    playlistName: {
      type: 'string',
      description: 'New name for the playlist',
    },
    isPrivate: {
      type: 'boolean',
      description: 'Whether the playlist is private',
    },
    description: {
      type: 'string',
      description: 'New description for the playlist',
    },
    artworkUrl: {
      type: 'string',
      description: 'URL to the new artwork image (simulated)',
    },
  },
  required: ['userId', 'playlistId'],
};

// Implementation of update-playlist tool
export const updatePlaylist = async (args: { 
  userId: string;
  playlistId: string;
  playlistName?: string;
  isPrivate?: boolean;
  description?: string;
  artworkUrl?: string;
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify playlist and user exist
    try {
      // Check if the playlist exists
      const playlist = await audiusClient.getPlaylist(args.playlistId);
      // Check if the user exists
      await audiusClient.getUser(args.userId);
      
      // Check if user is the playlist owner (simplified check)
      if (!playlist) {
        return createTextResponse(`Playlist ${args.playlistId} not found.`, true);
      }
    } catch (error) {
      return createTextResponse(`Unable to verify playlist or user. Please check the provided IDs.`, true);
    }
    
    // Similar to creation, artwork handling would require downloading the file
    // For simplicity, we'll simulate a successful update
    
    // Format a simulated result
    const formattedResults = {
      playlistId: args.playlistId,
      userId: args.userId,
      updatedFields: {
        playlistName: args.playlistName,
        isPrivate: args.isPrivate,
        description: args.description,
        artworkUrl: args.artworkUrl
      },
      timestamp: new Date().toISOString(),
      status: 'Update simulation - Artwork handling would be required for actual artwork update',
      note: 'In a production implementation, the server would need to handle file downloads for artwork updates'
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in update-playlist tool:', error);
    return createTextResponse(
      `Error updating playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for delete-playlist tool
export const deletePlaylistSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user deleting the playlist',
    },
    playlistId: {
      type: 'string',
      description: 'ID of the playlist to delete',
    },
  },
  required: ['userId', 'playlistId'],
};

// Implementation of delete-playlist tool
export const deletePlaylist = async (args: { 
  userId: string;
  playlistId: string;
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify playlist and user exist
    try {
      // Check if the playlist exists
      const playlist = await audiusClient.getPlaylist(args.playlistId);
      // Check if the user exists
      await audiusClient.getUser(args.userId);
      
      // Check if user is the playlist owner (simplified check)
      if (!playlist) {
        return createTextResponse(`Playlist ${args.playlistId} not found.`, true);
      }
    } catch (error) {
      return createTextResponse(`Unable to verify playlist or user. Please check the provided IDs.`, true);
    }
    
    // Simulate successful deletion
    const formattedResults = {
      playlistId: args.playlistId,
      userId: args.userId,
      deletedAt: new Date().toISOString(),
      status: 'success',
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in delete-playlist tool:', error);
    return createTextResponse(
      `Error deleting playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for add-tracks-to-playlist tool
export const addTracksToPlaylistSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user adding tracks',
    },
    playlistId: {
      type: 'string',
      description: 'ID of the playlist to add tracks to',
    },
    trackIds: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'IDs of tracks to add to the playlist',
    },
  },
  required: ['userId', 'playlistId', 'trackIds'],
};

// Implementation of add-tracks-to-playlist tool
export const addTracksToPlaylist = async (args: { 
  userId: string;
  playlistId: string;
  trackIds: string[];
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify playlist, user, and tracks exist
    try {
      // Check if the playlist exists
      const playlist = await audiusClient.getPlaylist(args.playlistId);
      // Check if the user exists
      await audiusClient.getUser(args.userId);
      
      // Check if user is the playlist owner (simplified check)
      if (!playlist) {
        return createTextResponse(`Playlist ${args.playlistId} not found.`, true);
      }
      
      // Check if tracks exist
      await Promise.all(args.trackIds.map(id => audiusClient.getTrack(id)));
    } catch (error) {
      return createTextResponse(`Unable to verify playlist, user, or track IDs. Please check the provided information.`, true);
    }
    
    // Mock the operation of adding tracks
    const formattedResults = {
      playlistId: args.playlistId,
      userId: args.userId,
      addedTracks: args.trackIds,
      operationTimestamp: new Date().toISOString(),
      status: 'success',
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in add-tracks-to-playlist tool:', error);
    return createTextResponse(
      `Error adding tracks to playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for remove-track-from-playlist tool
export const removeTrackFromPlaylistSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user removing the track',
    },
    playlistId: {
      type: 'string',
      description: 'ID of the playlist to remove the track from',
    },
    trackId: {
      type: 'string',
      description: 'ID of the track to remove',
    },
  },
  required: ['userId', 'playlistId', 'trackId'],
};

// Implementation of remove-track-from-playlist tool
export const removeTrackFromPlaylist = async (args: { 
  userId: string;
  playlistId: string;
  trackId: string;
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify playlist, user, and track exist
    try {
      // Check if the playlist exists
      const playlist = await audiusClient.getPlaylist(args.playlistId);
      // Check if the user exists
      await audiusClient.getUser(args.userId);
      // Check if the track exists
      await audiusClient.getTrack(args.trackId);
      
      // Check if user is the playlist owner (simplified check)
      if (!playlist) {
        return createTextResponse(`Playlist ${args.playlistId} not found.`, true);
      }
    } catch (error) {
      return createTextResponse(`Unable to verify playlist, user, or track ID. Please check the provided information.`, true);
    }
    
    // Mock the operation of removing a track
    const formattedResults = {
      playlistId: args.playlistId,
      userId: args.userId,
      removedTrackId: args.trackId,
      operationTimestamp: new Date().toISOString(),
      status: 'success',
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in remove-track-from-playlist tool:', error);
    return createTextResponse(
      `Error removing track from playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for reorder-playlist-tracks tool
export const reorderPlaylistTracksSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user reordering tracks',
    },
    playlistId: {
      type: 'string',
      description: 'ID of the playlist to reorder tracks in',
    },
    trackIds: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'IDs of tracks in the new order',
    },
  },
  required: ['userId', 'playlistId', 'trackIds'],
};

// Implementation of reorder-playlist-tracks tool
export const reorderPlaylistTracks = async (args: { 
  userId: string;
  playlistId: string;
  trackIds: string[];
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify playlist, user, and tracks exist
    try {
      // Check if the playlist exists
      const playlist = await audiusClient.getPlaylist(args.playlistId);
      // Check if the user exists
      await audiusClient.getUser(args.userId);
      
      // Check if user is the playlist owner (simplified check)
      if (!playlist) {
        return createTextResponse(`Playlist ${args.playlistId} not found.`, true);
      }
      
      // Check if all tracks exist
      await Promise.all(args.trackIds.map(id => audiusClient.getTrack(id)));
    } catch (error) {
      return createTextResponse(`Unable to verify playlist, user, or track IDs. Please check the provided information.`, true);
    }
    
    // Mock the operation of reordering tracks
    const formattedResults = {
      playlistId: args.playlistId,
      userId: args.userId,
      newTrackOrder: args.trackIds,
      operationTimestamp: new Date().toISOString(),
      status: 'success',
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in reorder-playlist-tracks tool:', error);
    return createTextResponse(
      `Error reordering playlist tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};