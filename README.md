# Atris MCP for Audius (v2.3.0)

> **Note:** Version 2.3.0+ uses the Smithery SDK for improved HTTP transport support while maintaining full backward compatibility with STDIO transport for local development.

An MCP (Model Context Protocol) server that provides comprehensive access to the Audius music platform via LLMs (Large Language Models), with 105 tools covering ~95% of the Audius Protocol API.

## Features

- **Tools**: Access tracks, users, playlists, albums, and perform searches on Audius
- **Track Media Operations**: Download tracks, inspect technical details, access stems
- **User Relationships**: Discover track purchasers, remixers, and related artists
- **Enhanced Discovery**: Personalized recommendations, user history, trending by genre
- **Content Creation**: Upload tracks, create playlists, manage your Audius content
- **Social Features**: Follow users, favorite tracks, comment on content
- **Monetization**: Access premium content, purchase tracks, send tips to artists
- **Analytics**: Track play counts, trending data, and listener insights
- **Resources**: Access track, user, playlist, and album data as structured resources
- **Prompts**: Use guided experiences for music discovery, curation, and analysis

## Natural Language Capabilities

With Atris MCP, you can ask your LLM questions in natural language about Audius content. Examples include:

### Music Discovery
- "Find me electronic tracks with a high BPM"
- "What are the trending tracks in the hip-hop genre this week?"
- "Recommend artists similar to [artist name]"
- "Help me discover underground artists in the jazz genre"
- "Find tracks with a relaxing mood for a meditation playlist"

### Artist Information
- "Tell me about the artist [name]"
- "Who are the most popular followers of [artist]?"
- "What tracks has [artist] released recently?"
- "Show me the analytics for [artist]'s most popular tracks"
- "Which artists are similar to [artist name]?"

### Playlist Management
- "Create a playlist of upbeat electronic tracks"
- "Add the top trending hip-hop tracks to my workout playlist"
- "Remove track [title] from my playlist [name]"
- "Reorder my playlist to create a better flow between songs"
- "Help me curate a playlist for a party"

### Track Analysis
- "Analyze the listener demographics for [track]"
- "Who are the top fans of [track]?"
- "How is [track] performing compared to other tracks in its genre?"
- "What's the listening trend for [track] over the past month?"
- "Show me the engagement metrics for [track]"

### Content Monetization
- "Set up NFT gating for my new track"
- "How much should I charge for my premium content?"
- "Show me my tipping history and stats"
- "Analyze my revenue streams across the platform"
- "Help me understand the purchase options for [content]"

### Social & Community Interactions
- "Find fans who frequently engage with my music"
- "Show me comments on my latest track"
- "Help me compose a message to collaborate with [artist]"
- "Who should I follow to grow my network in the [genre] scene?"
- "Analyze my social engagement and suggest improvements"
- "Find the most supportive fans who've tipped me"
- "Track my notification history and prioritize important ones"

### Workflow Automation & Creative Assistance
- "Plan my next track release with a marketing timeline"
- "Automate weekly playlist updates based on my listening habits"
- "Schedule content announcements for optimal engagement"
- "Generate descriptive tags for my new ambient track"
- "Compare my genre categorization to similar artists"
- "Suggest a pricing strategy based on my existing catalog performance"
- "Help me craft an engaging artist bio for my profile"

## Prerequisites

- Node.js 18 or higher (required for ES modules support)
- An Audius API key (optional, but recommended for production use)

## Changelog

### v2.3.0 - Smithery SDK Integration
- **New**: Integrated Smithery SDK for improved HTTP transport
- **New**: Stateful and stateless HTTP server modes
- **New**: Runtime configuration via Zod schema validation
- **New**: Session management for HTTP connections
- **Improved**: Type safety and error handling
- **Fixed**: ES module compatibility issues
- **Breaking**: Node.js 18+ now required (was 16+)

## Installation

### NPM Installation (Recommended)

Install directly from npm:

```
npm install audius-mcp-atris
```

