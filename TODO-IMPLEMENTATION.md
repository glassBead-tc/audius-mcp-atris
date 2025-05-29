# TODO Implementation Guide

This document provides detailed implementation guidance for adding missing SDK functionality to the Audius MCP server.

## High Priority Tasks

### 1. Albums Module Implementation

**Files to create:**
- `src/tools/albums.ts` - Album-specific tools
- Update `src/toolsets/index.ts` - Add album toolset registration

**Step 1: Create src/tools/albums.ts**

```typescript
import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { RequestHandlerExtra } from '../types/index.js';
import { createTextResponse, createMixedResponse, createResourceResponse } from '../utils/response.js';

// Schema for get-album tool
export const getAlbumSchema = {
  type: 'object',
  properties: {
    albumId: {
      type: 'string',
      description: 'Album ID (albums are playlists with is_album=true)',
    },
  },
  required: ['albumId'],
};

// Schema for get-album-tracks tool
export const getAlbumTracksSchema = {
  type: 'object',
  properties: {
    albumId: {
      type: 'string',
      description: 'Album ID to get tracks for',
    },
  },
  required: ['albumId'],
};

// Schema for get-user-albums tool
export const getUserAlbumsSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'User ID to get albums for',
    },
    offset: {
      type: 'number',
      description: 'Offset for pagination (default: 0)',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of albums to return (default: 20)',
    },
  },
  required: ['userId'],
};

// Handler for get-album
export async function getAlbum(
  args: { albumId: string },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    const client = AudiusClient.getInstance();
    // Albums are playlists with is_album=true
    const response = await client.playlists.getPlaylist({ 
      playlistId: args.albumId 
    });
    
    if (!response.data?.isAlbum) {
      return createTextResponse('The specified playlist is not an album', true);
    }
    
    const album = response.data;
    const albumInfo = `Album: ${album.playlistName}
Artist: ${album.user.name}
Track Count: ${album.trackCount}
Total Duration: ${album.totalPlayTime}s
Release Date: ${album.releaseDate || 'N/A'}
Description: ${album.description || 'N/A'}`;
    
    return createMixedResponse(
      albumInfo,
      createResourceResponse(`audius://album/${album.id}`, album.playlistName, album)
    );
  } catch (error: any) {
    return createTextResponse(`Error fetching album: ${error.message}`, true);
  }
}

// Handler for get-album-tracks
export async function getAlbumTracks(
  args: { albumId: string },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    const client = AudiusClient.getInstance();
    const response = await client.playlists.getPlaylistTracks({ 
      playlistId: args.albumId 
    });
    
    if (!response.data || response.data.length === 0) {
      return createTextResponse('No tracks found in this album', true);
    }
    
    const tracks = response.data;
    let trackList = 'Album Tracks:\n\n';
    
    tracks.forEach((track: any, index: number) => {
      trackList += `${index + 1}. ${track.title}
   Duration: ${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}
   Play Count: ${track.playCount}
   ID: ${track.id}\n\n`;
    });
    
    return createTextResponse(trackList);
  } catch (error: any) {
    return createTextResponse(`Error fetching album tracks: ${error.message}`, true);
  }
}

// Handler for get-user-albums
export async function getUserAlbums(
  args: { userId: string; offset?: number; limit?: number },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    const client = AudiusClient.getInstance();
    const offset = args.offset || 0;
    const limit = args.limit || 20;
    
    // Get user's playlists and filter for albums
    const response = await client.users.getUserPlaylists({ 
      id: args.userId,
      offset,
      limit: limit * 2 // Request more to filter
    });
    
    if (!response.data) {
      return createTextResponse('No playlists found for this user', true);
    }
    
    // Filter for albums only
    const albums = response.data.filter((p: any) => p.isAlbum).slice(0, limit);
    
    if (albums.length === 0) {
      return createTextResponse('No albums found for this user');
    }
    
    let albumList = `User Albums (${albums.length}):\n\n`;
    
    albums.forEach((album: any, index: number) => {
      albumList += `${index + 1}. ${album.playlistName}
   Track Count: ${album.trackCount}
   Release Date: ${album.releaseDate || 'N/A'}
   ID: ${album.id}\n\n`;
    });
    
    return createTextResponse(albumList);
  } catch (error: any) {
    return createTextResponse(`Error fetching user albums: ${error.message}`, true);
  }
}
```

**Step 2: Update src/toolsets/index.ts**

Add these imports after the existing playlist imports (around line 21):

```typescript
import {
  getAlbum as getAlbumNew, getAlbumSchema as getAlbumNewSchema,
  getAlbumTracks, getAlbumTracksSchema,
  getUserAlbums, getUserAlbumsSchema
} from '../tools/albums.js';
```

Create the albums toolset after the playlists toolset (around line 166):

```typescript
// 4.5 Albums Toolset (new)
const albumTools = new Toolset('albums', 'Audius Album-specific tools');

