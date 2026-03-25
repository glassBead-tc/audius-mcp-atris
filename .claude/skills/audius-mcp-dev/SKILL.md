---
name: audius-mcp-dev
description: "Develop and extend the Audius Code Mode MCP server — the Effect-TS server that exposes the Audius and Open Audio Protocol APIs to LLMs via search + execute tools. Use this skill whenever the user wants to add features, fix bugs, refactor, or extend this MCP server. Trigger on mentions of MCP server development, adding new tools, modifying the sandbox, changing the transport layer, updating the spec loader, extending the search index, or any work on the audius-mcp-atris codebase itself. Also use when the user asks about the server architecture, how the components connect, or wants to understand the Effect-TS service/layer patterns used here."
---

# Audius MCP Server Development

This skill guides development of the `audius-mcp-atris` Code Mode MCP server — an Effect-TS server that gives LLMs access to the Audius music platform and Open Audio Protocol through two tools: `search` (API discovery) and `execute` (sandboxed code execution).

## Architecture at a Glance

```
LLM ──POST /mcp──► McpServerTransport ──► McpSerialization ──► McpServer
                                              (JSON-RPC ↔ Effect)      │
                                                              ┌────────┴────────┐
                                                         SearchTool        ExecuteTool
                                                              │                │
                                                         SpecIndex         Sandbox
                                                              │           ┌────┴────┐
                                                         SpecLoader  AudiusClient  TypeGenerator
                                                                         │
                                                                     AppConfig
```

Every box is an Effect service (`Context.Tag`) composed via `Layer`. The entry point (`src/index.ts`) wires all layers together and starts the HTTP server.

## Effect-TS Service Pattern

This is the core pattern used throughout the codebase. Understanding it is essential for adding any new component.

```typescript
// 1. Define the service interface with Context.Tag
export class MyService extends Context.Tag("MyService")<
  MyService,
  {
    readonly doSomething: (input: string) => Effect.Effect<Result, Error>
  }
>() {}

// 2. Implement via Layer.effect (can depend on other services)
export const MyServiceLive: Layer.Layer<MyService, never, Dep1 | Dep2> = Layer.effect(
  MyService,
  Effect.gen(function* () {
    const dep1 = yield* Dep1
    const dep2 = yield* Dep2

    return {
      doSomething: (input) => Effect.gen(function* () {
        // use dep1, dep2...
        return result
      })
    }
  })
)

// 3. Wire in index.ts
const MyServiceLayer = MyServiceLive.pipe(
  Layer.provide(Layer.merge(Dep1Layer, Dep2Layer))
)
```

**Key rules:**
- Services are accessed via `yield* ServiceTag` inside `Effect.gen`
- Layer composition happens in `index.ts` — each layer explicitly provides its dependencies
- Tool handlers return `Effect.Effect<T, E, R>` where `R` lists required services
- Errors in tool handlers go in `content` with `isError: true` (tool-level), not protocol-level
- `Layer.mergeAll(...)` provides the final `AppLayer` to the main program

## File Map

| File | Role | Key exports |
|------|------|-------------|
| `src/index.ts` | Entry point, layer composition, HTTP server startup | — |
| `src/AppConfig.ts` | Env var config service | `AppConfig`, `AppConfigLive` |
| `src/mcp/McpSchema.ts` | MCP 2025-11-25 protocol as Effect schemas | `Tool`, `CallToolResult`, `TextContent`, etc. |
| `src/mcp/McpSerialization.ts` | JSON-RPC ↔ Effect RPC bridge | `mcpJson`, `mcpNdJson` |
| `src/mcp/McpServer.ts` | Request dispatch (initialize, tools/list, tools/call) | `createHandler` |
| `src/mcp/McpServerTransport.ts` | Streamable HTTP on `/mcp` | `startServer` |
| `src/mcp/McpNotifications.ts` | Notification channels | — |
| `src/api/SpecLoader.ts` | Fetch + resolve Audius swagger.yaml | `SpecLoader`, `SpecLoaderLive` |
| `src/api/SpecIndex.ts` | Searchable index over parsed spec | `SpecIndex`, `SpecIndexLive` |
| `src/api/AudiusClient.ts` | Authenticated HTTP client for Audius API | `AudiusClient`, `AudiusClientLive` |
| `src/tools/SearchTool.ts` | `search` tool definition + handler | `searchToolDefinition`, `handleSearch` |
| `src/tools/ExecuteTool.ts` | `execute` tool definition + handler | `executeToolDefinition`, `handleExecute` |
| `src/sandbox/Sandbox.ts` | QuickJS WASM sandbox for code execution | `Sandbox`, `SandboxLive` |
| `src/sandbox/TypeGenerator.ts` | TS declarations from spec for LLM context | `TypeGenerator`, `TypeGeneratorLive` |

