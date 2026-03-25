---
name: audius-api
description: "Build music apps with the Audius REST API and JavaScript SDK. Use this skill whenever the user wants to build a music player, streaming app, or audio application using Audius. Trigger on mentions of Audius API, @audius/sdk, create-audius-app, audius.co, api.audius.co, Audius OAuth, track streaming, playlist fetching, user profiles, or music app development on Audius. Also use when the user asks about uploading tracks, searching music, fetching trending tracks, or any REST API integration with the Audius platform."
---

# Audius API & SDK Development

Audius is an application layer built on the Open Audio Protocol, providing a music streaming service and developer toolkit. It's the fastest path to building music players, streaming apps, and audio-native products.

If the user wants to work at the protocol level (running nodes, self-hosted indexers, consensus, storage), point them to the `openaudio` skill instead.

## Quickstart

The fastest way to scaffold a project:

```bash
npx create-audius-app my-app
```

Requires Node 18+. Creates a TypeScript/React project with Audius SDK pre-configured.

## API Access

### Credentials

Get your API Key and Secret from https://audius.co/settings (or https://api.audius.co/plans).

- **Read-only operations** (search, fetch tracks, playlists): API Key only
- **Write operations** (uploads, favorites): API Key + API Secret (server-side only — never expose the secret on the frontend)

### REST API

Base URL: `https://api.audius.co/v1`

All requests require the `x-api-key` header:

```bash
curl -H "x-api-key: YOUR_API_KEY" https://api.audius.co/v1/tracks/trending
```

Key endpoint groups: users, tracks, playlists, comments, search.

OpenAPI/Swagger spec: `https://api.audius.co/v1/swagger.yaml` — use this for code generation and API discovery.

**Important:** `discoveryprovider.audius.co` is deprecated. Always use `api.audius.co`.

### JavaScript SDK

```bash
npm install @audius/sdk
```

```typescript
import { sdk } from '@audius/sdk'

const audiusSdk = sdk({
  apiKey: 'YOUR_API_KEY',
  // apiSecret: 'YOUR_API_SECRET' // for write operations, server-side only
})

// Search tracks
const results = await audiusSdk.tracks.searchTracks({ query: 'electronic' })

// Get trending
const trending = await audiusSdk.tracks.getTrendingTracks()
```

For browser usage, a CDN option is also available — see the SDK docs.

### OAuth

Use "Log in with Audius" for user authentication and authorization (uploads, favorites, etc.). See the OAuth flow documentation in the SDK.

## Image Handling

API responses include artwork with mirror fallback URLs. Always preserve mirrors for retry logic when images fail to load — this is important for reliability.

## For detailed reference

Read the reference files in this skill:

- **`references/api-endpoints.md`** — Detailed endpoint documentation, common patterns, and response formats
- **`references/sdk-guide.md`** — SDK initialization, write operations, OAuth, and example patterns

## Key Links

| Resource | URL |
|----------|-----|
| API Docs | https://docs.audius.co/api |
| Swagger Spec | https://api.audius.co/v1/swagger.yaml |
| SDK (npm) | https://www.npmjs.com/package/@audius/sdk |
| Developer Docs | https://docs.audius.co |
| GitHub Examples | https://github.com/AudiusProject/apps |
| create-audius-app Guide | https://docs.audius.co/developers/guides/create-audius-app |
| Audius agents.md | https://audius.co/agents.md |

## Relationship to this MCP Server

This project (`audius-mcp-atris`) is a Code Mode MCP server that exposes Audius API access to LLMs via `search` and `execute` tools. If the user is working on this MCP server itself, refer to the project's CLAUDE.md for architecture details. This skill is for when the user wants to build *other* apps using the Audius API/SDK.
