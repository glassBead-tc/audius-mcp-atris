import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { createTextResponse } from '../utils/response.js';

// Schema for get-playlist tool
export const getPlaylistSchema = {
  type: 'object',
  properties: {
    playlistId: {
      type: 'string',
      description: 'The ID of the playlist to retrieve',
    },
  },
  required: ['playlistId'],
};

// Schema for get-album tool
export const getAlbumSchema = {
  type: 'object',
  properties: {
    albumId: {
      type: 'string',
      description: 'The ID of the album to retrieve',
    },
  },
  required: ['albumId'],
};

// Schema for get-trending-playlists tool
export const getTrendingPlaylistsSchema = {
  type: 'object',
  properties: {
    limit: {
      type: 'number',
      description: 'Maximum number of trending playlists to return (default: 10)',
    },
  },
};

// Schema for get-bulk-playlists tool
export const getBulkPlaylistsSchema = {
  type: 'object',
  properties: {
    playlistIds: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'Array of playlist IDs to retrieve',
      minItems: 1,
      maxItems: 50
    },
  },
  required: ['playlistIds'],
};

// Implementation of get-playlist tool
export const getPlaylist = async (args: { playlistId: string }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    console.error(`Attempting to get playlist with ID: ${args.playlistId}`);
    
    const playlist = await audiusClient.getPlaylist(args.playlistId);
    
    if (!playlist) {
      return createTextResponse(`Playlist with ID ${args.playlistId} not found`, true);
    }
    
    // Format the playlist information in a more readable way
    const trackList = playlist.tracks?.map((track, index) => (
      `${index + 1}. "${track.title}" by ${track.user.name} - ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`
    )).join('\n') || 'No tracks';
    
    const formattedPlaylist = [
      `📋 Playlist: ${playlist.playlist_name}`,
      `👤 Created by: ${playlist.user.name}`,
      `📝 Description: ${playlist.description || 'No description provided'}`,
      `🎵 Track Count: ${playlist.track_count || 0}`,
      `👥 Follower Count: ${playlist.followee_count || 0}`,
      `👍 Favorite Count: ${playlist.favorite_count || 0}`,
      `🔁 Repost Count: ${playlist.repost_count || 0}`,
      `🕒 Created: ${new Date(playlist.created_at).toLocaleDateString()}`,
      ``,
      `📊 Tracks:`,
      `${trackList}`
    ].join('\n');
    
    return createTextResponse(formattedPlaylist);
  } catch (error) {
    console.error('Error in get-playlist tool:', error);
    return createTextResponse(
      `Error fetching playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-album tool
export const getAlbum = async (args: { albumId: string }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    console.error(`Attempting to get album with ID: ${args.albumId}`);
    
    const album = await audiusClient.getAlbum(args.albumId);
    
    if (!album) {
      return createTextResponse(`Album with ID ${args.albumId} not found`, true);
    }
    
    // Format the album information in a more readable way
    const trackList = album.tracks?.map((track, index) => (
      `${index + 1}. "${track.title}" - ${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`
    )).join('\n') || 'No tracks';
    
    const formattedAlbum = [
      `💿 Album: ${album.playlist_name}`,
      `🎤 Artist: ${album.user.name}`,
      `📝 Description: ${album.description || 'No description provided'}`,
      `🎵 Track Count: ${album.track_count || 0}`,
      `👥 Follower Count: ${album.followee_count || 0}`,
      `👍 Favorite Count: ${album.favorite_count || 0}`,
      `🔁 Repost Count: ${album.repost_count || 0}`,
      `🎵 Genre: ${album.genre || 'Not specified'}`,
      `🕒 Released: ${new Date(album.created_at).toLocaleDateString()}`,
      ``,
      `📊 Tracks:`,
      `${trackList}`
    ].join('\n');
    
    return createTextResponse(formattedAlbum);
  } catch (error) {
    console.error('Error in get-album tool:', error);
    return createTextResponse(
      `Error fetching album: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-trending-playlists tool
export const getTrendingPlaylists = async (args: { limit?: number }) => {
  try {
    const limit = args.limit || 10;
    
    // Construct the API URL for trending playlists
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const apiUrl = `${baseUrl}/playlists/trending?limit=${limit}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return createTextResponse(`Error fetching trending playlists: HTTP ${response.status}`, true);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return createTextResponse('No trending playlists found', true);
    }
    
    const playlists = data.data;
    
    // Format the playlists in a more readable way
    const formattedPlaylists = playlists.map((playlist: any, index: number) => (
      `${index + 1}. "${playlist.playlistName}" by ${playlist.user.name}\n` +
      `   ID: ${playlist.id} | Tracks: ${playlist.trackCount || 0}\n` +
      `   Followers: ${playlist.followerCount || 0} | Favorites: ${playlist.favoriteCount || 0}\n` +
      `   ${playlist.description ? `Description: ${playlist.description.substring(0, 100)}${playlist.description.length > 100 ? '...' : ''}` : 'No description'}`
    )).join('\n\n');
    
    return createTextResponse(
      `🔥 Trending Playlists:\n\n${formattedPlaylists}`
    );
  } catch (error) {
    console.error('Error in get-trending-playlists tool:', error);
    return createTextResponse(
      `Error fetching trending playlists: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};

// Implementation of get-bulk-playlists tool
export const getBulkPlaylists = async (args: { playlistIds: string[] }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    
    // Validate array length
    if (args.playlistIds.length > 50) {
      return createTextResponse('Maximum 50 playlist IDs allowed per request', true);
    }
    
    // Fetch playlists in parallel
    const playlistPromises = args.playlistIds.map(async (playlistId) => {
      try {
        const playlist = await audiusClient.getPlaylist(playlistId);
        return playlist ? { success: true, playlist } : { success: false, playlistId, error: 'Playlist not found' };
      } catch (error: any) {
        return { success: false, playlistId, error: error.message };
      }
    });
    
    const results = await Promise.all(playlistPromises);
    
    // Separate successful and failed results
    const successfulPlaylists = results.filter(r => r.success).map(r => (r as any).playlist);
    const failedPlaylists = results.filter(r => !r.success);
    
    if (successfulPlaylists.length === 0) {
      return createTextResponse('No playlists found for the provided IDs', true);
    }
    
    // Format successful playlists
    const formattedPlaylists = successfulPlaylists.map((playlist, index) => (
      `${index + 1}. "${playlist.playlist_name}" by ${playlist.user.name}\n` +
      `   ID: ${playlist.id} | Tracks: ${playlist.track_count || 0}\n` +
      `   Type: ${playlist.is_album ? 'Album' : 'Playlist'} | Followers: ${playlist.followee_count || 0}\n` +
      `   Created: ${new Date(playlist.created_at).toLocaleDateString()}`
    )).join('\n\n');
    
    let response = `Retrieved ${successfulPlaylists.length} playlists:\n\n${formattedPlaylists}`;
    
    // Add failed playlists info if any
    if (failedPlaylists.length > 0) {
      const failedList = failedPlaylists.map(f => `- ${(f as any).playlistId}: ${(f as any).error}`).join('\n');
      response += `\n\nFailed to retrieve ${failedPlaylists.length} playlists:\n${failedList}`;
    }
    
    return createTextResponse(response);
  } catch (error) {
    console.error('Error in get-bulk-playlists tool:', error);
    return createTextResponse(
      `Error retrieving bulk playlists: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
};