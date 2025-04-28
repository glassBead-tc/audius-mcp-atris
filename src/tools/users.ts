import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { createTextResponse } from '../utils/response.js';

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
      return createTextResponse(`User with ID ${args.userId} not found`, true);
    }
    
    // Format the user information in a more readable way
    const formattedUser = [
      `👤 User Profile: ${user.name}`,
      `🆔 ID: ${user.id}`,
      `🌐 Handle: @${user.handle}`,
      `📝 Bio: ${user.bio || 'No bio provided'}`,
      `🔗 Profile URL: ${user.profile_url || 'N/A'}`,
      `🎵 Track Count: ${user.track_count || 0}`,
      `👥 Follower Count: ${user.follower_count || 0}`,
      `👀 Following Count: ${user.following_count || 0}`,
      `📊 Playlist Count: ${user.playlist_count || 0}`
    ].join('\n');
    
    return createTextResponse(formattedUser);
  } catch (error) {
    console.error('Error in get-user tool:', error);
    return createTextResponse(
      `Error fetching user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of search-users tool
export const searchUsers = async (args: { query: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    const results = await audiusClient.searchUsers(args.query, limit);
    
    if (!results || results.length === 0) {
      return createTextResponse(`No users found for query: ${args.query}`, true);
    }
    
    // Format the search results in a more readable way
    const formattedResults = results.map((user, index) => (
      `${index + 1}. ${user.name} (@${user.handle})\n` +
      `   ID: ${user.id} | Followers: ${user.follower_count || 0} | Tracks: ${user.track_count || 0}`
    )).join('\n\n');
    
    return createTextResponse(
      `Found ${results.length} users matching "${args.query}":\n\n${formattedResults}`
    );
  } catch (error) {
    console.error('Error in search-users tool:', error);
    return createTextResponse(
      `Error searching users: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-user-tracks tool
export const getUserTracks = async (args: { userId: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // First get the user to include their name in the response
    let user;
    try {
      user = await audiusClient.getUser(args.userId);
      if (!user) {
        return createTextResponse(`User with ID ${args.userId} not found`, true);
      }
    } catch (error) {
      return createTextResponse(`Error retrieving user information: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
    
    const limit = args.limit || 10;
    const tracks = await audiusClient.getUserTracks(args.userId, limit);
    
    if (!tracks || tracks.length === 0) {
      return createTextResponse(`No tracks found for user: ${user.name} (ID: ${args.userId})`, true);
    }
    
    // Format the tracks in a more readable way
    const formattedTracks = tracks.map((track, index) => (
      `${index + 1}. "${track.title}"\n` +
      `   Duration: ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')} | ` +
      `Plays: ${track.play_count || 0} | Likes: ${track.favorite_count || 0}`
    )).join('\n\n');
    
    return createTextResponse(
      `Tracks by ${user.name} (@${user.handle}):\n\n${formattedTracks}`
    );
  } catch (error) {
    console.error('Error in get-user-tracks tool:', error);
    return createTextResponse(
      `Error fetching user tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};