Or with yarn:

```
yarn add audius-mcp-atris
```

### Manual Installation

1. Clone this repository:
```
git clone https://github.com/glassBead/audius-mcp-atris.git
cd audius-mcp-atris
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

### Connecting to Claude

To use this server with Claude:

1. Install [Claude for Desktop](https://claude.ai/download) or [Claude CLI](https://github.com/anthropics/claude-cli)

### NPX Installation (Recommended)

The easiest way to use this MCP server is with npx, which can run the package without installing it globally:

#### For Claude CLI:
```bash
claude mcp add audius npx audius-mcp-atris
```

#### For Claude Desktop:
Edit your `claude_mcp_config.json` file (location varies by platform):

- **macOS**: `~/Library/Application Support/Claude/claude_mcp_config.json`
- **Windows**: `%APPDATA%\Claude\claude_mcp_config.json`
- **Linux**: `~/.config/Claude/claude_mcp_config.json`

Add this configuration:
```json
{
  "mcpServers": {
    "audius": {
      "command": "npx",
      "args": [
        "audius-mcp-atris"
      ],
      "env": {
        "AUDIUS_API_KEY": "your_api_key_here",
        "AUDIUS_API_SECRET": "your_api_secret_here"
      }
    }
  }
}
```

#### For Other LLM Applications:
For applications that support Model Context Protocol, use this configuration in their respective config files:

```json
{
  "audius": {
    "command": "npx",
    "args": [
      "audius-mcp-atris"
    ],
    "env": {
      "AUDIUS_API_KEY": "your_api_key_here",
      "AUDIUS_API_SECRET": "your_api_secret_here"
    }
  }
}
```

### Local Installation Method

If you prefer a local installation:

```bash
# Install the package globally
npm install -g audius-mcp-atris

# Then configure Claude CLI
claude mcp add audius audius-mcp-atris

# Or for Claude Desktop, use this in your config:
{
  "mcpServers": {
    "audius": {
      "command": "audius-mcp-atris",
      "env": {
        "AUDIUS_API_KEY": "your_api_key_here",
        "AUDIUS_API_SECRET": "your_api_secret_here"
      }
    }
  }
}
```

### HTTP Transport and Smithery Deployment

Atris MCP v2.3.0+ uses the Smithery SDK for improved HTTP transport capabilities, including:
- **Session management**: Automatic session handling for stateful connections
- **Runtime configuration**: Dynamic configuration without environment variables
- **Enhanced security**: Built-in request validation and type safety

#### Running in HTTP Mode

For local HTTP server development:

```bash
# Run HTTP server on port 3000 (stateful mode)
npm run start:http

# Run in stateless mode
MCP_TRANSPORT=http MCP_MODE=stateless npm start

# Or with a custom port
PORT=8080 npm run start:http
```

#### Smithery Deployment

The server includes a `smithery.yaml` configuration for deployment on Smithery. The server now uses a Zod schema for configuration validation:

```yaml
runtime: "node"
startCommand:
  type: "http"
  cmd: ["npm", "run", "start:http"]
configSchema:
  $ref: "./src/schemas/config.schema.ts#AudiusConfigSchema"
```

Configuration options include:
- `apiKey` (string): Audius API key for authenticated requests
- `apiSecret` (string): Audius API secret
- `apiHost` (string): Custom Audius API host URL
- `environment` (enum): "production", "staging", or "development"
- `appName` (string): Custom application name
- `readOnly` (boolean): Enable read-only mode (disables write operations)
- `enabledToolsets` (array): Specific toolsets to enable

#### Transport Modes

The server automatically detects which transport to use:
- **STDIO**: Default for local development and Claude Desktop
- **HTTP**: Automatically enabled when `MCP_TRANSPORT=http` or running on Smithery
  - **Stateful mode** (default): Maintains session state across requests
  - **Stateless mode**: Each request is independent

```bash
# STDIO mode (default)
npm start

# HTTP stateful mode
MCP_TRANSPORT=http npm start

