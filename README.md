# @glassbead/mcp-audius

<img src="https://badge.mcpx.dev" title="MCP"/>

An MCP (Model Context Protocol) server for comprehensive interaction with the Audius API. This package provides a rich set of tools to query and interact with the Audius music platform through the Model Context Protocol.

## Configuration

This MCP server is designed to be used with MCP-compatible clients like Claude Desktop. Configure it in your client's settings file:

### Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcp-audius": {
      "command": "npx",
      "args": ["@glassbead/mcp-audius"],
      "env": {
        "AUDIUS_API_KEY": "your-api-key",
        "AUDIUS_AUTH_SECRET": "your-auth-secret"
      }
    }
  }
}
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `AUDIUS_API_KEY`: Your Audius API key

Optional variables:
- `AUDIUS_AUTH_SECRET`: Your Audius authentication secret - some features may be limited without this

## Features

### User Operations
- Get user details by ID or handle
- Search for users
- Follow/unfollow users
- Get user followers and following
- Get trending users
- Get related artists
- Get user tracks with sorting and filtering
- Get user favorites and reposts
- Get user's extended profile data

### Track Operations
- Get track details
- Get track streaming URLs
- Search tracks
- Get trending tracks
- Favorite/unfavorite tracks
- Get track comments
- Get track extended data
- Get track top listeners
- Get track price information
- Purchase tracks using USDC
- Verify track purchases

### Playlist Operations
- Get playlist details
- Get playlist tracks
- Get trending playlists
- Search playlists
- Favorite/unfavorite playlists

### Album Operations
- Get album details
- Get album tracks
- Favorite/unfavorite albums

### Wallet & Financial Operations
- Connect wallets (ETH/Solana)
- Get wallet information
- Get user token balances
- Initialize user banks
- Send tips using wAUDIO
- Get tip history
- Add and get tip reactions

### Challenge Operations
- Get undisbursed challenges
- Get user challenges

### Additional Features
- URL resolution
- Comment management
- Extended data access

## Development

To build from source:

```bash
git clone https://github.com/glassBead-tc/audius-mcp.git
cd audius-mcp
npm install
npm run build
```

## License

MIT
