# Audius JavaScript SDK Guide

## Table of Contents
1. [Installation](#installation)
2. [Initialization](#initialization)
3. [Read Operations](#read-operations)
4. [Write Operations](#write-operations)
5. [OAuth](#oauth)
6. [Browser Usage](#browser-usage)
7. [Examples](#examples)

## Installation

```bash
npm install @audius/sdk
```

Requires Node 18+.

## Initialization

```typescript
import { sdk } from '@audius/sdk'

// Read-only (API Key only)
const audiusSdk = sdk({
  apiKey: 'YOUR_API_KEY'
})

// Read + Write (API Key + Secret, server-side only)
const audiusSdk = sdk({
  apiKey: 'YOUR_API_KEY',
  apiSecret: 'YOUR_API_SECRET'
})
```

**Never expose `apiSecret` on the frontend.** Write operations must happen server-side.

## Read Operations

```typescript
// Search tracks
const results = await audiusSdk.tracks.searchTracks({ query: 'electronic' })

// Get trending tracks
const trending = await audiusSdk.tracks.getTrendingTracks()

// Get a specific track
const track = await audiusSdk.tracks.getTrack({ trackId: 'TRACK_ID' })

// Get user profile
const user = await audiusSdk.users.getUser({ id: 'USER_ID' })

// Get user's tracks
const tracks = await audiusSdk.users.getTracksByUser({ id: 'USER_ID' })

// Get playlist
const playlist = await audiusSdk.playlists.getPlaylist({ playlistId: 'PLAYLIST_ID' })
```

## Write Operations

Require API Secret. Server-side only.

```typescript
// Upload a track
await audiusSdk.tracks.uploadTrack({
  // track metadata and file
})

// Favorite a track
await audiusSdk.tracks.favoriteTrack({ trackId: 'TRACK_ID' })

// Repost a track
await audiusSdk.tracks.repostTrack({ trackId: 'TRACK_ID' })
```

## OAuth

"Log in with Audius" enables user authentication:

1. Redirect users to Audius OAuth endpoint
2. User authorizes your app
3. Receive auth token for user-scoped operations

See https://docs.audius.co for the full OAuth flow documentation.

## Browser Usage

The SDK can be loaded via CDN for browser-based projects. See the npm package page for CDN URLs and browser-specific initialization.

## Examples

The GitHub examples repo (https://github.com/AudiusProject/apps) includes runnable examples for:
- Trending tracks display
- Audio playback
- OAuth authentication flow
- Profile updates
- File uploads
- Geo-gated streaming

## Scaffolding a New Project

The fastest start:

```bash
npx create-audius-app my-app
cd my-app
npm start
```

This creates a TypeScript/React app with the Audius SDK pre-configured and working examples.