## How to Add a New Tool

1. **Create `src/tools/MyTool.ts`** following the pattern in SearchTool.ts:
   - Export a `Tool.make({...})` definition with name, description, inputSchema, annotations
   - Export a handler function returning `Effect.Effect<typeof CallToolResult.Type, never, RequiredServices>`
   - Return results via `CallToolResult.make({ content: [TextContent.make({...})] })`
   - Errors: set `isError: true` on CallToolResult, put error message in content text

2. **Register in `src/mcp/McpServer.ts`**:
   - Import the tool definition and handler
   - Add to the `tools/list` response array
   - Add a case in `handleToolCall` switch

3. **Wire dependencies in `src/index.ts`** if the new tool needs new services

## How to Add a New Effect Service

1. **Create the service file** (e.g., `src/api/NewService.ts`):
   - Define `Context.Tag` with the interface
   - Implement `Layer.effect` with dependencies in the type signature

2. **Wire in `src/index.ts`**:
   - Create the layer with `.pipe(Layer.provide(...))` for dependencies
   - Add to `AppLayer` via `Layer.mergeAll`

3. **Use in handlers** via `yield* NewService`

## The Sandbox

The QuickJS WASM sandbox (`src/sandbox/Sandbox.ts`) is the execute tool's runtime:

- **`audius.request(method, path, options?)`** — host function bridged to `AudiusClient`
- **`console.log()`** — captured, returned in output
- **Memory limit**: 64MB
- **Timeout**: configurable, default 30s
- **Isolation**: fresh QuickJS context per execution, no state leakage
- User code is injected via `__userCode__` global string (prevents template literal injection)
- Results are auto-parsed from JSON strings

The sandbox differs from the Cloudflare reference (which uses V8 Worker Loader isolates). QuickJS runs in WASM so it works in any Node.js environment without Cloudflare Workers infrastructure.

## The Search Tool

The search tool (`src/tools/SearchTool.ts`) takes structured filters (query, tag, path, method) rather than executable code (unlike Cloudflare's approach where the LLM writes JavaScript to search the spec). This is simpler and sufficient for the Audius API size (~100 endpoints vs Cloudflare's ~2500).

The `SpecIndex` service builds keyword indexes at startup and supports filtering by tag, path pattern, HTTP method, and free-text search across descriptions.

## Cloudflare Reference

The `cloudflare-serverside-mcp-ref/` directory contains Cloudflare's production Code Mode MCP server as a reference implementation. Key architectural differences to be aware of:

| Aspect | This Server (audius-mcp-atris) | Cloudflare Reference |
|--------|-------------------------------|---------------------|
| Runtime | Node.js + Effect-TS | Cloudflare Workers |
| Sandbox | QuickJS WASM | V8 Worker Loader isolates |
| Search | Structured filters (query/tag/path/method) | LLM writes JS to query spec |
| Auth | API key header | OAuth 2.1 + API token modes |
| Spec storage | Fetched at startup | R2 bucket, daily cron refresh |
| Transport | Custom Streamable HTTP | MCP SDK transport |

Read `cloudflare-serverside-mcp-ref/src/server.ts` for the tool registration pattern, `executor.ts` for sandbox execution, and `spec-processor.ts` for OpenAPI processing.

## Common Development Tasks

For detailed guidance on specific tasks, read the reference files:

- **`references/extending-tools.md`** — Adding tools, modifying tool descriptions, changing input schemas, adding tool annotations
- **`references/transport-and-protocol.md`** — MCP protocol compliance, session management, JSON-RPC handling, adding new protocol methods
- **`references/api-integration.md`** — Working with SpecLoader, SpecIndex, AudiusClient, adding new API providers, extending to Open Audio Protocol

## Build & Test

```bash
pnpm build    # TypeScript → JavaScript
pnpm start    # Run compiled server (HTTP on PORT, default 3000)
pnpm dev      # Build + run
pnpm test     # Currently runs build as test
```

Environment: `AUDIUS_API_KEY` for API access, `PORT` for server port.

## Important Constraints

- **No `@audius/sdk`** — direct REST API calls via `AudiusClient.request(method, path, options)`
- **MCP protocol version**: `2025-11-25`
- Tool errors are tool-level (in `content` with `isError: true`), not protocol-level JSON-RPC errors
- The spec URL is hardcoded: `https://api.audius.co/v1/swagger.yaml`
- SSRF protection: paths must start with `/` and cannot contain `@`
