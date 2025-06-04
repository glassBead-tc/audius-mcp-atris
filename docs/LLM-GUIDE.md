# Audius MCP Guide for Large Language Models

This document provides a comprehensive guide for Large Language Models (LLMs) to effectively interact with the Audius Model Context Protocol (MCP) server. This server provides access to the Audius music platform, allowing AI models to search for music, manage playlists, interact with artists, and more.

## Core Concepts

The Audius MCP exposes three types of capabilities:

1. **Tools**: Individual functions that perform specific actions (e.g., searching for tracks, getting user details)
2. **Resources**: Structured data representations for Audius entities (tracks, users, playlists, albums)
3. **Prompts**: Guided experiences that help AI models provide comprehensive responses involving multiple steps

## Suggested Usage Patterns

### Search and Discovery

To help users discover music on Audius:

1. Use the `search-tracks`, `search-users`, or `search-all` tools for basic keyword search
2. For more targeted discovery:
   - `advanced-search` allows filtering by genre, mood, BPM range, etc.
   - `trending-discovery` finds popular content, optionally filtered by genre
   - `similar-artists` finds artists similar to a specified user

For a guided experience, use the `discover-music` prompt, which orchestrates multiple search tools.

```json
{
  "name": "discover-music",
  "arguments": {
    "genre": "Electronic",
    "artist": "Skrillex",
    "mood": "Energetic",
    "underground": true
  }
}
```

### Artist and Track Information

To provide detailed information about tracks or artists:

1. Use `get-track` to retrieve detailed track information
2. Use `get-user` to retrieve artist/user information
3. Use `get-track-comments` to see what others are saying about a track

For comprehensive artist analysis, use the `artist-profile` prompt:

```json
{
  "name": "artist-profile",
  "arguments": {
    "userId": "123456",
    "includeConnections": true,
    "includePopularContent": true
  }
}
```

### Content Creation and Management

To help users manage their music content on Audius:

1. Use `upload-track` to publish a new track
2. Use `create-playlist` to make a new playlist or album
3. Use `add-tracks-to-playlist` to populate playlists with tracks

Guided experiences available:
- `music-creation` prompt for track publication workflows
- `playlist-creation` prompt for playlist curation workflows

### Social Interaction

To facilitate social connections on Audius:

1. Use social tools like `user-followers`, `user-following`, `is-following`
2. Use engagement tools like `user-favorites`, `track-favorites`
3. Use messaging tools like `send-message`, `get-messages`

### Blockchain and Monetization

To help users with blockchain aspects of Audius:

1. Use `user-wallets` to get wallet information
2. Use `transaction-history` to show past transactions
3. Use `track-access-gates` to check access controls
4. Use `send-tip` to facilitate tipping artists

Guided experiences:
- `blockchain` prompt for wallet and token management
- `monetization` prompt for NFTs, purchases, and tipping

## Working with Resources

Resources provide detailed information about Audius entities. They follow URIs like:

- `audius://track/{id}` - For tracks
- `audius://user/{id}` - For users/artists
- `audius://playlist/{id}` - For playlists
- `audius://album/{id}` - For albums

When you receive a resource URI from a tool response, you can access the full resource data with it.

## Tips for Effective Responses

1. **Provide direct links**: When mentioning tracks or artists, include both their names and IDs so users can easily find them.

2. **Combine multiple tools**: For comprehensive answers, chain multiple tools together. For example, search for tracks, then get details about the top result, then check if the user is following the artist.

3. **Use resource references**: When possible, reference resources by their URI to provide consistent, structured data.

4. **Be specific with recommendations**: Instead of general suggestions, use the search tools to provide specific track names, artist names, and reasons for recommending them.

5. **Handle failures gracefully**: If a tool returns an error, try alternative approaches or be transparent about limitations.

## Common Workflow Examples

### Music Discovery Workflow

```
1. Use search-tracks or advanced-search to find tracks matching user keywords
2. Get detailed information about top results with get-track
3. Find similar artists using similar-artists
4. Suggest a variety of tracks from search results and similar artists
```

### Artist Analysis Workflow

```
1. Get artist information with get-user
2. Get the artist's tracks with get-user-tracks
3. Get social metrics (followers, engagement) with user-followers
4. Compile insights about the artist's style, popularity, and standout tracks
```

### Playlist Creation Workflow

```
1. Search for tracks matching a theme using advanced-search
2. Create a new playlist with create-playlist
3. Add the tracks to the playlist with add-tracks-to-playlist
4. Optionally reorder the tracks with reorder-playlist-tracks
```

### Music Analytics Workflow

```
1. Get listen counts for a track with track-listen-counts
2. Get top listeners with track-top-listeners
3. Get listener insights with track-listener-insights
4. Analyze trends and patterns in the listening data
```

## Reference: Key Tools by Category

### Search & Discovery
- `search-tracks`: Search for tracks by keyword
- `search-users`: Search for users by keyword
- `search-all`: Search across all content types
- `advanced-search`: Search with filters (genre, mood, BPM)
- `trending-discovery`: Get trending tracks
- `similar-artists`: Find similar artists

### Content Information
- `get-track`: Get track details
- `get-user`: Get user details
- `get-playlist`: Get playlist details
- `get-album`: Get album details
- `get-track-comments`: Get comments on a track

### Social Engagement
- `user-favorites`: Get tracks favorited by a user
- `user-reposts`: Get content reposted by a user
- `user-followers`: Get followers of a user
- `user-following`: Get users followed by a user
- `is-following`: Check if a user follows another user

### Content Creation
- `upload-track`: Upload a new track
- `update-track`: Update an existing track
- `delete-track`: Delete a track
- `add-track-comment`: Add a comment to a track
- `delete-track-comment`: Delete a comment

### Playlist Management
- `create-playlist`: Create a new playlist
- `update-playlist`: Update a playlist
- `delete-playlist`: Delete a playlist
- `add-tracks-to-playlist`: Add tracks to a playlist
- `remove-track-from-playlist`: Remove a track
- `reorder-playlist-tracks`: Reorder tracks in a playlist

### Messaging
- `send-message`: Send a direct message
- `get-messages`: Get messages between users
- `get-message-threads`: Get message threads
- `mark-message-read`: Mark a message as read

### Analytics
- `track-listen-counts`: Get listen counts for a track
- `user-track-listen-counts`: Get listen counts for a user's tracks
- `track-top-listeners`: Get top listeners for a track
- `track-listener-insights`: Get listener insights for a track
- `user-play-metrics`: Get aggregate play metrics for a user

### Blockchain & Monetization
- `user-wallets`: Get wallet information for a user
- `transaction-history`: Get transaction history
- `token-balance`: Get token balance for a wallet
- `track-access-gates`: Get access gates for a track
- `check-nft-access`: Check NFT-gated access
- `send-tip`: Send a tip to a user

### Notifications
- `get-notifications`: Get notifications for a user
- `notification-settings`: Get notification settings
- `update-notification-settings`: Update notification settings
- `mark-notifications-read`: Mark notifications as read