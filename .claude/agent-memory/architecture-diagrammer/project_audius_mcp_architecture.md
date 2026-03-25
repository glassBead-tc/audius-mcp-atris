---
name: audius-mcp-server-architecture
description: Core architecture facts for the Audius MCP server — service graph, transport, sandbox, and code mode pattern
type: project
---

The Audius MCP server is a Code Mode MCP 2025-11-25 server built with Effect-TS. It exposes exactly two tools (`search` + `execute`) over Streamable HTTP at `POST /mcp`.

Key architectural facts verified from source:

- Entry point `src/index.ts` composes all Effect layers and calls `startServer` via `acquireRelease`
- Layer dependency order: AppConfig → AudiusClient → (TypeGenerator ← SpecLoader → SpecIndex) → Sandbox
- `Runtime<SpecIndex | Sandbox>` is materialized once at startup and reused for every HTTP request
- Session management is a module-level `Map<string, {createdAt: number}>` with no TTL
- Body limit: 1MB; CORS origin: `MCP_ALLOW_ORIGIN` env var (default `http://localhost`)
- `McpSerialization.ts` is the JSON-RPC 2.0 ↔ internal Effect RPC format bridge; two variants: `mcpJson` (HTTP) and `mcpNdJson` (stdio, unused in server path)
- Sandbox uses `quickjs-emscripten` `newAsyncContext()` — fresh VM per `execute()` call, 64MB memory limit, interrupt-handler timeout
- The `audius.request` host function bridges WASM → Node via `newAsyncifiedFunction`; results are JSON round-tripped (`JSON.stringify` → `ctx.newString` → `JSON.parse`) because complex objects cannot cross the WASM heap boundary cheaply
- User code is stored in `__userCode__` global string (not interpolated) to prevent template-literal injection from API spec content
- SpecLoader fetches `https://api.audius.co/v1/swagger.yaml` at startup and resolves all `$ref` inline
- AudiusClient SSRF guard: path must start with `/` and must not contain `@`
- Architecture diagram produced at `docs/agent-data-flow-architecture.md`

**Why:** Context for future architecture work or diagram updates.
**How to apply:** Use when asked to modify transport, sandbox, serialization, or layer composition — these facts are not immediately obvious from a first read of the code.
