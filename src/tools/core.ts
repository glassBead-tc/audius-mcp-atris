import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AudiusClient } from '../sdk-client.js';
import { RequestHandlerExtra } from '../types/index.js';
import { createTextResponse, createMixedResponse, createResourceResponse } from '../utils/response.js';

// Schema for resolve tool
export const resolveSchema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      description: 'Audius URL to resolve (e.g., audius.co/user/track)',
    },
  },
  required: ['url'],
};

// Schema for get-sdk-version tool
export const getSdkVersionSchema = {
  type: 'object',
  properties: {},
};

// Handler for resolve
export async function resolve(
  args: { url: string },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    const client = AudiusClient.getInstance();
    
    // Extract the path from the URL
    let path = args.url;
    if (path.includes('audius.co/')) {
      path = path.split('audius.co/')[1];
    }
    
    // Make API call to resolve endpoint
    const apiUrl = `https://discoveryprovider.audius.co/v1/resolve?url=${encodeURIComponent(path)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to resolve URL: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.data) {
      return createTextResponse('Could not resolve the provided URL', true);
    }
    
    // Format response based on entity type
    const entity = data.data;
    let entityType = 'unknown';
    let entityInfo = '';
    
    if (entity.track) {
      entityType = 'track';
      const track = entity.track;
      entityInfo = `Track: ${track.title}
Artist: ${track.user.name}
Duration: ${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}
Play Count: ${track.playCount}
ID: ${track.id}`;
    } else if (entity.user) {
      entityType = 'user';
      const user = entity.user;
      entityInfo = `User: ${user.name}
Handle: @${user.handle}
Followers: ${user.followerCount}
Tracks: ${user.trackCount}
ID: ${user.id}`;
    } else if (entity.playlist) {
      entityType = 'playlist';
      const playlist = entity.playlist;
      entityInfo = `${playlist.isAlbum ? 'Album' : 'Playlist'}: ${playlist.playlistName}
Owner: ${playlist.user.name}
Track Count: ${playlist.trackCount}
ID: ${playlist.id}`;
    }
    
    return createMixedResponse([
      { type: "text" as const, text: entityInfo },
      { 
        type: "resource" as const, 
        resource: { 
          uri: `audius://${entityType}/${entity.id || entity.track?.id || entity.user?.id || entity.playlist?.id}`, 
          mimeType: "application/json",
          text: JSON.stringify(entity, null, 2)
        } 
      }
    ]);
  } catch (error: any) {
    return createTextResponse(`Error resolving URL: ${error.message}`, true);
  }
}

// Handler for get-sdk-version
export async function getSdkVersion(
  args: {},
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const packagePath = path.join(__dirname, '../../package.json');
    const packageContent = fs.readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    
    const sdkVersion = packageJson.dependencies['@audius/sdk'];
    const mcpVersion = packageJson.version;
    
    return createTextResponse(`Audius SDK Version: ${sdkVersion}\nMCP Server Version: ${mcpVersion}`);
  } catch (error: any) {
    return createTextResponse(`Error getting SDK version: ${error.message}`, true);
  }
}