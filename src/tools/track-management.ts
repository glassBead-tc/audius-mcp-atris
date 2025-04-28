import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { createTextResponse } from '../utils/response.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

// Schema for upload-track tool
export const uploadTrackSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user uploading the track',
    },
    title: {
      type: 'string',
      description: 'Title of the track',
    },
    description: {
      type: 'string',
      description: 'Description of the track',
    },
    genre: {
      type: 'string',
      description: 'Genre of the track',
    },
    mood: {
      type: 'string',
      description: 'Mood of the track',
    },
    tags: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'Tags for the track',
    },
    audioFileUrl: {
      type: 'string',
      description: 'URL to the audio file',
    },
    artworkUrl: {
      type: 'string',
      description: 'URL to the artwork image',
    },
    isDownloadable: {
      type: 'boolean',
      description: 'Whether the track is downloadable',
    },
    isPrivate: {
      type: 'boolean',
      description: 'Whether the track is private',
    },
  },
  required: ['userId', 'title', 'audioFileUrl'],
};

// Implementation of upload-track tool
export const uploadTrack = async (args: { 
  userId: string;
  title: string;
  description?: string;
  genre?: string;
  mood?: string;
  tags?: string[];
  audioFileUrl: string;
  artworkUrl?: string;
  isDownloadable?: boolean;
  isPrivate?: boolean;
}, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify user exists
    try {
      await audiusClient.getUser(args.userId);
    } catch (error) {
      return createTextResponse(`Unable to verify user. Please check the provided user ID.`, true);
    }
    
    // In a real implementation, we would download the audio file from the URL
    // Since we can't directly convert a URL to a File object here,
    // we'll simulate a successful response
    
    // Format simulated results
    const simulatedTrackId = `track-${Date.now()}`;
    const formattedResults = {
      userId: args.userId,
      trackId: simulatedTrackId,
      title: args.title,
      description: args.description,
      genre: args.genre,
      mood: args.mood,
      tags: args.tags,
      audioFileUrl: args.audioFileUrl,
      artworkUrl: args.artworkUrl,
      isDownloadable: args.isDownloadable,
      isPrivate: args.isPrivate,
      status: 'Track upload simulated'
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in upload-track tool:', error);
    return createTextResponse(
      `Error uploading track: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for update-track tool
export const updateTrackSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'ID of the track to update',
    },
    userId: {
      type: 'string',
      description: 'ID of the user updating the track (must be track owner)',
    },
    title: {
      type: 'string',
      description: 'New title for the track',
    },
    description: {
      type: 'string',
      description: 'New description for the track',
    },
    genre: {
      type: 'string',
      description: 'New genre for the track',
    },
    mood: {
      type: 'string',
      description: 'New mood for the track',
    },
    tags: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'New tags for the track',
    },
    artworkUrl: {
      type: 'string',
      description: 'URL to the new artwork image',
    },
    isDownloadable: {
      type: 'boolean',
      description: 'Whether the track is downloadable',
    },
    isPrivate: {
      type: 'boolean',
      description: 'Whether the track is private',
    },
  },
  required: ['trackId', 'userId'],
};

// Implementation of update-track tool
export const updateTrack = async (args: { 
  trackId: string;
  userId: string;
  title?: string;
  description?: string;
  genre?: string;
  mood?: string;
  tags?: string[];
  artworkUrl?: string;
  isDownloadable?: boolean;
  isPrivate?: boolean;
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify track and user exist
    try {
      // Check if the track exists
      const track = await audiusClient.getTrack(args.trackId);
      // Check if the user exists
      await audiusClient.getUser(args.userId);
      
      // Check if user is the track owner
      if (!track || !track.user || track.user.id !== args.userId) {
        return createTextResponse(
          `User ${args.userId} is not the owner of track ${args.trackId}.`,
          true
        );
      }
    } catch (error) {
      return createTextResponse(
        `Unable to verify track or user. Please check the provided IDs.`,
        true
      );
    }
    
    // Similar to upload, artwork handling would require downloading the file
    // For simplicity, we'll simulate a successful update
    
    // Format a simulated result
    const formattedResults = {
      trackId: args.trackId,
      userId: args.userId,
      updatedFields: {
        title: args.title,
        description: args.description,
        genre: args.genre,
        mood: args.mood,
        tags: args.tags,
        artworkUrl: args.artworkUrl,
        isDownloadable: args.isDownloadable,
        isPrivate: args.isPrivate
      },
      timestamp: new Date().toISOString(),
      status: 'Update simulation - Artwork handling would be required for actual artwork update',
      note: 'In a production implementation, the server would need to handle file downloads for artwork updates'
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in update-track tool:', error);
    return createTextResponse(
      `Error updating track: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for delete-track tool
export const deleteTrackSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'ID of the track to delete',
    },
    userId: {
      type: 'string',
      description: 'ID of the user deleting the track (must be track owner)',
    },
  },
  required: ['trackId', 'userId'],
};

// Implementation of delete-track tool
export const deleteTrack = async (args: { 
  trackId: string, 
  userId: string 
}) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Verify track and user exist
    try {
      // Check if the track exists
      const track = await audiusClient.getTrack(args.trackId);
      // Check if the user exists
      await audiusClient.getUser(args.userId);
      
      // Check if user is the track owner
      if (!track || !track.user || track.user.id !== args.userId) {
        return createTextResponse(
          `User ${args.userId} is not the owner of track ${args.trackId}.`,
          true
        );
      }
    } catch (error) {
      return createTextResponse(
        `Unable to verify track or user. Please check the provided IDs.`,
        true
      );
    }
    
    // Delete the track
    const result = await audiusClient.deleteTrack(
      args.trackId,
      args.userId
    );
    
    if (!result) {
      return createTextResponse(
        `Failed to delete track ${args.trackId}.`,
        true
      );
    }
    
    // Format results
    const formattedResults = {
      trackId: args.trackId,
      userId: args.userId,
      timestamp: new Date().toISOString(),
      status: 'deleted'
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in delete-track tool:', error);
    return createTextResponse(
      `Error deleting track: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};