# Architecture: An Audius MCP Server in Code Mode

This document explains the architecture of the Audius MCP server from several angles: the problem it solves, the Code Mode pattern, the Effect-TS service composition, the sandbox execution model, and the protocol layer. It's meant both as repo documentation and as raw material for a blog post.

---

## The Problem: Tool Explosion

The standard MCP approach to exposing an API is to create one tool per endpoint. The Audius API has 207 endpoints. That means 207 tool definitions — each with a name, description, parameter schema, and annotations — loaded into the LLM's context window before the user says a word.

At roughly 100 tokens per tool definition, that's ~20,000 tokens of overhead. For some APIs it's worse: Cloudflare's API has ~2,500 endpoints, which would consume 244,000 tokens — exceeding most context windows entirely.

This creates three problems:

1. **Context waste.** Most of those tool definitions are irrelevant to any given query. A user asking about trending tracks doesn't need the schemas for blockchain wallet management.

2. **Decision fatigue.** LLMs get worse at tool selection as the number of tools grows. With 200+ tools, they start picking wrong ones or hallucinating parameters.

3. **Round-trip overhead.** Each tool call is a full inference cycle. A task that chains 5 API calls means 5 round trips, each burning latency and tokens on intermediate results.

## The Solution: Code Mode

Code Mode collapses the entire API surface into two tools:

- **`search`** — discover what endpoints exist, on demand
- **`execute`** — write and run code that chains API calls, handles conditionals, and returns only the final result

The LLM never sees the full API spec. It searches for what it needs, then writes a small JavaScript program that does the work server-side. One execution call can replace 10+ round trips.

**The token footprint is fixed**: ~1,000 tokens for the two tool definitions, regardless of how large the underlying API is. This is the approach Cloudflare uses for their production MCP server (2,500 endpoints, ~1,000 tokens).

### Why LLMs Write Code Well

This might seem backwards — asking an LLM to write code instead of calling structured tools. But LLMs are trained on millions of lines of real-world JavaScript and Python. Tool-calling schemas are mostly synthetic training examples. Code is the LLM's native orchestration language. It can express conditionals, loops, error handling, and data transformation that tool schemas cannot.

In Anthropic's own measurements, Code Mode reduced token usage by 37% and improved knowledge retrieval accuracy from 25.6% to 28.5% compared to individual tools.

---

## The Two-Step Workflow

Every interaction follows the same pattern:

```
User: "What are deadmau5's most popular tracks?"

Step 1 — LLM calls search({ query: "user tracks" })
         Server returns: GET /users/search, GET /users/{id}/tracks, ...

Step 2 — LLM calls execute({ code: `
           const users = await audius.request('GET', '/users/search',
             { query: { query: 'deadmau5' } })
           const userId = users.data[0].id
           const tracks = await audius.request('GET', '/users/' + userId + '/tracks',
             { query: { sort: 'plays' } })
           return tracks.data.map(t => ({ title: t.title, plays: t.play_count }))
         `})
         Server returns: [{ title: "Strobe", plays: 42000 }, ...]
```

The LLM discovered the endpoints it needed, wrote a program that chained two API calls, and got the final answer in a single execution. No intermediate round trips.

---

## Effect-TS: Services All the Way Down

The server is built with Effect-TS, a TypeScript framework for building composable, type-safe programs. Every component is an Effect **service** — an interface identified by a unique tag, with an implementation provided via a **Layer**.

### The Service Graph

```
AppConfig           ← reads env vars (AUDIUS_API_KEY, PORT)
    │
    └─► AudiusClient    ← authenticated HTTP client for api.audius.co
            │
SpecLoader          ← fetches + resolves Audius swagger.yaml at startup
    ├─► SpecIndex       ← searchable index over the API spec
    └─► TypeGenerator   ← generates TS declarations for LLM context
            │
Sandbox             ← QuickJS WASM execution environment
    │                    (depends on AudiusClient + TypeGenerator)
    │
McpServer           ← dispatches JSON-RPC to tool handlers
    │                    (depends on SpecIndex + Sandbox + AudiusClient + AppConfig)
    │
McpServerTransport  ← HTTP server on /mcp
```

### Why This Matters

Each service declares its dependencies in its type signature:

```typescript
export const SandboxLive: Layer.Layer<Sandbox, Error, AudiusClient | TypeGenerator>
```

This says: "To build a Sandbox, you must provide an AudiusClient and a TypeGenerator." The compiler enforces this. You cannot start the server with a missing dependency — it's a type error.

At the entry point (`src/index.ts`), all layers are composed:

```typescript
const AppLayer = Layer.mergeAll(
  AppConfigLive,
  SpecIndexLayer,
  SandboxLayer,
  AudiusClientLayer
)
```

This is dependency injection without a DI container. The layers are just values — you can test them, swap them, compose them. The runtime threads services through the entire program automatically.

