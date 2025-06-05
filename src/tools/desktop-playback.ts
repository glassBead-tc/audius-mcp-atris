import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { RequestHandlerExtra } from '../types/index.js';
import { createTextResponse } from '../utils/response.js';

// Schema for play-track-desktop tool
export const playTrackInDesktopSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'The ID of the track to play in Audius Desktop'
    }
  },
  required: ['trackId']
};

// Implementation of play-track-desktop tool
export const playTrackInDesktop = async (args: { trackId: string }, extra: RequestHandlerExtra) => {
  try {
    const client = AudiusClient.getInstance();
    const track = await client.getTrack(args.trackId);
    
    if (!track || !track.data) {
      return createTextResponse('Track not found', true);
    }

    const trackData = track.data;
    const permalink = trackData.permalink || `${trackData.user.handle}/${trackData.slug || trackData.title.toLowerCase().replace(/\s+/g, '-')}`;
    const deepLink = `audius://track/${permalink}`;
    
    return createTextResponse(
      `🎵 Play "${trackData.title}" by ${trackData.user.name}\n\n` +
      `Desktop Link: ${deepLink}\n\n` +
      `Click the link above or copy it to open in Audius Desktop.\n\n` +
      `Platform commands:\n` +
      `• macOS/Linux: open "${deepLink}"\n` +
      `• Windows: start ${deepLink}`
    );
  } catch (error) {
    return createTextResponse(`Error generating desktop link: ${error}`, true);
  }
};

// Schema for open-artist-desktop tool
export const openArtistInDesktopSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'The ID of the artist/user to open in Audius Desktop'
    }
  },
  required: ['userId']
};

// Implementation of open-artist-desktop tool
export const openArtistInDesktop = async (args: { userId: string }, extra: RequestHandlerExtra) => {
  try {
    const client = AudiusClient.getInstance();
    const user = await client.getUser(args.userId);
    
    if (!user || !user.data) {
      return createTextResponse('User not found', true);
    }

    const userData = user.data;
    const deepLink = `audius://${userData.handle}`;
    
    return createTextResponse(
      `👤 Open ${userData.name}'s profile\n\n` +
      `Desktop Link: ${deepLink}\n\n` +
      `Click the link above or copy it to open in Audius Desktop.`
    );
  } catch (error) {
    return createTextResponse(`Error generating desktop link: ${error}`, true);
  }
};

// Schema for open-playlist-desktop tool
export const openPlaylistInDesktopSchema = {
  type: 'object',
  properties: {
    playlistId: {
      type: 'string',
      description: 'The ID of the playlist to open in Audius Desktop'
    }
  },
  required: ['playlistId']
};

// Implementation of open-playlist-desktop tool
export const openPlaylistInDesktop = async (args: { playlistId: string }, extra: RequestHandlerExtra) => {
  try {
    const client = AudiusClient.getInstance();
    const playlist = await client.getPlaylist(args.playlistId);
    
    if (!playlist || !playlist.data) {
      return createTextResponse('Playlist not found', true);
    }

    const playlistData = playlist.data;
    const isAlbum = playlistData.is_album;
    const type = isAlbum ? 'album' : 'playlist';
    const permalink = playlistData.permalink || `${playlistData.user.handle}/${type}/${playlistData.playlist_name.toLowerCase().replace(/\s+/g, '-')}`;
    const deepLink = `audius://${type}/${permalink}`;
    
    return createTextResponse(
      `📋 Open ${isAlbum ? 'album' : 'playlist'} "${playlistData.playlist_name}"\n\n` +
      `Desktop Link: ${deepLink}\n\n` +
      `Click the link above or copy it to open in Audius Desktop.`
    );
  } catch (error) {
    return createTextResponse(`Error generating desktop link: ${error}`, true);
  }
};