albumTools.addReadTools(
  createServerTool('get-album-details', getAlbumNewSchema, getAlbumNew, true, 'Get album details'),
  createServerTool('get-album-tracks', getAlbumTracksSchema, getAlbumTracks, true, 'Get tracks in an album'),
  createServerTool('get-user-albums', getUserAlbumsSchema, getUserAlbums, true, 'Get albums for a user')
);
```

Add the toolset to the group (around line 313):

```typescript
toolsetGroup.addToolset(albumTools);
```

### 2. OAuth Module Implementation

**Files to create:**
- `src/tools/oauth.ts` - OAuth authentication tools
- `src/toolsets/oauth.ts` - OAuth toolset registration

**Implementation notes:**
- OAuth requires browser-based flow, may need special handling for MCP context
- Consider storing tokens securely
- May need to implement a callback handler

### 3. Core Functionality

#### 3.1 Add Track Stream URL Support

**File to modify:** `src/tools/tracks.ts`

Add this schema and handler:

```typescript
// Schema for get-track-stream-url tool
export const getTrackStreamUrlSchema = {
  type: 'object',
  properties: {
    trackId: {
      type: 'string',
      description: 'Track ID to get stream URL for',
    },
  },
  required: ['trackId'],
};

// Handler for get-track-stream-url
export async function getTrackStreamUrl(
  args: { trackId: string },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    const client = AudiusClient.getInstance();
    // Get track details first to verify it exists
    const trackResponse = await client.tracks.getTrack({ trackId: args.trackId });
    
    if (!trackResponse.data) {
      return createTextResponse('Track not found', true);
    }
    
    const track = trackResponse.data;
    
    // Check if track requires premium access
    if (track.isPremium || track.streamConditions) {
      return createTextResponse(
        `This track requires special access conditions. Stream conditions: ${JSON.stringify(track.streamConditions)}`,
        true
      );
    }
    
    // Construct stream URL based on API pattern
    const baseUrl = 'https://discoveryprovider.audius.co/v1';
    const streamUrl = `${baseUrl}/tracks/${args.trackId}/stream`;
    
    return createTextResponse(`Stream URL: ${streamUrl}\n\nNote: This URL requires proper authentication headers if the track has access restrictions.`);
  } catch (error: any) {
    return createTextResponse(`Error getting stream URL: ${error.message}`, true);
  }
}
```

Update the toolset registration in `src/toolsets/index.ts`:

```typescript
// In the tracks toolset section, add:
trackTools.addReadTools(
  // ... existing tools ...
  createServerTool('get-track-stream-url', getTrackStreamUrlSchema, getTrackStreamUrl, true, 'Get stream URL for a track')
);
```

#### 3.2 Add Resolve Functionality

**File to create:** `src/tools/core.ts`

```typescript
import { z } from 'zod';
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
    
    return createMixedResponse(
      entityInfo,
      createResourceResponse(`audius://${entityType}/${entity.id}`, entity.name || entity.title || entity.playlistName, entity)
    );
  } catch (error: any) {
    return createTextResponse(`Error resolving URL: ${error.message}`, true);
  }
}

// Schema for get-sdk-version tool
export const getSdkVersionSchema = {
  type: 'object',
  properties: {},
};

// Handler for get-sdk-version
export async function getSdkVersion(
  args: {},
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    // Read from package.json
    const packageJson = require('../../package.json');
    const sdkVersion = packageJson.dependencies['@audius/sdk'];
    const mcpVersion = packageJson.version;
    
    return createTextResponse(`Audius SDK Version: ${sdkVersion}\nMCP Server Version: ${mcpVersion}`);
  } catch (error: any) {
    return createTextResponse(`Error getting SDK version: ${error.message}`, true);
  }
}
```

Create a new core toolset in `src/toolsets/index.ts`:

```typescript
// Import at the top
import {
  resolve, resolveSchema,
  getSdkVersion, getSdkVersionSchema
} from '../tools/core.js';

