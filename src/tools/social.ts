import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';

// Schema for user-favorites tool
export const userFavoritesSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user whose favorites to retrieve',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of favorites to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Implementation of user-favorites tool
export const getUserFavorites = async (args: { userId: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    const favorites = await audiusClient.getUserFavorites(args.userId, limit);
    
    if (!favorites || favorites.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No favorites found for user ID: ${args.userId}`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      favorites: favorites,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in user-favorites tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error retrieving user favorites: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for user-reposts tool
export const userRepostsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user whose reposts to retrieve',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of reposts to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Implementation of user-reposts tool
export const getUserReposts = async (args: { userId: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    const reposts = await audiusClient.getUserReposts(args.userId, limit);
    
    if (!reposts || reposts.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No reposts found for user ID: ${args.userId}`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      reposts: reposts,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in user-reposts tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error retrieving user reposts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for user-followers tool
export const userFollowersSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user whose followers to retrieve',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of followers to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Implementation of user-followers tool
export const getUserFollowers = async (args: { userId: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    const followers = await audiusClient.getUserFollowers(args.userId, limit);
    
    if (!followers || followers.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No followers found for user ID: ${args.userId}`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      followers: followers,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in user-followers tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error retrieving user followers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for user-following tool
export const userFollowingSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user whose following to retrieve',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of followed users to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Implementation of user-following tool
export const getUserFollowing = async (args: { userId: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    const following = await audiusClient.getUserFollowing(args.userId, limit);
    
    if (!following || following.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No followed users found for user ID: ${args.userId}`,
        }],
      };
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      following: following,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in user-following tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error retrieving user following: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for is-following tool
export const isFollowingSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user who might be following',
    },
    followeeId: {
      type: 'string',
      description: 'ID of the user who might be followed',
    },
  },
  required: ['userId', 'followeeId'],
};

// Implementation of is-following tool
export const isFollowing = async (args: { userId: string, followeeId: string }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    const isFollowingResult = await audiusClient.isUserFollowing(args.userId, args.followeeId);
    
    // Get user names for better context
    const [follower, followee] = await Promise.all([
      audiusClient.getUser(args.userId),
      audiusClient.getUser(args.followeeId)
    ]);
    
    // Format results
    const formattedResults = {
      follower: {
        id: args.userId,
        name: follower?.name || `User ${args.userId}`,
      },
      followee: {
        id: args.followeeId,
        name: followee?.name || `User ${args.followeeId}`,
      },
      isFollowing: isFollowingResult,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in is-following tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error checking follow status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for track-favorites tool
export const trackFavoritesSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'ID of the track whose favorites to retrieve',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of favorites to return (default: 10)',
    },
  },
  required: ['trackId'],
};

// Implementation of track-favorites tool
export const getTrackFavorites = async (args: { trackId: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    const favorites = await audiusClient.getTrackFavorites(args.trackId, limit);
    
    if (!favorites || favorites.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No favorites found for track ID: ${args.trackId}`,
        }],
      };
    }
    
    // Get track info for context
    const track = await audiusClient.getTrack(args.trackId);
    
    // Format results
    const formattedResults = {
      track: {
        id: args.trackId,
        title: track?.title || `Track ${args.trackId}`,
        artist: track?.user?.name || 'Unknown Artist',
      },
      favorites: favorites,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in track-favorites tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error retrieving track favorites: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Schema for track-reposts tool
export const trackRepostsSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'ID of the track whose reposts to retrieve',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of reposts to return (default: 10)',
    },
  },
  required: ['trackId'],
};

// Implementation of track-reposts tool
export const getTrackReposts = async (args: { trackId: string, limit?: number }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    const reposts = await audiusClient.getTrackReposts(args.trackId, limit);
    
    if (!reposts || reposts.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No reposts found for track ID: ${args.trackId}`,
        }],
      };
    }
    
    // Get track info for context
    const track = await audiusClient.getTrack(args.trackId);
    
    // Format results
    const formattedResults = {
      track: {
        id: args.trackId,
        title: track?.title || `Track ${args.trackId}`,
        artist: track?.user?.name || 'Unknown Artist',
      },
      reposts: reposts,
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(formattedResults, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in track-reposts tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error retrieving track reposts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};