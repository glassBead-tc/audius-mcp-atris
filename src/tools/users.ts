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

// Schema for get-bulk-users tool
export const getBulkUsersSchema = {
  type: 'object',
  properties: {
    userIds: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'Array of user IDs to retrieve',
      minItems: 1,
      maxItems: 50
    },
  },
  required: ['userIds'],
};

// Schema for get-ai-attributed-tracks-by-handle tool
export const getAIAttributedTracksByUserHandleSchema = {
  type: 'object',
  properties: {
    handle: {
      type: 'string',
      description: 'The handle of the user (without @ symbol)',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of tracks to return (default: 10)',
    },
  },
  required: ['handle'],
};

// Schema for get-library-tracks tool
export const getLibraryTracksSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'The ID of the user to get library tracks for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of tracks to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Schema for get-library-albums tool
export const getLibraryAlbumsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'The ID of the user to get library albums for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of albums to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Schema for get-library-playlists tool
export const getLibraryPlaylistsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'The ID of the user to get library playlists for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of playlists to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Schema for get-authorized-apps tool
export const getAuthorizedAppsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'The ID of the user to get authorized apps for',
    },
  },
  required: ['userId'],
};

// Schema for get-connected-wallets tool
export const getConnectedWalletsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'The ID of the user to get connected wallets for',
    },
  },
  required: ['userId'],
};

// Schema for get-developer-apps tool
export const getDeveloperAppsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'The ID of the user to get developer apps for',
    },
  },
  required: ['userId'],
};

// Schema for get-track-purchasers tool
export const getTrackPurchasersSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'The ID of the track to get purchasers for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of purchasers to return (default: 10)',
    },
  },
  required: ['trackId'],
};

// Schema for get-track-remixers tool
export const getTrackRemixersSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'The ID of the track to get remixers for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of remixers to return (default: 10)',
    },
  },
  required: ['trackId'],
};

// Schema for get-related-users tool
export const getRelatedUsersSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'The ID of the user to find related users for',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of related users to return (default: 10)',
    },
  },
  required: ['userId'],
};

// Schema for get-user-tags tool
export const getUserTagsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'The ID of the user to get tags for',
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

