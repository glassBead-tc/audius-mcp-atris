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