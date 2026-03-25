# Audius MCP Server (Code Mode)

A Code Mode MCP server that gives LLMs full access to the Audius music platform and Open Audio Protocol. Instead of 100+ individual tools, it uses two meta-tools — **search** and **execute** — to compress the entire Audius API into ~1,000 tokens of context.

Built with Effect-TS. Runs a QuickJS WASM sandbox for secure code execution.

## How It Works

```
LLM ──► search("trending tracks")     → discovers GET /tracks/trending
    ──► execute("audius.request(...)") → runs code in sandbox, returns results
```

The LLM writes JavaScript that runs in an isolated sandbox with an authenticated `audius.request()` client. No API keys in the prompt, no tool explosion, no round-trip overhead.

## Tools

| Tool | What it does |
|------|-------------|
| **search** | Discover API endpoints by tag, path, method, or keyword |
| **execute** | Run JavaScript against the Audius API in a QuickJS sandbox |
| **play** | Open a track in the Audius desktop app or browser |
| **subgraph** | Query on-chain protocol data (staking, governance, nodes) via The Graph |

## Quick Start

```bash
# Install
git clone https://github.com/glassBead-tc/audius-mcp-atris.git
cd audius-mcp-atris
pnpm install

# Configure
echo 'AUDIUS_API_KEY=your_key_here' > .env

# Build & run
pnpm dev
```

## Getting API Keys

### Audius API Key (required)

1. Go to [audius.co/settings](https://audius.co/settings) and sign in (or create an account)
2. Scroll to **Developer Apps** and create a new app
3. Copy the **API Key** — this goes in your `.env` as `AUDIUS_API_KEY`
4. Optionally copy the **API Secret** if you plan to do write operations (uploads, favorites)

Alternatively, get credentials at [api.audius.co/plans](https://api.audius.co/plans).

### The Graph API Key (optional, for subgraph tool)

The subgraph tool queries on-chain protocol data (staking, governance, nodes). It requires a Graph API key:

1. Go to [thegraph.com/studio](https://thegraph.com/studio) and sign in
2. Create an API key ([video tutorial](https://www.youtube.com/watch?v=UrfIpm-Vlgs))
3. Add it to your `.env` as `GRAPH_API_KEY`

Without this key, the subgraph tool will return an auth error. All other tools work fine without it.

## Connect to Claude

### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "audius-mcp": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Claude Desktop

Add to `claude_mcp_config.json`:

```json
{
  "mcpServers": {
    "audius": {
      "command": "node",
      "args": ["/path/to/audius-mcp-atris/dist/index.js"],
      "env": {
        "AUDIUS_API_KEY": "your_key_here"
      }
    }
  }
}
```

## Example Conversations

**"What's trending on Audius right now?"**
```js
// LLM calls search({ tag: "tracks" }), then:
return await audius.request('GET', '/tracks/trending', { query: { limit: 5 } })
```

**"Find deadmau5 and show me his top tracks"**
```js
const users = await audius.request('GET', '/users/search', { query: { query: 'deadmau5' } })
const userId = users.data[0].id
const tracks = await audius.request('GET', '/users/' + userId + '/tracks', { query: { sort: 'plays' } })
return tracks.data.map(t => ({ title: t.title, plays: t.play_count }))
```

**"How much $AUDIO is staked in the protocol?"**
```graphql
{ audiusNetworks(first: 1) { totalTokensStaked totalTokensDelegated totalSupply } }
```

## Architecture

```
src/
├── index.ts                    # Entry point — Effect layers, HTTP server
├── AppConfig.ts                # Env var config (AUDIUS_API_KEY, PORT)
├── mcp/
│   ├── McpSchema.ts            # MCP 2025-11-25 protocol (Effect Schema)
│   ├── McpSerialization.ts     # JSON-RPC ↔ Effect RPC bridge
│   ├── McpServer.ts            # Request dispatch (initialize, tools/*)
│   └── McpServerTransport.ts   # Streamable HTTP on /mcp
├── api/
│   ├── SpecLoader.ts           # Fetch + resolve Audius swagger.yaml
│   ├── SpecIndex.ts            # Searchable index over parsed spec
│   └── AudiusClient.ts         # Authenticated HTTP client
├── tools/
│   ├── SearchTool.ts           # search tool
│   ├── ExecuteTool.ts          # execute tool
│   ├── PlayTool.ts             # play tool
│   └── SubgraphTool.ts         # subgraph tool
└── sandbox/
    ├── Sandbox.ts              # QuickJS WASM sandbox
    └── TypeGenerator.ts        # TS declarations from spec
```

Every component is an Effect service (`Context.Tag`) composed via `Layer`. The sandbox uses `QuickJSDeferredPromise` to support unlimited chained `await` calls.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUDIUS_API_KEY` | Yes | API key from audius.co/settings |
| `PORT` | No | HTTP server port (default: 3000) |
| `GRAPH_API_KEY` | No | The Graph API key for subgraph queries |

## Development

```bash
pnpm build    # Compile TypeScript
pnpm start    # Run compiled server
pnpm dev      # Build + run
pnpm test     # Run tests
```

## Security

- **Sandbox isolation**: LLM-generated code runs in QuickJS WASM — no filesystem, no network, no env vars
- **No raw fetch**: Only `audius.request()` is available, hardcoded to `api.audius.co`
- **SSRF protection**: API paths must start with `/` and cannot contain `@`
- **Memory cap**: 64MB per execution
- **Timeout**: 30s default, configurable per call
- **Fresh context**: No state leaks between executions

## Protocol

- **MCP version**: 2025-11-25
- **Transport**: Streamable HTTP at `POST /mcp`
- **Sessions**: `MCP-Session-Id` header, in-memory (stateless-ready)

## Open Audio Protocol

This server is built on the [Open Audio Protocol](https://openaudio.org) — the decentralized global music database. Audius is one application layer on top of OAP. The subgraph tool provides direct access to on-chain protocol data.

## License

MIT
