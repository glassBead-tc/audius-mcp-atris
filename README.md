# Audius MCP Server

An MCP (Model Context Protocol) server that provides access to the Audius music platform via LLMs (Large Language Models).

## Features

- **Tools**: Query tracks, users, playlists, albums, and perform searches on Audius
- **Resources**: Access track, user, playlist, and album data as resources
- **Prompts**: Use prompt templates for music discovery and track analysis

## Prerequisites

- Node.js 16 or higher
- An Audius API key (optional, but recommended for production use)

## Installation

1. Clone this repository:
```
git clone https://github.com/yourusername/audius-mcp.git
cd audius-mcp
```

2. Install dependencies:
```
npm install
```

3. Build the TypeScript code:
```
npm run build
```

## Configuration

Create a `.env` file in the root directory based on the provided `.env.example`:

```
# Audius API Configuration
AUDIUS_API_KEY=your_api_key_here
AUDIUS_API_SECRET=your_api_secret_here
AUDIUS_ENVIRONMENT=production # or staging, development

# MCP Server Configuration
SERVER_NAME=audius-mcp
SERVER_VERSION=1.0.0
```

## Usage

### Running the Server

Start the server:

```
npm start
```

For development with automatic rebuilding:

```
npm run dev
```

### Connecting to Claude for Desktop

To use this server with Claude for Desktop:

1. Install [Claude for Desktop](https://claude.ai/download)
2. Open Claude's configuration: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
3. Add the following configuration:

```json
{
  "mcpServers": {
    "audius": {
      "command": "node",
      "args": [
        "/path/to/audius-mcp/build/index.js"
      ],
      "env": {
        "AUDIUS_API_KEY": "your_api_key_here",
        "AUDIUS_API_SECRET": "your_api_secret_here"
      }
    }
  }
}
```

4. Restart Claude for Desktop

### Available Tools

The server provides the following tools:

#### Track Tools
- `get-track`: Get detailed track information by ID
- `search-tracks`: Search for tracks with various filters
- `get-trending-tracks`: Get trending tracks
- `get-track-comments`: Get comments for a track

#### User Tools
- `get-user`: Get user profile by ID
- `search-users`: Search for users
- `get-user-tracks`: Get tracks uploaded by a user

#### Playlist & Album Tools
- `get-playlist`: Get playlist details
- `get-album`: Get album details

#### Search Tools
- `search-all`: Search across tracks, users, playlists, and albums

### Resources

Access Audius data using these URI templates:

- `audius://track/{id}`: Track details by ID
- `audius://user/{id}`: User profile by ID
- `audius://playlist/{id}`: Playlist details by ID
- `audius://album/{id}`: Album details by ID

### Prompts

Use these prompt templates for common music-related tasks:

- `discover-music`: Get music recommendations based on genre, artist, and mood preferences
- `track-analysis`: Analyze a track's characteristics and get insights

## Development

### Project Structure

```
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # MCP server setup
│   ├── config.ts         # Configuration handling
│   ├── sdk-client.ts     # Audius SDK client wrapper
│   ├── tools/            # MCP tool implementations
│   │   ├── tracks.ts     # Track-related tools
│   │   ├── users.ts      # User-related tools
│   │   ├── playlists.ts  # Playlist-related tools
│   │   └── search.ts     # Search-related tools
│   ├── resources/        # MCP resource implementations
│   │   ├── tracks.ts     # Track-related resources
│   │   ├── users.ts      # User-related resources
│   │   └── playlists.ts  # Playlist-related resources
│   └── prompts/          # MCP prompt implementations
│       ├── music-search.ts  # Music search prompts
│       └── track-info.ts    # Track info prompts
```

### Testing

For local development testing:

1. Install the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):
```
npm install -g @modelcontextprotocol/inspector
```

2. Run the inspector with your server:
```
npx @modelcontextprotocol/inspector node ./build/index.js
```

## License

MIT