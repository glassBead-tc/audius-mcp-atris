import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';

// Schema for get-track tool
export const getTrackSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'The ID of the track to retrieve',
    },
  },
  required: ['trackId'],
};

// Schema for search-tracks tool
export const searchTracksSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Search query for finding tracks',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results to return (default: 10)',
    },
  },
  required: ['query'],
};

// Schema for get-trending-tracks tool
export const getTrendingTracksSchema = {
  type: 'object',
  properties: {
    genre: {
      type: 'string',
      description: 'Genre to filter by (optional)',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results to return (default: 10)',
    },
  },
};

// Schema for get-track-comments tool
export const getTrackCommentsSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'The ID of the track to get comments for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of comments to return (default: 10)',
    },
  },
  required: ['trackId'],
};

// Implementation of get-track tool
export const getTrack = async (args: { trackId: string }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const track = await audiusClient.getTrack(args.trackId);
    
    if (!track) {
      return {
        content: [{
          type: 'text',
          text: `Track with ID ${args.trackId} not found`,
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(track, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-track tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error fetching track: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Implementation of search-tracks tool
export const searchTracks = async (args: { query: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    const results = await audiusClient.searchTracks(args.query, { limit });
    
    if (!results || results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No tracks found for query: ${args.query}`,
        }],
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in search-tracks tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error searching tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Implementation of get-trending-tracks tool
export const getTrendingTracks = async (args: { genre?: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    console.error('Attempting to get trending tracks...');
    
    const results = await audiusClient.getTrendingTracks(args.genre, limit);
    
    if (!results || results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: args.genre 
            ? `No trending tracks found in genre: ${args.genre}`
            : 'No trending tracks found',
        }],
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-trending-tracks tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error fetching trending tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Implementation of get-track-comments tool
export const getTrackComments = async (args: { trackId: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    const comments = await audiusClient.getTrackComments(args.trackId, limit);
    
    if (!comments || comments.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No comments found for track ID: ${args.trackId}`,
        }],
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(comments, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-track-comments tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error fetching track comments: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};