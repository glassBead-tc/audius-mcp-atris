import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';

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
// Schema for playlist_playback tool
export const playlistPlaybackSchema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['start', 'next', 'previous', 'get'],
      description: 'Playback action: start, next, previous, or get current track',
    },
    playlistId: {
      type: 'string',
      description: 'The ID of the playlist',
    },
    trackIndex: {
      type: 'integer',
      description: 'Track index to start playback from (optional, for start action)',
    },
    currentIndex: {
      type: 'integer',
      description: 'Current track index (optional, for next, previous, get)',
    }
  },
  required: ['action', 'playlistId'],
};

// Implementation of get-playlist tool
export const getPlaylist = async (args: { playlistId: string }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    console.error(`Attempting to get playlist with ID: ${args.playlistId}`);
    
    const playlist = await audiusClient.getPlaylist(args.playlistId);
    
    if (!playlist) {
      return {
        content: [{
          type: 'text',
          text: `Playlist with ID ${args.playlistId} not found`,
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(playlist, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-playlist tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error fetching playlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
};

// Implementation of get-album tool
export const getAlbum = async (args: { albumId: string }) => {
  try {
    const audiusClient = AudiusClient.getInstance();
    console.error(`Attempting to get album with ID: ${args.albumId}`);
    
    const album = await audiusClient.getAlbum(args.albumId);
    
    if (!album) {
      return {
        content: [{
          type: 'text',
          text: `Album with ID ${args.albumId} not found`,
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(album, null, 2),
      }],
    };
  } catch (error) {
    console.error('Error in get-album tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error fetching album: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true
    };
  }
// Implementation of playlist_playback tool
async function playlistPlayback(args) {
  try {
    const audiusClient = AudiusClient.getInstance();
    const sdk = audiusClient.getSDK();

    console.error(`playlist_playback called with args: ${JSON.stringify(args)}`);

    const playlist = await audiusClient.getPlaylist(args.playlistId);
    if (!playlist || !playlist.tracks || !Array.isArray(playlist.tracks)) {
      return {
        content: [{ type: 'text', text: `Playlist with ID ${args.playlistId} not found or has no tracks.` }],
        isError: true
      };
    }

    const trackIds = playlist.tracks.map((t: any) => t.track_id || t.id).filter(Boolean);
    if (trackIds.length === 0) {
      return {
        content: [{ type: 'text', text: `Playlist with ID ${args.playlistId} contains no valid tracks.` }],
        isError: true
      };
    }

    let targetIndex: number;
    switch(args.action) {
      case 'start':
        targetIndex = (args.trackIndex !== undefined && args.trackIndex !== null) ? args.trackIndex : 0;
        break;
      case 'next':
        if (args.currentIndex === undefined || args.currentIndex === null) {
          return {
            content: [{ type: 'text', text: 'currentIndex is required for next action' }],
            isError: true
          };
        }
        targetIndex = args.currentIndex + 1;
        break;
      case 'previous':
        if (args.currentIndex === undefined || args.currentIndex === null) {
          return {
            content: [{ type: 'text', text: 'currentIndex is required for previous action' }],
            isError: true
          };
        }
        targetIndex = args.currentIndex - 1;
        break;
      case 'get':
        if (args.currentIndex === undefined || args.currentIndex === null) {
          return {
            content: [{ type: 'text', text: 'currentIndex is required for get action' }],
            isError: true
          };
        }
        targetIndex = args.currentIndex;
        break;
      default:
        return {
          content: [{ type: 'text', text: `Invalid action: ${args.action}` }],
          isError: true
        };
    }

    // Clamp index
    if (targetIndex < 0) targetIndex = 0;
    if (targetIndex >= trackIds.length) targetIndex = trackIds.length -1;

    const trackId = trackIds[targetIndex];
    if (!trackId) {
      return {
        content: [{ type: 'text', text: `No track found at index ${targetIndex}` }],
        isError: true
      };
    }

    // Fetch stream URL
    let streamUrl: string | null = null;
    try {
      streamUrl = await sdk.tracks.getTrackStreamUrl({ trackId });
    } catch (err) {
      console.error('Error fetching stream URL:', err);
    }

    // Fetch track metadata
    let trackMetadata: any = null;
    try {
      trackMetadata = await audiusClient.getTrack(trackId);
    } catch (err) {
      console.error('Error fetching track metadata:', err);
    }

    return {
      content: [{
        type: 'json',
        json: {
          streamUrl,
          trackIndex: targetIndex,
          trackMetadata,
          playlistMetadata: {

            id: playlist.playlist_id || playlist.id,
            title: playlist.playlist_name || playlist.title
          }
        }
      }]
    };
  } catch (error) {
    console.error('Error in playlist_playback tool:', error);
    return {
      content: [{
        type: 'text',
        text: `Error in playlist_playback: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
};
};