// Add after other toolsets (around line 300)
// 14. Core Toolset
const coreTools = new Toolset('core', 'Core Audius functionality');

coreTools.addReadTools(
  createServerTool('resolve', resolveSchema, resolve, true, 'Resolve Audius URLs to entities'),
  createServerTool('get-sdk-version', getSdkVersionSchema, getSdkVersion, true, 'Get SDK and server version info')
);

// Add to toolset group
toolsetGroup.addToolset(coreTools);
```

### 4. Missing Types Definition

**File to create:**
- `src/types/index.ts`

```typescript
// src/types/index.ts
export interface RequestHandlerExtra {
  signal?: AbortSignal;
  [key: string]: any;
}

export interface ToolHandler<T = any> {
  (params: T, extra?: RequestHandlerExtra): Promise<any>;
}
```

## Medium Priority Tasks

### 5. Bulk Operations

#### 5.1 Bulk Tracks

**File to modify:** `src/tools/tracks.ts`

Add this schema and handler:

```typescript
// Schema for get-bulk-tracks tool
export const getBulkTracksSchema = {
  type: 'object',
  properties: {
    trackIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of track IDs to fetch',
    },
  },
  required: ['trackIds'],
};

// Handler for get-bulk-tracks
export async function getBulkTracks(
  args: { trackIds: string[] },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    const client = AudiusClient.getInstance();
    const tracks = [];
    
    // SDK may not have bulk endpoint, so we fetch in parallel
    const trackPromises = args.trackIds.map(id => 
      client.tracks.getTrack({ trackId: id }).catch(err => ({
        error: true,
        trackId: id,
        message: err.message
      }))
    );
    
    const results = await Promise.all(trackPromises);
    
    let successCount = 0;
    let errorCount = 0;
    let trackInfo = 'Bulk Track Results:\n\n';
    
    results.forEach((result, index) => {
      if (result.error) {
        errorCount++;
        trackInfo += `❌ Track ${args.trackIds[index]}: ${result.message}\n`;
      } else if (result.data) {
        successCount++;
        const track = result.data;
        trackInfo += `✅ ${track.title} by ${track.user.name} (ID: ${track.id})\n`;
        tracks.push(track);
      }
    });
    
    trackInfo += `\nTotal: ${successCount} found, ${errorCount} errors`;
    
    return createTextResponse(trackInfo);
  } catch (error: any) {
    return createTextResponse(`Error fetching bulk tracks: ${error.message}`, true);
  }
}
```

#### 5.2 Bulk Users

**File to modify:** `src/tools/users.ts`

```typescript
// Schema for get-bulk-users tool
export const getBulkUsersSchema = {
  type: 'object',
  properties: {
    userIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of user IDs to fetch',
    },
  },
  required: ['userIds'],
};

// Handler for get-bulk-users
export async function getBulkUsers(
  args: { userIds: string[] },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    const client = AudiusClient.getInstance();
    
    const userPromises = args.userIds.map(id => 
      client.users.getUser({ id }).catch(err => ({
        error: true,
        userId: id,
        message: err.message
      }))
    );
    
    const results = await Promise.all(userPromises);
    
    let userInfo = 'Bulk User Results:\n\n';
    
    results.forEach((result) => {
      if (result.error) {
        userInfo += `❌ User ${result.userId}: ${result.message}\n`;
      } else if (result.data) {
        const user = result.data;
        userInfo += `✅ ${user.name} (@${user.handle}) - ${user.followerCount} followers (ID: ${user.id})\n`;
      }
    });
    
    return createTextResponse(userInfo);
  } catch (error: any) {
    return createTextResponse(`Error fetching bulk users: ${error.message}`, true);
  }
}
```

### 6. Parameter Naming Convention Fix

**Example migration for a single tool:**

Current (snake_case):
```typescript
export const getUserTracksSchema = {
  type: 'object',
  properties: {
    user_id: { type: 'string', description: 'User ID' },
    track_count: { type: 'number', description: 'Number of tracks' }
  }
};
```

Updated (camelCase):
```typescript
export const getUserTracksSchema = {
  type: 'object',
  properties: {
    userId: { type: 'string', description: 'User ID' },
    trackCount: { type: 'number', description: 'Number of tracks' }
  }
};

