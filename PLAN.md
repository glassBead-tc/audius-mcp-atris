# Audius MCP Server Rebuild — Implementation Plan

## Architecture: Code Mode + Effect-TS + Streamable HTTP

### Overview

Rebuild the Audius MCP server as a **Code Mode** server using **Effect-TS** natively with the user's MCP schema implementation. Two tools only: `search` (explore the API spec) and `execute` (run code against the Audius REST API). Streamable HTTP transport. Direct REST API calls (no @audius/sdk).

---

## Phase 1: Project Foundation

### 1.1 — Clean slate package.json

Remove old dependencies (`@audius/sdk`, `@modelcontextprotocol/sdk`, `zod`). Add Effect ecosystem:

```
Dependencies:
- effect
- @effect/platform
- @effect/platform-node
- @effect/rpc
- @effect/schema (bundled in effect)
- yaml (for parsing swagger spec)
- quickjs-emscripten (lightweight WASM sandbox for execute())

Dev dependencies:
- typescript
- @types/node
- tsx (for dev mode)
```

### 1.2 — tsconfig.json

Update to strict mode, target ES2022, module NodeNext. Enable `exactOptionalPropertyTypes`.

### 1.3 — Project structure

```
src/
├── index.ts                    # Entry point — start HTTP server
├── server.ts                   # MCP server setup using Effect RPC
├── config.ts                   # Effect Config for env vars
├── schema/
│   └── mcp.ts                  # User's Effect-TS MCP schema (pasted above)
├── api/
│   ├── spec-loader.ts          # Fetch + parse Audius swagger spec at startup
│   ├── spec-index.ts           # Searchable index over the parsed spec
│   └── client.ts               # Effect HttpClient for Audius REST API
├── tools/
│   ├── search.ts               # search() tool — query the API spec
│   └── execute.ts              # execute() tool — run code in sandbox
├── sandbox/
│   ├── runtime.ts              # QuickJS WASM sandbox setup
│   ├── bindings.ts             # audius.request() binding injected into sandbox
│   └── types.ts                # Generated TypeScript interface strings
└── transport/
    └── streamable-http.ts      # Streamable HTTP transport using Effect
```

---

## Phase 2: API Spec Layer

### 2.1 — Spec Loader (`api/spec-loader.ts`)

- Use `@effect/platform` HttpClient to fetch `https://api.audius.co/v1/swagger.yaml` at startup
- Parse YAML → JSON with `yaml` package
- Resolve all `$ref` references inline (like Cloudflare does)
- Cache the resolved spec in memory
- Effect Layer pattern: `SpecLoader` service with `Layer.effect`

### 2.2 — Spec Index (`api/spec-index.ts`)

- Build a searchable index from the resolved spec
- Index by: path, HTTP method, tag/category, operationId, description keywords
- Support filtering: `{ path?, tag?, method?, keyword? }`
- Return compact endpoint metadata: path, method, summary, parameters, request body schema, response schema
- Effect service: `SpecIndex` with search methods

### 2.3 — TypeScript Interface Generator (`sandbox/types.ts`)

- Generate TypeScript interface strings from the resolved spec
- One interface per endpoint's request params + response type
- A top-level `Audius` namespace with method signatures
- These strings are injected as type context when the LLM writes code in `execute()`
- Format: `declare namespace audius { function getTracks(params: {...}): Promise<{...}>; ... }`

### 2.4 — HTTP Client (`api/client.ts`)

- Effect `HttpClient` wrapper for Audius REST API
- Base URL: `https://api.audius.co/v1`
- Automatic `x-api-key` header injection
- Request/response logging via Effect's logging
- Effect Layer: `AudiusClient` service

---

## Phase 3: Code Mode Tools

### 3.1 — Search Tool (`tools/search.ts`)

```typescript
// Tool definition
name: "search"
title: "Search Audius API"
description: "Search the Audius API specification to discover endpoints, parameters, and response schemas. Use this before writing code with execute()."
annotations: { readOnlyHint: true, openWorldHint: false }

// Input schema
{
  query?: string        // Free-text search across endpoint descriptions
  tag?: string          // Filter by API category (tracks, users, playlists, etc.)
  path?: string         // Filter by URL path pattern
  method?: string       // Filter by HTTP method (GET, POST, PUT, DELETE)
}

// Output: matching endpoint metadata (path, method, summary, params, response schema)
```

