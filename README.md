# @glassbead/mcp-audius

An MCP (Model Context Protocol) server that provides streamlined access to the Audius music platform. This package enables AI assistants and applications to interact with Audius through a clean, efficient interface focused on core music functionality.

## Installation

```bash
npm install @glassbead/mcp-audius
```

## Configuration

Configure the MCP server in your client's settings:

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-audius": {
      "command": "npx",
      "args": ["@glassbead/mcp-audius"],
      "env": {
        "AUDIUS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### VSCode

Add to your MCP settings file:

```json
{
  "mcpServers": {
    "mcp-audius": {
      "command": "npx",
      "args": ["@glassbead/mcp-audius"],
      "env": {
        "AUDIUS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required:
- `AUDIUS_API_KEY`: Your Audius API key (obtain from Audius)

## Features

### Track Operations
- Search tracks with filtering and sorting
- Get track details and metadata
- Stream tracks with efficient caching
- Manage track favorites
- Access track comments
- Get trending tracks with pagination

### User Operations
- Get user profiles and details
- Search for users
- Follow/unfollow functionality
- View user's tracks, favorites, and reposts
- Get user followers and following
- Access trending users

### Playlist & Album Management
- Access playlist details and tracks
- View album information
- Get trending playlists
- Manage playlist favorites

### Performance Features
- Efficient LRU caching system for stream URLs
- Automatic cache cleanup and monitoring
- Connection tracking and rate limiting
- Graceful shutdown support

## Performance Considerations

### Batch Request Limits
⚠️ **Important:** Requesting more than 10 tracks or playlists at once may result in extended wait times. For optimal performance:
- Limit batch requests to 10 or fewer items
- Utilize pagination for larger datasets
- Consider using the caching system for frequently accessed content

### Caching Behavior
The server implements an LRU (Least Recently Used) cache for stream URLs with:
- Automatic TTL-based expiration
- Memory usage optimization
- Built-in monitoring and statistics

### Streaming Server
- Default port: 3333 (configurable)
- Rate limiting: 60 requests/minute
- Range request support for seeking
- Proper CORS configuration

## Development

### Building from Source

```bash
git clone https://github.com/glassBead-tc/audius-mcp.git
cd audius-mcp
npm install
npm run build
```

### Running Tests

```bash
npm test
```

## Documentation

- [CHANGELOG.md](CHANGELOG.md) - Detailed version history and changes
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guidelines for contributing

## Version Information

Current version: 1.3.3

Notable changes in recent versions:
- Added performance warning prompts
- Improved streaming reliability
- Enhanced caching system
- Removed blockchain/financial features to focus on core music experience

## License

MIT