### The Effect-to-HTTP Bridge

There's a subtle boundary in this architecture: Effect services are synchronous values that produce `Effect.Effect<T, E, R>`, but the HTTP server needs async handlers. The bridge:

```typescript
const runtime = yield* Effect.runtime<SpecIndex | Sandbox | AudiusClient>()

const asyncHandler = async (decoded: unknown): Promise<unknown> => {
  return Runtime.runPromise(runtime)(effectHandler(decoded))
}
```

`Effect.runtime()` captures a snapshot of all provided services. `Runtime.runPromise()` takes that snapshot and runs an Effect inside a Promise — crossing from Effect-land into async-land at the HTTP boundary.

---

## The Sandbox: QuickJS in WASM

LLM-generated code runs in a QuickJS WASM sandbox. This is a JavaScript engine compiled to WebAssembly, running inside Node.js. It has no access to the host filesystem, network, or environment variables. The only way to interact with the outside world is through explicitly injected host functions.

### What the Sandbox Provides

```javascript
// Available inside the sandbox:
audius.request(method, path, options?)  // authenticated API calls
console.log(...)                        // captured, returned to LLM
```

That's it. No `fetch`, no `require`, no `import`, no `fs`, no `process`. The LLM can only call Audius API endpoints through the client we inject.

### Security Properties

1. **No credentials in context.** The API key lives in the server's environment. The sandbox's `audius.request()` is a host function that injects the key server-side. The LLM never sees it.

2. **SSRF protection.** The `AudiusClient` validates that paths start with `/` and don't contain `@`. Combined with a hardcoded base URL (`api.audius.co`), the LLM cannot make requests to arbitrary hosts.

3. **Resource limits.** Each execution has a 64MB memory cap and a 30-second timeout (configurable). The interrupt handler checks elapsed time and kills runaway code.

4. **No state leakage.** Every execution gets a fresh QuickJS context. Nothing persists between calls. One user's code cannot observe another's.

### The Deferred Promise Pattern

The most interesting technical detail in the sandbox is how we handle multiple `await` calls.

QuickJS's `newAsyncifiedFunction` uses Emscripten's asyncify transform, which can only unwind the WASM stack once. This means if the LLM writes:

```javascript
const trending = await audius.request('GET', '/tracks/trending')
const track = await audius.request('GET', '/tracks/' + trending.data[0].id)
return track
```

The first `await` works. The second one silently fails — the stack can't be unwound again.

The fix uses `QuickJSDeferredPromise` instead:

```typescript
// Host side: audius.request is a synchronous function that returns a promise handle
const requestFn = ctx.newFunction("request", (...args) => {
  const deferred = ctx.newPromise()

  // Kick off the API call asynchronously
  apiClient.request(method, path, options).then(
    (result) => {
      deferred.resolve(ctx.newString(JSON.stringify(result)))
      ctx.runtime.executePendingJobs()  // pump the VM event loop
    },
    (error) => {
      deferred.resolve(ctx.newString(JSON.stringify({ error: error.message })))
      ctx.runtime.executePendingJobs()
    }
  )

  return deferred.handle  // return the promise to the VM
})
```

Each `audius.request()` call creates a deferred promise inside the VM, kicks off the real API call on the host, and returns the promise handle. When the host call resolves, it settles the deferred and pumps `executePendingJobs()` to advance the VM's promise chain. A polling loop on the host side waits for all pending promises to settle.

This supports unlimited sequential awaits. The WASM stack is never unwound — all async work happens through JavaScript's native promise machinery inside QuickJS.

---

## The Protocol Layer: MCP from Scratch

This server implements the MCP 2025-11-25 protocol without the official MCP SDK. This was a deliberate choice — the Effect-TS architecture needs a serialization bridge between JSON-RPC and Effect's internal RPC format, which is simpler to build than to adapt from the SDK.

### The Wire Format

MCP uses JSON-RPC 2.0 over HTTP:

```json
// Request
{ "jsonrpc": "2.0", "method": "tools/call", "params": { "name": "search", "arguments": { "tag": "tracks" } }, "id": 1 }

// Response
{ "jsonrpc": "2.0", "id": 1, "result": { "content": [{ "type": "text", "text": "..." }] } }
```

### The Serialization Bridge

`McpSerialization.ts` translates between the wire format and Effect's internal representation:

```
JSON-RPC                          Internal
─────────                         ────────
method: "tools/call"     ──►     tag: "tools/call"
params: { name, args }   ──►     payload: { name, arguments }
id: 1                    ──►     id: "1"

_tag: "Exit"             ◄──     Success/Failure result
requestId: "1"           ◄──     Back to JSON-RPC response
```

This bridge is the only place that knows about both formats. The handler (`McpServer.ts`) works entirely with internal messages. The transport (`McpServerTransport.ts`) works entirely with HTTP.

### Session Management

