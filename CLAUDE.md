# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript
- **Start**: `npm run start` - Runs the compiled server (HTTP on PORT, default 3000)
- **Dev mode**: `npm run dev` - Builds and runs in one command
- **Test**: `npm run test` - Currently runs build as test

## Environment Variables

- `AUDIUS_API_KEY` - API key for Audius REST API
- `PORT` - HTTP server port (default: 3000)

## Architecture Overview

This is a **Code Mode** MCP server built with **Effect-TS**. It provides LLM access to the Audius music platform via two tools (`search` + `execute`) over Streamable HTTP transport.

### Code Mode Pattern

Instead of exposing 100+ individual tools (which bloats LLM context), this server uses the Cloudflare Code Mode approach:

1. **search** — Discover API endpoints by querying the OpenAPI spec
2. **execute** — Run JavaScript code in a QuickJS WASM sandbox with an authenticated `audius.request()` client

### File Structure

```
src/
├── index.ts                    # Entry point — Effect program, HTTP server
├── AppConfig.ts                # Effect Config service (env vars)
├── mcp/
│   ├── McpSchema.ts            # MCP 2025-11-25 spec (Effect-TS port)
│   ├── McpSerialization.ts     # JSON-RPC ↔ Effect RPC bridge
│   ├── McpNotifications.ts     # Notification channels
│   ├── McpServerTransport.ts   # Server-side Streamable HTTP transport
│   └── McpServer.ts            # RPC handler wiring
├── api/
│   ├── SpecLoader.ts           # Fetch + parse Audius swagger.yaml
│   ├── SpecIndex.ts            # Searchable index over parsed spec
│   └── AudiusClient.ts         # HTTP client for Audius REST API
├── tools/
│   ├── SearchTool.ts           # search() tool
│   └── ExecuteTool.ts          # execute() tool
└── sandbox/
    ├── Sandbox.ts              # QuickJS WASM sandbox
    └── TypeGenerator.ts        # TS declarations from swagger spec
```

### Key Architectural Patterns

1. **Effect-TS Services**: Every component is an Effect service (`Context.Tag`) composed via `Layer`. The entry point provides all layers and starts the HTTP server.

2. **MCP Schema**: Full MCP 2025-11-25 protocol spec ported to Effect-TS using `@effect/rpc` and `effect/Schema`. Located in `src/mcp/McpSchema.ts`.

3. **McpSerialization Bridge**: Translates between Effect RPC's internal message format (`_tag: "Request"/"Exit"`) and MCP's JSON-RPC wire format (`jsonrpc: "2.0"`). Two variants: `mcpJson` (HTTP) and `mcpNdJson` (STDIO).

4. **QuickJS Sandbox**: LLM-generated code runs in a WASM-isolated QuickJS context with:
   - `audius.request(method, path, options?)` host function
   - `console.log()` capture
   - Memory and execution time limits
   - Fresh context per execution (no state leakage)

5. **API Spec Layer**: At startup, fetches the Audius OpenAPI spec, resolves all `$ref` references, and builds a searchable index. The search tool queries this index.

### Transport

Streamable HTTP on a single `/mcp` endpoint:
- `POST /mcp` — JSON-RPC requests
- `DELETE /mcp` — terminate session
- Session ID via `MCP-Session-Id` header
- Protocol version: `2025-11-25`

### Important Implementation Notes

1. **Effect service pattern**: Access services via `yield* ServiceTag` in `Effect.gen`. All handlers return `Effect.Effect<T, E, R>`.

2. **Tool handlers**: Return `CallToolResult` from `McpSchema.ts`. Errors go in `content` with `isError: true` (tool-level), not protocol-level.

3. **No old SDK**: Direct REST API calls via `AudiusClient.request(method, path, options)`. No `@audius/sdk`.
