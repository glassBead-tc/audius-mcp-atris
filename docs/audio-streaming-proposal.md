# Audio Streaming Proposal for Claude Desktop

## The Challenge
Audius is a music streaming platform, but MCP servers typically only exchange JSON data. Without audio playback, we're missing the core functionality.

## Potential Solutions

### 1. Resource Blob Approach (Most Promising)
MCP resources support a `blob` field that can contain base64-encoded binary data. We could:

```typescript
// In theory, we could serve audio as a resource:
{
  type: "resource",
  resource: {
    uri: "audius://track/123/audio",
    mimeType: "audio/mpeg",
    blob: base64EncodedAudioData
  }
}
```

**Challenges:**
- Would Claude Desktop recognize and play audio MIME types?
- Base64 encoding increases size by ~33%
- Entire track must be loaded into memory
- Would need to fetch and encode audio data from Audius

### 2. Progressive Audio Resource
Instead of loading entire tracks, we could:
- Provide 30-second preview clips
- Serve audio in chunks using multiple resources
- Use lower bitrate for smaller file sizes

### 3. External Player Integration
Create a companion web app that:
- Receives commands from the MCP server
- Plays audio in a browser
- Could be opened via a tool that returns a URL with session token

### 4. Browser Extension Approach
Build a browser extension that:
- Detects Audius URLs in Claude Desktop
- Automatically embeds a player
- Handles streaming directly from Audius

## Recommended Approach

**Short term:** Test if Claude Desktop supports audio resources
1. Implement a `get-track-preview` tool that returns audio blob
2. Start with small clips (10-30 seconds)
3. Test with different audio formats (MP3, OGG, WAV)

**Long term:** External player integration
1. Build a simple web player that accepts track IDs
2. Generate temporary auth tokens
3. Return player URLs from MCP tools

## Implementation Steps

1. **Test Audio Resource Support**
   ```typescript
   export const getTrackPreview = async (args: { trackId: string }) => {
     // Fetch audio stream from Audius
     const audioUrl = `https://discoveryprovider.audius.co/v1/tracks/${args.trackId}/stream`;
     const audioResponse = await fetch(audioUrl);
     const audioBuffer = await audioResponse.arrayBuffer();
     const base64Audio = Buffer.from(audioBuffer).toString('base64');
     
     return {
       type: "resource",
       resource: {
         uri: `audius://track/${args.trackId}/preview`,
         mimeType: "audio/mpeg",
         blob: base64Audio
       }
     };
   };
   ```

2. **Test in Claude Desktop**
   - See if audio resources are recognized
   - Check if any audio player UI appears
   - Test different MIME types

3. **Fallback Plan**
   If audio resources aren't supported, implement the external player approach

## Questions to Answer

1. Does Claude Desktop support audio/mpeg MIME types in resources?
2. Is there a size limit for resource blobs?
3. Would Anthropic consider adding audio playback support?
4. Can we stream chunks progressively or must it be all at once?

## Next Steps

The first step is to implement a simple test to see if Claude Desktop can handle audio resources. If not, we'll need to pursue the external player approach.