// Implementation of get-bulk-users tool
export const getBulkUsers = async (args: { userIds: string[] }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Validate array length
    if (args.userIds.length > 50) {
      return createTextResponse('Maximum 50 user IDs allowed per request', true);
    }
    
    // Fetch users in parallel
    const userPromises = args.userIds.map(async (userId) => {
      try {
        const user = await audiusClient.getUser(userId);
        return user ? { success: true, user } : { success: false, userId, error: 'User not found' };
      } catch (error: any) {
        return { success: false, userId, error: error.message };
      }
    });
    
    const results = await Promise.all(userPromises);
    
    // Separate successful and failed results
    const successfulUsers = results.filter(r => r.success).map(r => (r as any).user);
    const failedUsers = results.filter(r => !r.success);
    
    if (successfulUsers.length === 0) {
      return createTextResponse('No users found for the provided IDs', true);
    }
    
    // Format successful users
    const formattedUsers = successfulUsers.map((user, index) => (
      `${index + 1}. ${user.name} (@${user.handle})\n` +
      `   ID: ${user.id} | Followers: ${user.followerCount || 0} | Following: ${user.followingCount || 0}\n` +
      `   Tracks: ${user.trackCount || 0} | Playlists: ${user.playlistCount || 0}`
    )).join('\n\n');
    
    let response = `Retrieved ${successfulUsers.length} users:\n\n${formattedUsers}`;
    
    // Add failed users info if any
    if (failedUsers.length > 0) {
      const failedList = failedUsers.map(f => `- ${(f as any).userId}: ${(f as any).error}`).join('\n');
      response += `\n\nFailed to retrieve ${failedUsers.length} users:\n${failedList}`;
    }
    
    return createTextResponse(response);
  } catch (error) {
    console.error('Error in get-bulk-users tool:', error);
    return createTextResponse(
      `Error retrieving bulk users: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-ai-attributed-tracks-by-handle tool
export const getAIAttributedTracksByUserHandle = async (args: { handle: string, limit?: number }) => {
  try {
    const limit = args.limit || 10;
    
    // Construct the API URL based on the Audius API pattern
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/users/handle/${encodeURIComponent(args.handle)}/tracks/ai_attributed?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return createTextResponse(`User with handle '@${args.handle}' not found`, true);
      }
      return createTextResponse(`Error fetching AI attributed tracks: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No AI-attributed tracks found for user @${args.handle}`, true);
    }
    
    const tracks = data.data;
    
    // Format the tracks in a more readable way
    const formattedTracks = tracks.map((track: any, index: number) => (
      `${index + 1}. "${track.title}"\n` +
      `   ID: ${track.id} | Duration: ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}\n` +
      `   Plays: ${track.playCount || 0} | Likes: ${track.favoriteCount || 0}\n` +
      `   AI Attribution: ${track.aiAttributionUserId ? `Attributed to User ID ${track.aiAttributionUserId}` : 'AI attribution data available'}`
    )).join('\n\n');
    
    return createTextResponse(
      `AI-attributed tracks by @${args.handle}:\n\n${formattedTracks}`
    );
  } catch (error) {
    console.error('Error in get-ai-attributed-tracks-by-handle tool:', error);
    return createTextResponse(
      `Error fetching AI attributed tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-library-tracks tool
export const getLibraryTracks = async (args: { userId: string, limit?: number }) => {
  try {
    const limit = args.limit || 10;
    
    // Construct the API URL for library tracks
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/users/${encodeURIComponent(args.userId)}/library/tracks?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return createTextResponse(`User with ID '${args.userId}' not found`, true);
      }
      return createTextResponse(`Error fetching library tracks: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No library tracks found for user ID ${args.userId}`, true);
    }
    
    const tracks = data.data;
    
    // Format the tracks in a more readable way
    const formattedTracks = tracks.map((track: any, index: number) => (
      `${index + 1}. "${track.title}" by ${track.user.name}\n` +
      `   ID: ${track.id} | Duration: ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}\n` +
      `   Plays: ${track.playCount || 0} | Likes: ${track.favoriteCount || 0}`
    )).join('\n\n');
    
    return createTextResponse(
      `Library tracks for user ID ${args.userId}:\n\n${formattedTracks}`
    );
  } catch (error) {
    console.error('Error in get-library-tracks tool:', error);
    return createTextResponse(
      `Error fetching library tracks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-library-albums tool
export const getLibraryAlbums = async (args: { userId: string, limit?: number }) => {
  try {
    const limit = args.limit || 10;
    
    // Construct the API URL for library albums
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/users/${encodeURIComponent(args.userId)}/library/albums?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return createTextResponse(`User with ID '${args.userId}' not found`, true);
      }
      return createTextResponse(`Error fetching library albums: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No library albums found for user ID ${args.userId}`, true);
    }
    
    const albums = data.data;
    
    // Format the albums in a more readable way
    const formattedAlbums = albums.map((album: any, index: number) => (
      `${index + 1}. "${album.playlistName}" by ${album.user.name}\n` +
      `   ID: ${album.id} | Tracks: ${album.trackCount || 0}\n` +
      `   Description: ${album.description || 'No description'}`
    )).join('\n\n');
    
    return createTextResponse(
      `Library albums for user ID ${args.userId}:\n\n${formattedAlbums}`
    );
  } catch (error) {
    console.error('Error in get-library-albums tool:', error);
    return createTextResponse(
      `Error fetching library albums: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-library-playlists tool
export const getLibraryPlaylists = async (args: { userId: string, limit?: number }) => {
  try {
    const limit = args.limit || 10;
    
    // Construct the API URL for library playlists
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/users/${encodeURIComponent(args.userId)}/library/playlists?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return createTextResponse(`User with ID '${args.userId}' not found`, true);
      }
      return createTextResponse(`Error fetching library playlists: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No library playlists found for user ID ${args.userId}`, true);
    }
    
    const playlists = data.data;
    
    // Format the playlists in a more readable way
    const formattedPlaylists = playlists.map((playlist: any, index: number) => (
      `${index + 1}. "${playlist.playlistName}" by ${playlist.user.name}\n` +
      `   ID: ${playlist.id} | Tracks: ${playlist.trackCount || 0}\n` +
      `   Description: ${playlist.description || 'No description'}`
    )).join('\n\n');
    
    return createTextResponse(
      `Library playlists for user ID ${args.userId}:\n\n${formattedPlaylists}`
    );
  } catch (error) {
    console.error('Error in get-library-playlists tool:', error);
    return createTextResponse(
      `Error fetching library playlists: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-authorized-apps tool
export const getAuthorizedApps = async (args: { userId: string }) => {
  try {
    // Construct the API URL for authorized apps
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/users/${encodeURIComponent(args.userId)}/authorized_apps`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return createTextResponse(`User with ID '${args.userId}' not found`, true);
      }
      return createTextResponse(`Error fetching authorized apps: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No authorized apps found for user ID ${args.userId}`, true);
    }
    
    const apps = data.data;
    
    // Format the apps in a more readable way
    const formattedApps = apps.map((app: any, index: number) => (
      `${index + 1}. ${app.name || app.appName}\n` +
      `   App ID: ${app.id || app.appId}\n` +
      `   Description: ${app.description || 'No description'}\n` +
      `   Authorized: ${new Date(app.createdAt || app.authorizedAt).toLocaleDateString()}\n` +
      `   Permissions: ${app.scopes ? app.scopes.join(', ') : 'Standard permissions'}`
    )).join('\n\n');
    
    return createTextResponse(
      `Authorized apps for user ID ${args.userId}:\n\n${formattedApps}`
    );
  } catch (error) {
    console.error('Error in get-authorized-apps tool:', error);
    return createTextResponse(
      `Error fetching authorized apps: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-connected-wallets tool
export const getConnectedWallets = async (args: { userId: string }) => {
  try {
    // Construct the API URL for connected wallets
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/users/${encodeURIComponent(args.userId)}/connected_wallets`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return createTextResponse(`User with ID '${args.userId}' not found`, true);
      }
      return createTextResponse(`Error fetching connected wallets: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No connected wallets found for user ID ${args.userId}`, true);
    }
    
    const wallets = data.data;
    
    // Format the wallets in a more readable way
    const formattedWallets = wallets.map((wallet: any, index: number) => (
      `${index + 1}. ${wallet.chain || 'Unknown Chain'} Wallet\n` +
      `   Address: ${wallet.address}\n` +
      `   Type: ${wallet.type || 'Standard'}\n` +
      `   Connected: ${wallet.connectedAt ? new Date(wallet.connectedAt).toLocaleDateString() : 'Unknown date'}\n` +
      `   Verified: ${wallet.isVerified ? 'Yes ✓' : 'No'}`
    )).join('\n\n');
    
    return createTextResponse(
      `Connected wallets for user ID ${args.userId}:\n\n${formattedWallets}`
    );
  } catch (error) {
    console.error('Error in get-connected-wallets tool:', error);
    return createTextResponse(
      `Error fetching connected wallets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-developer-apps tool
export const getDeveloperApps = async (args: { userId: string }) => {
  try {
    // Construct the API URL for developer apps
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/users/${encodeURIComponent(args.userId)}/developer_apps`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return createTextResponse(`User with ID '${args.userId}' not found`, true);
      }
      return createTextResponse(`Error fetching developer apps: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No developer apps found for user ID ${args.userId}`, true);
    }
    
    const apps = data.data;
    
    // Format the apps in a more readable way
    const formattedApps = apps.map((app: any, index: number) => (
      `${index + 1}. ${app.name || app.appName}\n` +
      `   App ID: ${app.id || app.appId}\n` +
      `   Client ID: ${app.clientId || 'N/A'}\n` +
      `   Description: ${app.description || 'No description'}\n` +
      `   Created: ${app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'Unknown date'}\n` +
      `   Status: ${app.status || 'Active'}\n` +
      `   Redirect URIs: ${app.redirectUris ? app.redirectUris.join(', ') : 'None configured'}`
    )).join('\n\n');
    
    return createTextResponse(
      `Developer apps for user ID ${args.userId}:\n\n${formattedApps}`
    );
  } catch (error) {
    console.error('Error in get-developer-apps tool:', error);
    return createTextResponse(
      `Error fetching developer apps: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-track-purchasers tool
export const getTrackPurchasers = async (args: { trackId: string, limit?: number }) => {
  try {
    const limit = args.limit || 10;
    
    // Construct the API URL for track purchasers
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/tracks/${encodeURIComponent(args.trackId)}/purchasers?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return createTextResponse(`Track with ID '${args.trackId}' not found or has no purchasers`, true);
      }
      return createTextResponse(`Error fetching track purchasers: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No purchasers found for track ID ${args.trackId}`, true);
    }
    
    const purchasers = data.data;
    
    // Format the purchasers in a more readable way
    const formattedPurchasers = purchasers.map((purchaser: any, index: number) => (
      `${index + 1}. ${purchaser.name} (@${purchaser.handle})\n` +
      `   ID: ${purchaser.id} | Followers: ${purchaser.followerCount || 0}\n` +
      `   Purchase Date: ${purchaser.purchaseDate ? new Date(purchaser.purchaseDate).toLocaleDateString() : 'Unknown'}\n` +
      `   Purchase Type: ${purchaser.purchaseType || 'Standard'}`
    )).join('\n\n');
    
    return createTextResponse(
      `💰 Track Purchasers for Track ID ${args.trackId}:\n\n${formattedPurchasers}`
    );
  } catch (error) {
    console.error('Error in get-track-purchasers tool:', error);
    return createTextResponse(
      `Error fetching track purchasers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-track-remixers tool
export const getTrackRemixers = async (args: { trackId: string, limit?: number }) => {
  try {
    const limit = args.limit || 10;
    
    // Construct the API URL for track remixers
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/tracks/${encodeURIComponent(args.trackId)}/remixers?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return createTextResponse(`Track with ID '${args.trackId}' not found or has no remixers`, true);
      }
      return createTextResponse(`Error fetching track remixers: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No remixers found for track ID ${args.trackId}`, true);
    }
    
    const remixers = data.data;
    
    // Format the remixers in a more readable way
    const formattedRemixers = remixers.map((remixer: any, index: number) => (
      `${index + 1}. ${remixer.name} (@${remixer.handle})\n` +
      `   ID: ${remixer.id} | Followers: ${remixer.followerCount || 0}\n` +
      `   Remix Title: "${remixer.remixTitle || 'Untitled Remix'}"\n` +
      `   Remix Track ID: ${remixer.remixTrackId || 'N/A'}\n` +
      `   Created: ${remixer.remixCreatedAt ? new Date(remixer.remixCreatedAt).toLocaleDateString() : 'Unknown'}`
    )).join('\n\n');
    
    return createTextResponse(
      `🎛️ Track Remixers for Track ID ${args.trackId}:\n\n${formattedRemixers}`
    );
  } catch (error) {
    console.error('Error in get-track-remixers tool:', error);
    return createTextResponse(
      `Error fetching track remixers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-related-users tool
export const getRelatedUsers = async (args: { userId: string, limit?: number }) => {
  try {
    const limit = args.limit || 10;
    
    // Construct the API URL for related users
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/users/${encodeURIComponent(args.userId)}/related?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return createTextResponse(`User with ID '${args.userId}' not found`, true);
      }
      return createTextResponse(`Error fetching related users: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No related users found for user ID ${args.userId}`, true);
    }
    
    const relatedUsers = data.data;
    
    // Format the related users in a more readable way
    const formattedUsers = relatedUsers.map((user: any, index: number) => (
      `${index + 1}. ${user.name} (@${user.handle})\n` +
      `   ID: ${user.id} | Followers: ${user.followerCount || 0}\n` +
      `   Tracks: ${user.trackCount || 0} | Playlists: ${user.playlistCount || 0}\n` +
      `   Relation Score: ${user.relationScore || 'N/A'}\n` +
      `   Common Genres: ${user.commonGenres ? user.commonGenres.join(', ') : 'None'}\n` +
      `   Mutual Follows: ${user.mutualFollows || 0}`
    )).join('\n\n');
    
    return createTextResponse(
      `🤝 Related Users for User ID ${args.userId}:\n\n${formattedUsers}`
    );
  } catch (error) {
    console.error('Error in get-related-users tool:', error);
    return createTextResponse(
      `Error fetching related users: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-user-tags tool
export const getUserTags = async (args: { userId: string }) => {
  try {
    // Construct the API URL for user tags
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/users/${encodeURIComponent(args.userId)}/tags`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return createTextResponse(`User with ID '${args.userId}' not found`, true);
      }
      return createTextResponse(`Error fetching user tags: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse(`No tags found for user ID ${args.userId}`, true);
    }
    
    const tags = data.data;
    
    // Group tags by category
    const tagsByCategory: Record<string, any[]> = {};
    tags.forEach((tag: any) => {
      const category = tag.category || 'Other';
      if (!tagsByCategory[category]) {
        tagsByCategory[category] = [];
      }
      tagsByCategory[category].push(tag);
    });
    
    // Format tags by category
    const formattedTags = Object.entries(tagsByCategory).map(([category, categoryTags]) => {
      const tagList = categoryTags.map((tag: any) => 
        `   • ${tag.name} ${tag.count ? `(${tag.count})` : ''}`
      ).join('\n');
      return `📂 ${category}:\n${tagList}`;
    }).join('\n\n');
    
    return createTextResponse(
      `🏷️ User Tags for User ID ${args.userId}:\n\n${formattedTags}\n\n📊 Total Tags: ${tags.length}`
    );
  } catch (error) {
    console.error('Error in get-user-tags tool:', error);
    return createTextResponse(
      `Error fetching user tags: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};