### 3.2 — Execute Tool (`tools/execute.ts`)

```typescript
// Tool definition
name: "execute"
title: "Execute Audius API Code"
description: "Execute JavaScript code against the Audius API. An authenticated `audius` client is available in scope with a `request(method, path, options?)` function."
annotations: {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true
}

// Input schema
{
  code: string          // JavaScript code to execute
  timeout?: number      // Max execution time in ms (default: 30000)
}

// Output: execution result (stdout, return value, or error)
```

---

## Phase 4: Sandbox

### 4.1 — QuickJS Runtime (`sandbox/runtime.ts`)

- Use `quickjs-emscripten` for WASM-based V8-like isolation
- Create fresh sandbox per execution (no state leakage between calls)
- Inject `audius.request(method, path, options?)` as a host function
- Inject TypeScript type declarations as ambient context
- Set memory limit and execution timeout
- Capture console.log output for return
- Return structured result: `{ output: string, returnValue: unknown, error?: string }`

### 4.2 — API Bindings (`sandbox/bindings.ts`)

- `audius.request(method, path, options?)` — makes authenticated REST calls
- `audius.search(query)` — convenience wrapper for search endpoints
- `audius.resolve(url)` — resolve an Audius URL to API resource
- All calls route through the Effect HttpClient layer (outside the sandbox)
- Sandbox → host communication via QuickJS host function callbacks

---

## Phase 5: Transport & Server

### 5.1 — Streamable HTTP Transport (`transport/streamable-http.ts`)

- Single `/mcp` endpoint accepting POST (requests) and GET (SSE stream)
- Session management with `Mcp-Session-Id` header
- SSE streaming for server→client notifications and responses
- Use `@effect/platform-node` HttpServer
- DNS rebinding protection for localhost

### 5.2 — MCP Server (`server.ts`)

- Wire up the Effect RPC handler using the user's MCP schema
- Register the two tools (search, execute) via `CallTool` handler
- Handle `Initialize` with server capabilities (tools, no resources/prompts for now)
- Handle `ListTools` returning the two tool definitions
- Handle `Ping` for keep-alive
- Server info: `{ name: "audius-mcp", version: "2.0.0" }`
- Instructions field: brief description of Code Mode usage pattern

### 5.3 — Entry Point (`index.ts`)

- Load config from environment (AUDIUS_API_KEY, PORT)
- Build Effect Layer: Config → SpecLoader → SpecIndex → AudiusClient → Sandbox → Server
- Start HTTP server
- Graceful shutdown on SIGINT/SIGTERM

---

## Phase 6: Testing & Polish

### 6.1 — Test with MCP Inspector

- Verify initialize handshake
- Test search tool with various queries
- Test execute tool with simple API calls
- Verify error handling (bad code, timeout, API errors)

### 6.2 — Server instructions

- Write clear `instructions` text that teaches LLMs the Code Mode workflow:
  1. Use `search` to discover relevant endpoints
  2. Use `execute` to write and run code against those endpoints
  3. The `audius` client is pre-authenticated

---

## Implementation Order

1. **Phase 1** — Project foundation (package.json, tsconfig, structure)
2. **Phase 2.1-2.2** — Spec loader + index (core data layer)
3. **Phase 3.1** — Search tool (useful immediately for testing)
4. **Phase 2.3** — TypeScript interface generation
5. **Phase 4** — Sandbox (QuickJS setup + bindings)
6. **Phase 3.2** — Execute tool (depends on sandbox)
7. **Phase 5** — Transport + server wiring
8. **Phase 6** — Testing + instructions

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sandbox | QuickJS WASM | True isolation, no Node.js API access, memory/CPU limits, fast startup |
| Type generation | Runtime from swagger | Always up-to-date, no build step needed |
| Transport | Streamable HTTP only | Modern spec, supports SSE streaming, session management |
| API layer | Direct REST | No SDK dependency, full API coverage, simpler for Code Mode |
| Framework | Effect-TS | Type-safe, composable, matches user's MCP schema |
| Tool count | 2 (search + execute) | Code Mode pattern — minimal token footprint, maximum capability |
