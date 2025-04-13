# Atris MCP for Audius

[![smithery badge](https://smithery.ai/badge/@glassBead-tc/audius-mcp-atris)](https://smithery.ai/server/@glassBead-tc/audius-mcp-atris)

---

## 🚀 Quickstart

### Claude Desktop/CLI (Recommended)

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
        "AUDIUS_API_SECRET": "your_api_secret_here",
        "AUDIUS_ENVIRONMENT": "production"
      }
    }
  }
}
```

### Direct CLI

```bash
npx -y audius-mcp-atris --api-key=your_api_key_here --api-secret=your_api_secret_here --environment=production
```

> **Note:** This server is designed for use as an MCP (Model Context Protocol) backend. Do **not** run directly for end-user interaction. Always use via an MCP client (Claude, Cursor, etc).

---

## Features

- **Tools**: Access tracks, users, playlists, albums, and perform searches on Audius
- **Audio Streaming (Integrated)**: Stream audio content directly from Audius to AI applications. The audio streaming server is now fully integrated and managed by the MCP server—no separate process required.
- **Content Creation**: Upload tracks, create playlists, manage your Audius content
- **Social Features**: Follow users, favorite tracks, comment on content
- **Monetization**: Access premium content, purchase tracks, send tips to artists
- **Analytics**: Track play counts, trending data, and listener insights
- **Resources**: Access track, user, playlist, and album data as structured resources
- **Prompts**: Use guided experiences for music discovery, curation, and analysis

---

## 🛡️ Security Best Practices

- **Never commit secrets**: Always use `.env` or environment variables for API keys and secrets.
- **.env is gitignored**: Ensure `.env` and `.env.*` are in your `.gitignore` and `.npmignore`.
- **Production**: Set `AUDIUS_ENVIRONMENT=production` to use public Audius nodes.
- **No hardcoded secrets**: All configuration is via environment variables or CLI flags.

---

## 🔧 Configuration

All configuration is managed via environment variables, CLI flags, or Smithery config.

### Environment Variables

- `AUDIUS_API_KEY` (required): Audius API Key
- `AUDIUS_API_SECRET` (required): Audius API Secret
- `AUDIUS_ENVIRONMENT` (default: production): production, staging, or development
- `STREAM_SERVER_PORT` (default: 7070): Port for the integrated streaming server
- `LOG_LEVEL` (default: info): error, warn, info, debug, verbose

### CLI Flags

| Flag                | Env Var                | Description                                 |
|---------------------|------------------------|---------------------------------------------|
| --api-key           | AUDIUS_API_KEY         | Audius API Key                              |
| --api-secret        | AUDIUS_API_SECRET      | Audius API Secret                           |
| --environment       | AUDIUS_ENVIRONMENT     | Audius environment (production, etc)        |
| --stream-port       | STREAM_SERVER_PORT     | Audio streaming server port                  |
| --log-level         | LOG_LEVEL              | Log level                                   |

> All CLI flags override environment variables.

---

## 🗂️ Tool Summary Table

| Category         | Tools (LLM/AI-usable)                                                                 |
|------------------|--------------------------------------------------------------------------------------|
| Discovery        | search-tracks, advanced-search, trending-discovery, similar-artists                  |
| Track            | stream-track, get-track, search-tracks, trending-tracks, track-comments, analytics   |
| User             | get-user, search-users, user-tracks, follow-user, user-analytics                     |
| Playlist         | get-playlist, create-playlist, add-tracks-to-playlist, playlist-management           |
| Social           | follow-user, favorite-track, add-comment, reposts, messaging                         |
| Monetization     | get-premium-content, purchase-track, send-tip, track-transactions, nft-gated-content |
| Blockchain/Wallet| user-wallets, token-balance, transaction-history, rewards                            |
| Analytics        | get-listen-counts, top-listeners, user-play-metrics                                  |
| Notifications    | get-notifications, notification-settings, mark-notifications-read                    |

See below for full tool descriptions.

---

## 📦 Installation

### Smithery

```bash
npx -y @smithery/cli install @glassBead-tc/audius-mcp-atris --client claude
```

### NPM

```bash
npm install audius-mcp-atris
```

### Yarn

```bash
yarn add audius-mcp-atris
```

### Docker

```bash
docker build -t audius-mcp-atris .
docker run -it --rm \
  -e AUDIUS_API_KEY=your_api_key_here \
  -e AUDIUS_API_SECRET=your_api_secret_here \
  -e AUDIUS_ENVIRONMENT=production \
  audius-mcp-atris
```

---

## 📝 Example Smithery Config

```yaml
startCommand:
  type: stdio
  configSchema:
    type: object
    required:
      - audiusApiKey
      - audiusApiSecret
    properties:
      audiusApiKey:
        type: string
      audiusApiSecret:
        type: string
      audiusEnvironment:
        type: string
        default: production
      streamServerPort:
        type: number
        default: 7070
      logLevel:
        type: string
        default: info
  exampleConfig:
    audiusApiKey: dummy_api_key
    audiusApiSecret: dummy_api_secret
    audiusEnvironment: production
    streamServerPort: 7070
    logLevel: info
```

---

## 🛠️ Available Tools

(See original README for full tool descriptions, unchanged.)

---

## 🔗 Resource Links

- [Model Context Protocol (MCP) Docs](https://modelcontextprotocol.io/introduction)
- [Audius API Docs](https://docs.audius.co/)
- [Smithery Server Page](https://smithery.ai/server/@glassBead-tc/audius-mcp-atris)
- [GitHub Repo](https://github.com/glassBead/audius-mcp-atris)

---

## 🧪 Testing

For local development testing:

```bash
npm install -g @modelcontextprotocol/inspector
npx @modelcontextprotocol/inspector node ./build/index.js
```

---

## License

MIT
