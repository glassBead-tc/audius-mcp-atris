# Audius MCP Testing Plan

## Track Tools Testing

### 1. Search Tracks
- **Test Query**: Search for electronic music tracks
- **Expected Result**: List of tracks matching the query
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "search-tracks",
    "arguments": {
      "query": "electronic",
      "limit": 5
    }
  }
}
```

### 2. Get Track
- **Test Query**: Retrieve details for a specific track using ID from search results
- **Expected Result**: Detailed information about the track
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "get-track",
    "arguments": {
      "id": "[TRACK_ID]"
    }
  }
}
```

### 3. Get Trending Tracks
- **Test Query**: Retrieve currently trending tracks
- **Expected Result**: List of trending tracks
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "get-trending-tracks",
    "arguments": {
      "limit": 5
    }
  }
}
```

### 4. Upload Track (Authorization Required)
- **Test Query**: Upload a new track
- **Expected Result**: Confirmation of upload with new track ID
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "upload-track",
    "arguments": {
      "title": "Test Track",
      "genre": "Electronic",
      "mood": "Energetic",
      "file": "[FILE_DATA]"
    }
  }
}
```

### 5. Update Track (Authorization Required)
- **Test Query**: Update track metadata
- **Expected Result**: Confirmation of update
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "update-track",
    "arguments": {
      "id": "[TRACK_ID]",
      "title": "Updated Track Title"
    }
  }
}
```

## User Tools Testing

### 1. Search Users
- **Test Query**: Search for artists by name
- **Expected Result**: List of users matching the query
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "search-users",
    "arguments": {
      "query": "electronic artist",
      "limit": 5
    }
  }
}
```

### 2. Get User
- **Test Query**: Retrieve user profile using ID from search results
- **Expected Result**: Detailed information about the user
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "get-user",
    "arguments": {
      "id": "[USER_ID]"
    }
  }
}
```

### 3. Get User Tracks
- **Test Query**: Retrieve tracks uploaded by a specific user
- **Expected Result**: List of tracks by the user
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "get-user-tracks",
    "arguments": {
      "userId": "[USER_ID]",
      "limit": 5
    }
  }
}
```

### 4. Follow User (Authorization Required)
- **Test Query**: Follow a user
- **Expected Result**: Confirmation of following
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "follow-user",
    "arguments": {
      "userId": "[USER_ID]"
    }
  }
}
```

## Playlist Tools Testing

### 1. Get Playlist
- **Test Query**: Retrieve details for a specific playlist
- **Expected Result**: Detailed information about the playlist and its tracks
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "get-playlist",
    "arguments": {
      "id": "[PLAYLIST_ID]"
    }
  }
}
```

### 2. Create Playlist (Authorization Required)
- **Test Query**: Create a new playlist
- **Expected Result**: Confirmation with new playlist ID
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "create-playlist",
    "arguments": {
      "name": "Test Playlist",
      "description": "A playlist created for testing"
    }
  }
}
```

### 3. Add Tracks to Playlist (Authorization Required)
- **Test Query**: Add tracks to an existing playlist
- **Expected Result**: Confirmation of tracks added
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "add-tracks-to-playlist",
    "arguments": {
      "playlistId": "[PLAYLIST_ID]",
      "trackIds": ["[TRACK_ID_1]", "[TRACK_ID_2]"]
    }
  }
}
```

## Social Tools Testing

### 1. Get Comments
- **Test Query**: Retrieve comments for a specific track
- **Expected Result**: List of comments on the track
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "get-comments",
    "arguments": {
      "trackId": "[TRACK_ID]",
      "limit": 10
    }
  }
}
```

### 2. Add Comment (Authorization Required)
- **Test Query**: Add a comment to a track
- **Expected Result**: Confirmation with new comment ID
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "add-comment",
    "arguments": {
      "trackId": "[TRACK_ID]",
      "comment": "This is a test comment"
    }
  }
}
```

### 3. Favorite Track (Authorization Required)
- **Test Query**: Favorite a track
- **Expected Result**: Confirmation of favoriting
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "favorite-track",
    "arguments": {
      "trackId": "[TRACK_ID]"
    }
  }
}
```

## Analytics Tools Testing

### 1. Get Listen Counts
- **Test Query**: Retrieve listen counts for a specific track
- **Expected Result**: Listen count data
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "get-listen-counts",
    "arguments": {
      "trackId": "[TRACK_ID]"
    }
  }
}
```

### 2. Top Listeners
- **Test Query**: Retrieve top listeners for a track or artist
- **Expected Result**: List of top listeners
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "top-listeners",
    "arguments": {
      "trackId": "[TRACK_ID]",
      "limit": 5
    }
  }
}
```

## Monetization Tools Testing

### 1. Get Premium Content
- **Test Query**: List premium content from an artist
- **Expected Result**: List of premium tracks/content
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "get-premium-content",
    "arguments": {
      "artistId": "[USER_ID]"
    }
  }
}
```

### 2. Purchase Track (Authorization Required)
- **Test Query**: Purchase a premium track
- **Expected Result**: Confirmation of purchase
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "purchase-track",
    "arguments": {
      "trackId": "[TRACK_ID]"
    }
  }
}
```

## Blockchain Tools Testing

### 1. Get Wallet Balance
- **Test Query**: Check wallet balance
- **Expected Result**: Balance information
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "get-wallet-balance",
    "arguments": {
      "userId": "[USER_ID]"
    }
  }
}
```

### 2. Transfer Tokens (Authorization Required)
- **Test Query**: Transfer tokens to another user
- **Expected Result**: Confirmation of transfer
- **Command Example**:
```javascript
{
  "method": "call_tool",
  "params": {
    "name": "transfer-tokens",
    "arguments": {
      "recipient": "[USER_ID]",
      "amount": 10
    }
  }
}
```

## Testing Workflow

1. Start with non-authenticated tests first:
   - Search functionality
   - Retrieving public data (tracks, users, playlists)
   - Analytics queries

2. If authentication is available, test authenticated operations:
   - Creating/updating content
   - Social interactions
   - Monetization features
   - Blockchain operations

3. Document any errors or inconsistencies between expected and actual results

4. Test edge cases:
   - Searching with unusual characters
   - Requesting non-existent IDs
   - Using maximum limits