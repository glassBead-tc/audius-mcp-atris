# @modelcontextprotocol/audius-mcp
[![smithery badge](https://smithery.ai/badge/@glassBead-tc/audius-mcp)](https://smithery.ai/server/@glassBead-tc/audius-mcp)

An MCP (Model Context Protocol) server for interacting with the Audius API. This package provides a set of tools to query and interact with Audius music platform data through the Model Context Protocol.

## Installation

### Installing via Smithery

To install Audius MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@glassBead-tc/audius-mcp):

```bash
npx -y @smithery/cli install @glassBead-tc/audius-mcp --client claude
```

### Manual Installation
```bash
npm install -g @modelcontextprotocol/audius-mcp
```

Or use directly with npx:

```bash
npx @modelcontextprotocol/audius-mcp
```

## Features

- User Operations
  - Get user details
  - Search users
  - Get user tracks, reposts, followers, and following
  - Get user tags

- Track Operations
  - Get track details
  - Search tracks
  - Get trending tracks
  - Stream tracks
  - Get track access info and technical details
  - Get track stems and top listeners

- Playlist Operations
  - Get playlist details
  - Search playlists
  - Get playlist tracks
  - Get playlist access info

- Additional Features
  - Tips information
  - Developer app details
  - URL resolution

## Usage

This package is designed to be used with MCP-compatible clients. Once installed, it can be referenced in your MCP configuration:

```json
{
  "mcpServers": {
    "audius": {
      "command": "audius-mcp"
    }
  }
}
```

### Available Tools

Here are some example tool calls:

```typescript
// Search for tracks
await client.useMcpTool("audius", "search-tracks", {
  query: "Jungle"
});

// Get trending tracks
await client.useMcpTool("audius", "get-trending-tracks", {
  genre: "Glitch Hop"
});

// Get user details
await client.useMcpTool("audius", "get-user-by-handle", {
  handle: "Whaskii"
});
```

## Development

To build from source:

```bash
git clone <repository-url>
cd audius-mcp
npm install
npm run build
```

## License

MIT