# HTTP stateless mode  
MCP_TRANSPORT=http MCP_MODE=stateless npm start
```

#### Advanced Configuration

When using HTTP transport, you can configure the server via:

1. **Environment variables** (for local development)
2. **Runtime configuration** (via Smithery platform)
3. **Query parameters** (for dynamic configuration)

Example configuration via query parameters:
```
http://localhost:3000/mcp?config.apiKey=your_key&config.readOnly=true&config.enabledToolsets=tracks,users
```

### Available Tools

The server provides the following functionality:

#### Discovery Tools
- **Search**: Find tracks, users, playlists with various filters
- **Advanced Search**: Search with genre, mood, BPM, and other filters
- **Trending Discovery**: Get trending or underground tracks
- **Similar Artists**: Find artists similar to those you like

#### Track Tools
- **Get Track Info**: Detailed track information by ID
- **Search Tracks**: Find tracks with various filters
- **Trending Tracks**: Discover what's hot on Audius
- **Track Comments**: View and add comments on tracks
- **Track Analytics**: Listen counts, trending data, audience insights

#### User Tools
- **User Profiles**: Get detailed user information
- **User Tracks**: List tracks uploaded by a user
- **Follow User**: Follow other users
- **User Analytics**: Track play metrics, supporters, and more

#### Content Creation
- **Upload Track**: Add new tracks to Audius
- **Update Track**: Modify existing track metadata
- **Create Playlist**: Build collections of tracks
- **Playlist Management**: Add, remove, and reorder tracks

#### Social Interaction
- **Follow Artists**: Connect with favorite creators
- **Favorite Tracks**: Save and show appreciation for music
- **Comments**: Add comments to tracks
- **Reposts**: See who has reposted content
- **Messaging**: Send and receive direct messages

#### Monetization
- **Premium Content**: Access and purchase gated content
- **NFT-Gated Content**: Check and verify NFT-based access
- **Purchase Tracks**: Buy premium content with various payment options
- **Send Tips**: Support artists directly
- **Track Transactions**: View tip history and stats

#### Blockchain & Wallet
- **Wallet Management**: Manage Ethereum and Solana wallets
- **Token Balances**: Check cryptocurrency balances
- **Transactions**: View history and execute transfers
- **Rewards**: Access Audius platform rewards and challenges

### Resources

Access Audius data using these URI templates:

- `audius://track/{id}`: Track details by ID
- `audius://user/{id}`: User profile by ID
- `audius://playlist/{id}`: Playlist details by ID
- `audius://album/{id}`: Album details by ID

### Prompts

The server offers guided experiences for common music-related tasks:

- **Music Discovery**: Find recommendations based on preferences
- **Track Analysis**: Analyze track characteristics and get insights
- **Artist Profiles**: Generate comprehensive artist overviews
- **Music Creation**: Assist with track creation and publishing
- **Playlist Curation**: Help with creating and promoting playlists
- **Messaging**: Guide interactions with other users
- **Analytics**: Generate reports and insights on music performance
- **Blockchain**: Assist with crypto and token operations
- **Monetization**: Guide premium content setup and purchases
- **Notifications**: Manage and organize platform notifications
- **Toolsets Guide**: Get dynamic documentation about available tools

### Important Note: Audio Streaming

This MCP server provides metadata and URLs for music streaming, but does not handle actual audio playback. MCP servers communicate via JSON-RPC and are designed to provide structured data, not binary media streams.

**What this server provides:**
- Track metadata (title, artist, duration, etc.)
- Stream URLs via `get-track-stream-url` tool
- Download URLs and links
- Track inspection data (bitrate, format, etc.)

**What client applications need to handle:**
- Actual audio playback using the provided URLs
- Authentication headers for protected content
- Audio streaming protocols (HLS, DASH, etc.)
- Player controls and UI

This follows the MCP design philosophy where servers provide data and clients handle presentation/playback.

## Development

### Project Structure

