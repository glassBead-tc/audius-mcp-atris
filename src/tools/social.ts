import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { createTextResponse } from '../utils/response.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

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
export const getUserFavorites = async (args: { userId: string, limit?: number }, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    const favorites = await audiusClient.getUserFavorites(args.userId, limit);
    
    if (!favorites || favorites.length === 0) {
      return createTextResponse(`No favorites found for user ID: ${args.userId}`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      favorites: favorites,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in user-favorites tool:', error);
    return createTextResponse(
      `Error retrieving user favorites: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
export const getUserReposts = async (args: { userId: string, limit?: number }, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    const reposts = await audiusClient.getUserReposts(args.userId, limit);
    
    if (!reposts || reposts.length === 0) {
      return createTextResponse(`No reposts found for user ID: ${args.userId}`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      reposts: reposts,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in user-reposts tool:', error);
    return createTextResponse(
      `Error retrieving user reposts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
export const getUserFollowers = async (args: { userId: string, limit?: number }, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    const followers = await audiusClient.getUserFollowers(args.userId, limit);
    
    if (!followers || followers.length === 0) {
      return createTextResponse(`No followers found for user ID: ${args.userId}`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      followers: followers,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in user-followers tool:', error);
    return createTextResponse(
      `Error retrieving user followers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
export const getUserFollowing = async (args: { userId: string, limit?: number }, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    const following = await audiusClient.getUserFollowing(args.userId, limit);
    
    if (!following || following.length === 0) {
      return createTextResponse(`No following found for user ID: ${args.userId}`);
    }
    
    // Format results
    const formattedResults = {
      userId: args.userId,
      following: following,
    };
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in user-following tool:', error);
    return createTextResponse(
      `Error retrieving user following: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for is-following tool
export const isFollowingSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the potential follower',
    },
    followeeId: {
      type: 'string',
      description: 'ID of the user to check if being followed',
    },
  },
  required: ['userId', 'followeeId'],
};

// Implementation of is-following tool
export const isFollowing = async (args: { userId: string, followeeId: string }, extra: RequestHandlerExtra) => {
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
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in is-following tool:', error);
    return createTextResponse(
      `Error checking follow status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
export const getTrackFavorites = async (args: { trackId: string, limit?: number }, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    const favorites = await audiusClient.getTrackFavorites(args.trackId, limit);
    
    if (!favorites || favorites.length === 0) {
      return createTextResponse(`No favorites found for track ID: ${args.trackId}`);
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
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in track-favorites tool:', error);
    return createTextResponse(
      `Error retrieving track favorites: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
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
export const getTrackReposts = async (args: { trackId: string, limit?: number }, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    const limit = args.limit || 10;
    
    const reposts = await audiusClient.getTrackReposts(args.trackId, limit);
    
    if (!reposts || reposts.length === 0) {
      return createTextResponse(`No reposts found for track ID: ${args.trackId}`);
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
    
    return createTextResponse(JSON.stringify(formattedResults, null, 2));
  } catch (error) {
    console.error('Error in track-reposts tool:', error);
    return createTextResponse(
      `Error retrieving track reposts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for follow-user tool
export const followUserSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user who wants to follow someone',
    },
    followeeId: {
      type: 'string',
      description: 'ID of the user to follow',
    },
  },
  required: ['userId', 'followeeId'],
};

// Implementation of follow-user tool
export const followUser = async (args: { userId: string, followeeId: string }, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // First verify both users exist
    const [follower, followee] = await Promise.all([
      audiusClient.getUser(args.userId),
      audiusClient.getUser(args.followeeId)
    ]);
    
    if (!follower) {
      return createTextResponse(`Error: Follower user ID ${args.userId} not found`, true);
    }
    
    if (!followee) {
      return createTextResponse(`Error: Followee user ID ${args.followeeId} not found`, true);
    }
    
    // Check if already following
    const isAlreadyFollowing = await audiusClient.isUserFollowing(args.userId, args.followeeId);
    
    if (isAlreadyFollowing) {
      return createTextResponse(JSON.stringify({
        status: "already_following",
        follower: {
          id: args.userId,
          name: follower.name
        },
        followee: {
          id: args.followeeId,
          name: followee.name
        }
      }, null, 2));
    }
    
    // Follow the user
    const result = await audiusClient.followUser(args.userId, args.followeeId);
    
    return createTextResponse(JSON.stringify({
      status: "success",
      follower: {
        id: args.userId,
        name: follower.name
      },
      followee: {
        id: args.followeeId,
        name: followee.name
      },
      timestamp: new Date().toISOString()
    }, null, 2));
  } catch (error) {
    console.error('Error in follow-user tool:', error);
    return createTextResponse(
      `Error following user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Schema for favorite-track tool
export const favoriteTrackSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'ID of the user who wants to favorite the track',
    },
    trackId: {
      type: 'string',
      description: 'ID of the track to favorite',
    },
  },
  required: ['userId', 'trackId'],
};

// Implementation of favorite-track tool
export const favoriteTrack = async (args: { userId: string, trackId: string }, extra: RequestHandlerExtra) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // First verify both user and track exist
    const [user, track] = await Promise.all([
      audiusClient.getUser(args.userId),
      audiusClient.getTrack(args.trackId)
    ]);
    
    if (!user) {
      return createTextResponse(`Error: User ID ${args.userId} not found`, true);
    }
    
    if (!track) {
      return createTextResponse(`Error: Track ID ${args.trackId} not found`, true);
    }
    
    // Get user favorites to check if already favorited
    const favorites = await audiusClient.getUserFavorites(args.userId);
    const isAlreadyFavorited = favorites.some((fav: any) => fav.id === args.trackId);
    
    if (isAlreadyFavorited) {
      return createTextResponse(JSON.stringify({
        status: "already_favorited",
        user: {
          id: args.userId,
          name: user.name
        },
        track: {
          id: args.trackId,
          title: track.title,
          artist: track.user?.name || 'Unknown Artist'
        }
      }, null, 2));
    }
    
    // Favorite the track
    const result = await audiusClient.favoriteTrack(args.userId, args.trackId);
    
    return createTextResponse(JSON.stringify({
      status: "success",
      user: {
        id: args.userId,
        name: user.name
      },
      track: {
        id: args.trackId,
        title: track.title,
        artist: track.user?.name || 'Unknown Artist'
      },
      timestamp: new Date().toISOString()
    }, null, 2));
  } catch (error) {
    console.error('Error in favorite-track tool:', error);
    return createTextResponse(
      `Error favoriting track: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};