// Update handler to match:
export async function getUserTracks(
  args: { userId: string; trackCount?: number },
  extra?: RequestHandlerExtra
): Promise<any> {
  // Convert to SDK expected format if needed
  const response = await client.users.getUserTracks({ 
    id: args.userId,
    limit: args.trackCount 
  });
}
```

**Files that need parameter updates:**
- All files in `src/tools/*.ts`
- Focus on commonly used parameters:
  - `user_id` → `userId`
  - `track_id` → `trackId`
  - `playlist_id` → `playlistId`
  - `track_count` → `trackCount`
  - `play_count` → `playCount`
  - `follower_count` → `followerCount`

### 7. User Library Methods

**File to modify:** `src/tools/users.ts`

```typescript
// Schema for get-user-library-tracks
export const getUserLibraryTracksSchema = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      description: 'User ID to get library tracks for',
    },
    offset: {
      type: 'number',
      description: 'Offset for pagination',
    },
    limit: {
      type: 'number',
      description: 'Number of tracks to return',
    },
  },
  required: ['userId'],
};

// Handler for get-user-library-tracks
export async function getUserLibraryTracks(
  args: { userId: string; offset?: number; limit?: number },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    const client = AudiusClient.getInstance();
    
    // Get user's favorited tracks as library
    const response = await client.users.getUserFavorites({
      id: args.userId,
      offset: args.offset || 0,
      limit: args.limit || 20
    });
    
    if (!response.data || response.data.length === 0) {
      return createTextResponse('No tracks in user library');
    }
    
    let libraryInfo = `User Library Tracks (${response.data.length}):\n\n`;
    
    response.data.forEach((track: any, index: number) => {
      libraryInfo += `${index + 1}. ${track.title} by ${track.user.name}
   Duration: ${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}
   Added: ${track.favoriteCreatedAt || 'Unknown'}\n\n`;
    });
    
    return createTextResponse(libraryInfo);
  } catch (error: any) {
    return createTextResponse(`Error fetching library tracks: ${error.message}`, true);
  }
}

// Similar patterns for getUserLibraryAlbums and getUserLibraryPlaylists
```

## Low Priority Tasks

### 8. Additional User Methods

- getAuthorizedApps
- getConnectedWallets
- getDeveloperApps

### 9. Upload Enhancement

- Add buffer upload support (currently only URL upload is supported)

### 10. SDK Version Method

- Add getSdkVersion() to return current SDK version

## Implementation Order

1. Fix missing types (RequestHandlerExtra) - blocks other implementations
2. Implement Albums module - high user value
3. Add core resolve() functionality - enables URL-based access
4. Add streaming URL support - essential for playback
5. Fix parameter naming convention - improves SDK compatibility
6. Implement bulk operations - improves efficiency
7. Add OAuth module - enables authenticated operations
8. Implement remaining methods by priority

## Testing Each Implementation

After implementing each feature:
1. Run `npm run build` to ensure TypeScript compiles
2. Run `npm run lint` to check for linting errors
3. Test with the test client: `npm run test-client`
4. Update CHANGELOG.md with new features
5. Update README.md if new toolsets are added

## Summary of Missing SDK Methods by Priority

### Critical Missing Features (High Priority)
1. **Albums Module** - Entire module missing
   - getAlbum, getAlbumTracks, getUserAlbums
2. **OAuth Authentication** - Required for protected endpoints
   - login, verifyToken, makeRequestWithAuth
3. **Core Features**
   - resolve() - URL resolution
   - getTrackStreamUrl() - Streaming support

### Important Missing Features (Medium Priority)
1. **Bulk Operations** - Performance optimization
   - getBulkTracks, getBulkUsers, getBulkPlaylists
2. **User Library Methods** - Common user features
   - getLibraryTracks, getLibraryAlbums, getLibraryPlaylists
3. **Parameter Naming** - SDK compatibility
   - Convert snake_case to camelCase

### Nice-to-Have Features (Low Priority)
1. **Additional User Methods**
   - getAuthorizedApps, getConnectedWallets, getDeveloperApps
2. **Buffer Upload Support**
3. **SDK Version Method**

## Estimated Implementation Time

- High Priority: 2-3 days
- Medium Priority: 2-3 days  
- Low Priority: 1 day
- Testing & Documentation: 1 day

**Total: ~1 week for full SDK parity**

## Next Steps

1. Start with creating the missing types file (✅ Done)
2. Implement Albums module as it's a complete feature set
3. Add core resolve() and streaming functionality
4. Work through medium priority items for better SDK compatibility
5. Address low priority items as time permits