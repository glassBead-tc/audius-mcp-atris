import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';

// Schema for get-user tool
export const getUserSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'The ID of the user to retrieve',
    },
  },
  required: ['userId'],
};

// Schema for search-users tool
export const searchUsersSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Search query for finding users',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results to return (default: 10)',
    },
  },
  required: ['query'],
};

// Schema for get-user-tracks tool
export const getUserTracksSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'The ID of the user to get tracks for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of tracks to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Implementation of get-user tool
export const getUser = async (args: { userId: string }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const user = await audiusClient.getUser(args.userId);
    
    if (!user) {
      return {
        content: [{
          type: 'text',
          text: `User with ID ${args.userId} not found`,
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(user, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-user tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error fetching user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Implementation of search-users tool
export const searchUsers = async (args: { query: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    const results = await audiusClient.searchUsers(args.query, limit);
    
    if (!results || results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No users found for query: ${args.query}`,
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
    console.error('Error in search-users tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error searching users: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Implementation of get-user-tracks tool
export const getUserTracks = async (args: { userId: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    const tracks = await audiusClient.getUserTracks(args.userId, limit);
    
    if (!tracks || tracks.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No tracks found for user ID: ${args.userId}`,
        }],
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(tracks, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-user-tracks tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error fetching user tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};