Sessions are minimal — an in-memory Map of session IDs to creation timestamps:

```typescript
const sessions = new Map<string, { createdAt: number }>()
```

A session is created on `initialize`, validated on subsequent requests via the `MCP-Session-Id` header, and deleted on `DELETE /mcp`. There's no session data beyond the ID itself.

This design is intentionally stateless-ready. Moving to a hosted deployment (Cloud Run, etc.) just means swapping the in-memory Map for an external store (Firestore, Redis). The server itself holds no essential state.

### Error Handling: Three Levels

The MCP protocol has three distinct error levels, and confusing them is a common mistake:

1. **Transport errors** (HTTP status codes) — wrong path (404), wrong method (405), wrong content type (415). The client made a bad HTTP request.

2. **Protocol errors** (JSON-RPC error objects) — malformed JSON (-32700), unknown method (-32601), invalid session (-32600). The client violated the MCP protocol.

3. **Tool errors** (in `CallToolResult` with `isError: true`) — the tool ran but something went wrong. The API returned a 404, the sandbox threw an error, the search found nothing. This is the only level that LLMs should see.

A tool that fails because the Audius API returned a 404 should NOT produce a JSON-RPC error. It should return a successful JSON-RPC response containing a `CallToolResult` with `isError: true`. The LLM can read the error message and adjust its approach. A JSON-RPC error, by contrast, would typically cause the MCP client to disconnect.

---

## The Subgraph: On-Chain Data

The `subgraph` tool provides a direct window into the Audius protocol's on-chain state via The Graph. While the REST API serves application-layer data (tracks, users, playlists), the subgraph serves protocol-layer data:

- **Staking**: how much $AUDIO is staked, by whom, delegation amounts
- **Governance**: proposals, votes, outcomes
- **Nodes**: registered service nodes, endpoints, service types
- **Token events**: claims, slashing, stake changes

This is a simple tool — it takes a GraphQL query string, posts it to The Graph's gateway, and returns the result. No sandbox, no spec parsing. But it fills an important gap: the REST API can tell you about music; the subgraph can tell you about the protocol that stores and delivers it.

---

## The Play Tool: Crossing the Server Boundary

Most MCP tools are pure data — they take input, return output, no side effects. The `play` tool is different: it opens a track on the user's machine.

The flow:
1. Resolve the track (by ID or search query) via the Audius API
2. Check if the Audius desktop app (Electron) is installed at known paths
3. If found, open it with the track URL (`open -a` on macOS, direct exec elsewhere)
4. Otherwise, open the track in the user's default browser

This only works when the server runs locally. For hosted deployments, the tool returns the track URL with metadata and lets the client decide what to do with it.

It's a small but interesting design question: should MCP tools have side effects on the user's machine? The MCP spec's tool annotations (`readOnlyHint`, `destructiveHint`) exist precisely for this — the client can decide whether to auto-approve or prompt the user.

---

## What Code Mode Changes About MCP Server Design

Building this server surfaced some non-obvious design principles:

**The search tool is more important than the execute tool.** If the LLM can't discover the right endpoints, it can't write correct code. The search tool's filtering (by tag, path, method, free text) and its response format (compact endpoint metadata with parameter schemas) determine the quality of everything downstream.

**Tool descriptions are prompts.** The `execute` tool's description includes TypeScript type signatures, example code, and behavioral notes. This is the LLM's instruction manual for using the sandbox. Writing it is prompt engineering, not documentation.

**The sandbox is a trust boundary, not a sandbox.** The name is misleading. It's not just about preventing malicious code — it's about making API credentials invisible to the LLM. The LLM writes `audius.request('GET', '/tracks/trending')` and has no idea that an API key is being injected. This is fundamentally more secure than passing credentials as tool parameters.

**Stateless servers are cheaper servers.** Because every request is self-contained (the API spec is fetched at startup, sessions are just IDs, the sandbox creates fresh contexts), the server can scale to zero on Cloud Run and spin up in seconds. At low usage, the hosting cost is literally zero.

---

## Open Audio Protocol

This server is built on the [Open Audio Protocol](https://openaudio.org) — a decentralized protocol for music storage, streaming, and programmable distribution. Audius is one application built on OAP, providing the REST API and developer toolkit that this server consumes.

The protocol itself is broader: validators run consensus and storage nodes, artists mint fan-club tokens, governance proposals control protocol parameters. The subgraph tool provides a window into this layer, and the architecture is designed to extend to direct OAP integration (gRPC, protobuf) when needed.

You can build on Audius (REST API, fast path) or on OAP directly (run your own indexer via [go-openaudio](https://github.com/OpenAudio/go-openaudio)). This server currently uses the Audius path but the service architecture — with separate `AudiusClient`, `SpecLoader`, and `SpecIndex` services — makes it straightforward to add an `OapClient` alongside without changing the tools or sandbox.
