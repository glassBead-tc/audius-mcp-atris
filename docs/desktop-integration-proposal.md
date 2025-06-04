# Desktop Integration Proposal

## Simple Solution: Leverage Existing Desktop Apps

Since users will have Audius Desktop (or other media players), we should focus on making it easy to play tracks using those existing applications.

## Current State
- We provide stream URLs via `get-track-stream-url`
- Users must manually copy/paste URLs

## Proposed Improvements

### 1. Generate Deep Links
Instead of just stream URLs, provide Audius Desktop deep links:
```
audius://track/[trackId]
audius://playlist/[playlistId]
audius://user/[userId]
```

These would open directly in Audius Desktop when clicked (if supported).

### 2. Create Platform-Specific Commands
Provide ready-to-copy commands for different platforms:

**macOS:**
```bash
open "https://audius.co/track/123"  # Opens in default browser/app
open -a "Audius Desktop" "https://audius.co/track/123"  # Opens specifically in Audius Desktop
```

**Windows:**
```cmd
start https://audius.co/track/123
```

**Linux:**
```bash
xdg-open "https://audius.co/track/123"
```

### 3. Generate Playlist Files
Create .m3u or .pls playlist files that users can open in any media player:
```
#EXTM3U
#EXTINF:240,Artist Name - Track Title
https://discoveryprovider.audius.co/v1/tracks/123/stream
```

### 4. Provide Multiple Format Options
When users request to play a track, give them options:
- Audius Desktop deep link
- Direct stream URL
- Platform-specific open command
- Playlist file content

## Implementation

Update the `get-track-stream-url` tool to return multiple formats:

```typescript
Track: "Song Title" by Artist Name

1. Open in Audius Desktop:
   audius://track/123

2. Direct stream URL:
   https://discoveryprovider.audius.co/v1/tracks/123/stream

3. Open command (copy and run in terminal):
   macOS/Linux: open "https://audius.co/track/123"
   Windows: start https://audius.co/track/123

4. Save as playlist file (copy to a .m3u file):
   #EXTM3U
   #EXTINF:240,Artist Name - Song Title
   https://discoveryprovider.audius.co/v1/tracks/123/stream
```

This way, users can choose the method that works best for their setup.