```
├── src/
│   ├── index.ts          # Entry point with transport detection
│   ├── server.ts         # Legacy MCP server setup (STDIO)
│   ├── config.ts         # Configuration handling with Zod validation
│   ├── sdk-client.ts     # Audius SDK client wrapper
│   ├── transports/       # Transport implementations
│   │   ├── http/         # HTTP transport (Smithery SDK)
│   │   │   ├── index.ts          # HTTP server factory
│   │   │   └── mcp-factory.ts    # MCP server factory for sessions
│   │   └── stdio/        # STDIO transport
│   │       └── index.ts          # STDIO server implementation
│   ├── registry/         # Component registration
│   │   ├── index.ts      # Main registry exports
│   │   ├── tools.ts      # Tool registration logic
│   │   ├── resources.ts  # Resource registration logic
│   │   └── prompts.ts    # Prompt registration logic
│   ├── schemas/          # Configuration schemas
│   │   └── config.schema.ts      # Zod schema for runtime config
│   ├── tools/            # MCP tool implementations
│   │   ├── tracks.ts               # Track-related tools
│   │   ├── users.ts                # User-related tools
│   │   ├── playlists.ts            # Playlist-related tools
│   │   ├── search.ts               # Search-related tools
│   │   ├── social.ts               # Social interaction tools
│   │   ├── comments.ts             # Comment management tools
│   │   ├── track-management.ts     # Track upload and management
│   │   ├── playlist-management.ts  # Playlist creation and management
│   │   ├── messaging.ts            # Direct messaging tools
│   │   ├── analytics.ts            # Analytics and metrics tools
│   │   ├── blockchain.ts           # Cryptocurrency and blockchain tools
│   │   ├── monetization.ts         # Premium content and payment tools
│   │   └── notifications.ts        # Platform notification tools
│   ├── resources/        # MCP resource implementations
│   │   ├── tracks.ts     # Track-related resources
│   │   ├── users.ts      # User-related resources
│   │   └── playlists.ts  # Playlist-related resources
│   └── prompts/          # MCP prompt implementations
│       ├── music-search.ts      # Music discovery prompts
│       ├── track-info.ts        # Track analysis prompts
│       ├── artist-profile.ts    # Artist profile prompts
│       ├── music-creation.ts    # Music creation prompts
│       ├── playlist-creation.ts # Playlist creation prompts
│       ├── messaging.ts         # Messaging prompts
│       ├── analytics.ts         # Analytics prompts
│       ├── blockchain.ts        # Blockchain prompts
│       ├── monetization.ts      # Monetization prompts
│       └── notifications.ts     # Notification prompts
```

### Example Workflows

#### Music Discovery
```javascript
// Search for electronic tracks
search-tracks --query "electronic" --limit 5

// Get trending tracks in a genre
get-trending-tracks --genre "House" --limit 10

// Find artists similar to a specific one
similar-artists --userId "123456"
```

#### Content Creation
```javascript
// Upload a new track
upload-track --userId "123" --title "Summer Vibes" --genre "Electronic" --audioFileUrl "https://example.com/track.mp3"

// Create a playlist
create-playlist --userId "123" --playlistName "Chillout Mix" --description "Perfect for relaxing"

// Add tracks to a playlist
add-tracks-to-playlist --userId "123" --playlistId "456" --trackIds ["789", "101", "102"]
```

#### Social Features
```javascript
// Follow a user
follow-user --userId "123" --followeeId "456"

// Favorite a track
favorite-track --userId "123" --trackId "789"

// Add a comment
add-track-comment --trackId "789" --userId "123" --comment "Great track!"
```

#### Monetization
```javascript
// Check track access gates
track-access-gates --trackId "789"

// View purchase options
purchase-options --contentId "789" --contentType "track"

// Purchase a track
purchase-track --contentId "789" --walletAddress "0x123..." --purchaseOption "option1" --paymentToken "USDC" --amount "4.99" --signerPrivateKey "privateKey"
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