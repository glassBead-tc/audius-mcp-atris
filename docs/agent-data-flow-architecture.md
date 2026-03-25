# Audius MCP Server — Agent Data Flow Architecture

The Audius MCP server is a **Code Mode** MCP server: instead of exposing hundreds of individual tools, it gives LLM agents two tools — `search` (to discover API endpoints from the bundled OpenAPI spec) and `execute` (to run JavaScript against the Audius REST API inside a QuickJS WASM sandbox). All traffic arrives over Streamable HTTP at `POST /mcp` using the MCP 2025-11-25 protocol.

## Key Files

| File | Role |
|------|------|
| `src/index.ts` | Entry point — Effect layer composition, HTTP server startup |
| `src/AppConfig.ts` | Effect Config service — reads `AUDIUS_API_KEY` and `PORT` env vars |
| `src/mcp/McpServerTransport.ts` | HTTP server, session management, body parsing, CORS |
| `src/mcp/McpSerialization.ts` | Bidirectional JSON-RPC 2.0 ↔ internal Effect RPC message bridge |
| `src/mcp/McpServer.ts` | Method dispatcher (`initialize`, `tools/list`, `tools/call`, etc.) |
| `src/mcp/McpSchema.ts` | Full MCP 2025-11-25 spec ported to Effect Schema + `@effect/rpc` |
| `src/mcp/McpNotifications.ts` | Inbound/outbound notification dispatcher (not wired in current server path) |
| `src/tools/SearchTool.ts` | `search` tool — queries `SpecIndex` |
| `src/tools/ExecuteTool.ts` | `execute` tool — delegates to `Sandbox` |
| `src/api/SpecLoader.ts` | Fetches `swagger.yaml` from `api.audius.co`, resolves `$ref` |
| `src/api/SpecIndex.ts` | Builds searchable in-memory index from resolved spec |
| `src/api/AudiusClient.ts` | Thin fetch wrapper — injects API key, validates paths against SSRF |
| `src/sandbox/Sandbox.ts` | QuickJS WASM context: injects `audius.request`, `console.log`, timeout/memory limits |
| `src/sandbox/TypeGenerator.ts` | Generates compact TS declaration string from spec for LLM context |

---

## Diagram 1 — Full Agent Interaction Sequence

This diagram traces the complete round trip for a typical two-step agent session: the agent first calls `search` to discover endpoints, then calls `execute` to run code against the API. Each step shows the exact message format at every layer boundary.

```mermaid
sequenceDiagram
    autonumber
    participant Agent as LLM Agent
    participant Transport as McpServerTransport<br/>(Node HTTP)
    participant Serial as McpSerialization<br/>(mcpJson parser)
    participant Server as McpServer<br/>(handler)
    participant SearchTool as SearchTool
    participant SpecIndex as SpecIndex<br/>(in-memory)
    participant ExecuteTool as ExecuteTool
    participant Sandbox as Sandbox<br/>(QuickJS WASM)
    participant AudiusClient as AudiusClient
    participant AudiusAPI as Audius REST API<br/>(api.audius.co)

    note over Agent,Transport: ── Session Initialization ──

    Agent->>Transport: POST /mcp<br/>{"jsonrpc":"2.0","method":"initialize","id":1,"params":{...}}
    Transport->>Serial: parser.decode(body)
    Serial-->>Transport: [{_tag:"Request", id:"1", tag:"initialize", payload:{...}}]
    Transport->>Server: handler({_tag:"Request", id:"1", tag:"initialize",...})
    Server-->>Transport: {_tag:"Exit", requestId:"1", exit:{_tag:"Success", value:{protocolVersion,...}}}
    Transport->>Serial: parser.encode(exit)
    Serial-->>Transport: '{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-11-25",...}}'
    Transport-->>Agent: HTTP 200 + MCP-Session-Id header<br/>{"jsonrpc":"2.0","id":1,"result":{...}}

    Agent->>Transport: POST /mcp [MCP-Session-Id: session-1-xxx]<br/>{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}
    Transport-->>Agent: HTTP 202 (notification — no response body)

    note over Agent,Transport: ── Step 1: Discover Endpoints ──

    Agent->>Transport: POST /mcp [MCP-Session-Id: session-1-xxx]<br/>{"jsonrpc":"2.0","method":"tools/call","id":2,<br/>"params":{"name":"search","arguments":{"tag":"tracks"}}}
    Transport->>Serial: parser.decode(body)
    Serial-->>Transport: [{_tag:"Request", id:"2", tag:"tools/call",<br/>payload:{name:"search", arguments:{tag:"tracks"}}}]
    Transport->>Server: handler(decoded)
    Server->>SearchTool: handleSearch({tag:"tracks"})
    SearchTool->>SpecIndex: specIndex.search({tag:"tracks"})
    SpecIndex-->>SearchTool: EndpointMeta[] (filtered list)
    SearchTool-->>Server: CallToolResult {content:[{type:"text", text:JSON}]}
    Server-->>Transport: {_tag:"Exit", requestId:"2", exit:{_tag:"Success", value:{content:[...]}}}
    Transport->>Serial: parser.encode(exit)
    Serial-->>Transport: '{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"..."}]}}'
    Transport-->>Agent: HTTP 200<br/>{"jsonrpc":"2.0","id":2,"result":{"content":[...]}}

    note over Agent,Transport: ── Step 2: Execute Code Against API ──

    Agent->>Transport: POST /mcp [MCP-Session-Id: session-1-xxx]<br/>{"jsonrpc":"2.0","method":"tools/call","id":3,<br/>"params":{"name":"execute","arguments":{"code":"return await audius.request('GET','/tracks/trending')"}}}
    Transport->>Serial: parser.decode(body)
    Serial-->>Transport: [{_tag:"Request", id:"3", tag:"tools/call",<br/>payload:{name:"execute", arguments:{code:"..."}}}]
    Transport->>Server: handler(decoded)
    Server->>ExecuteTool: handleExecute({code:"..."})
    ExecuteTool->>Sandbox: sandbox.execute(code, timeout?)
    Sandbox->>Sandbox: newAsyncContext() — fresh QuickJS VM
    Sandbox->>Sandbox: inject console.log, audius.request host fns
    Sandbox->>Sandbox: evalCodeAsync(wrappedCode)
    Sandbox->>AudiusClient: audiusClient.request("GET", "/tracks/trending")
    AudiusClient->>AudiusAPI: fetch https://api.audius.co/v1/tracks/trending<br/>[x-api-key header]
    AudiusAPI-->>AudiusClient: HTTP 200 JSON response
    AudiusClient-->>Sandbox: parsed JSON result
    Sandbox->>Sandbox: JSON.stringify → ctx.newString → return to VM
    Sandbox->>Sandbox: executePendingJobs, ctx.dump returnValue, ctx.dispose()
    Sandbox-->>ExecuteTool: SandboxResult {output:[], returnValue:{data:[...]}}
    ExecuteTool-->>Server: CallToolResult {content:[{type:"text", text:"=== Return Value ===\n..."}]}
    Server-->>Transport: {_tag:"Exit", requestId:"3", exit:{_tag:"Success", value:{content:[...]}}}
    Transport->>Serial: parser.encode(exit)
    Transport-->>Agent: HTTP 200<br/>{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"..."}]}}
```

### Wire Format Details

The serialization bridge (`McpSerialization.ts`) performs two translations on every request/response cycle:

**Inbound (JSON-RPC → internal):**
```json
// Wire: JSON-RPC 2.0
{"jsonrpc":"2.0","method":"tools/call","id":3,"params":{"name":"execute","arguments":{"code":"..."}}}

// Internal: Effect RPC message
{"_tag":"Request","id":"3","tag":"tools/call","payload":{"name":"execute","arguments":{"code":"..."}},"headers":[]}
```

**Outbound (internal → JSON-RPC):**
```json
// Internal: Effect Exit value
{"_tag":"Exit","requestId":"3","exit":{"_tag":"Success","value":{"content":[{"type":"text","text":"..."}]}}}

// Wire: JSON-RPC 2.0
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"..."}]}}
```

Note that numeric IDs are preserved as numbers (`id: 3` not `"3"`) — the bridge uses `toWireId()` which round-trips the string back to a number only when `String(Number(id)) === id`.

---

## Diagram 2 — Component Architecture

This diagram shows every Effect service (`Context.Tag`), its dependencies, and how all components are composed into the application layer in `src/index.ts`.

```mermaid
classDiagram
    direction TB

    class AppConfig {
        <<Effect Service>>
        +apiKey: string
        +port: number
        -- env vars --
        AUDIUS_API_KEY
        PORT (default 3000)
    }

    class SpecLoader {
        <<Effect Service>>
        +spec: OpenApiSpec
        -- fetches at startup --
        https://api.audius.co/v1/swagger.yaml
        resolves all $ref inline
    }

    class SpecIndex {
        <<Effect Service>>
        +search(filters) EndpointMeta[]
        +getAllTags() string[]
        +getEndpointCount() number
        -- in-memory index --
        IndexedEndpoint[] with searchText
    }

    class TypeGenerator {
        <<Effect Service>>
        +declarations: string
        -- generated at startup --
        declare const audius TypeScript decls
    }

    class AudiusClient {
        <<Effect Service>>
        +request(method, path, options?) Effect~unknown~
        -- SSRF guard: path must start with / --
        -- injects x-api-key header --
        BASE_URL = https://api.audius.co/v1
    }

    class Sandbox {
        <<Effect Service>>
        +execute(code, timeoutMs?) Effect~SandboxResult~
        -- QuickJS WASM per-call context --
        -- memory limit: 64MB --
        -- default timeout: 30s --
    }

    class McpServerTransport {
        <<Node HTTP Server>>
        +POST /mcp
        +DELETE /mcp
        +OPTIONS /mcp
        -- session Map~string, createdAt~ --
        -- MAX_BODY_BYTES: 1MB --
        -- CORS via MCP_ALLOW_ORIGIN --
    }

    class McpSerialization {
        <<Bridge>>
        +mcpJson RpcSerialization
        +mcpNdJson RpcSerialization
        decode(bytes) InternalMsg[]
        encode(internal) string|undefined
    }

    class McpServer {
        <<Dispatcher>>
        createHandler() McpEffectHandler
        initialize → serverInfo + caps
        tools/list → [search, execute]
        tools/call → SearchTool | ExecuteTool
        ping, resources/list, prompts/list
    }

    class SearchTool {
        <<Tool Handler>>
        +searchToolDefinition Tool
        +handleSearch(args) Effect~CallToolResult~
    }

    class ExecuteTool {
        <<Tool Handler>>
        +executeToolDefinition Tool
        +handleExecute(args) Effect~CallToolResult~
    }

    SpecLoader <-- SpecIndex : depends on
    SpecLoader <-- TypeGenerator : depends on
    AppConfig <-- AudiusClient : depends on
    AudiusClient <-- Sandbox : depends on
    TypeGenerator <-- Sandbox : depends on
    SpecIndex <-- SearchTool : yield* SpecIndex
    Sandbox <-- ExecuteTool : yield* Sandbox
    SearchTool <-- McpServer : calls handleSearch()
    ExecuteTool <-- McpServer : calls handleExecute()
    McpSerialization <-- McpServerTransport : parser.decode / parser.encode
    McpServer <-- McpServerTransport : asyncHandler wraps effectHandler

    note for McpServerTransport "Runtime bridges Effect → async:\nRuntime.runPromise(runtime)(effectHandler(decoded))"
    note for Sandbox "Fresh QuickJS context per execute() call.\naudius.request is a host function bridging\nback to AudiusClient via Effect.runPromise"
```

### Layer Composition Order

`src/index.ts` builds the dependency graph bottom-up:

```
AppConfigLive
  └── AudiusClientLayer
        └── SandboxLayer ←── TypeGeneratorLayer ←── SpecLoaderLayer
                                                         └── SpecIndexLayer

AppLayer = merge(AppConfigLive, SpecIndexLayer, SandboxLayer)
```

The `Runtime<SpecIndex | Sandbox>` is materialized once at startup and reused for every HTTP request, so services are not re-initialized per call.

---

## Diagram 3 — Execute Tool Sandbox Data Flow

This diagram zooms into the `execute` tool's sandbox, showing the exact data transformations as user code flows into the QuickJS VM and results flow back out. This is the most complex data path in the system.

```mermaid
sequenceDiagram
    autonumber
    participant ET as ExecuteTool
    participant SB as Sandbox.execute()
    participant QJS as QuickJS VM<br/>(newAsyncContext)
    participant Host as Host Bridge<br/>(JS→Effect)
    participant AC as AudiusClient
    participant API as api.audius.co

    ET->>SB: execute(code="return await audius.request('GET','/tracks/trending')", timeout=30000)

    note over SB,QJS: Context Initialization
    SB->>QJS: newAsyncContext() — isolated WASM VM
    SB->>QJS: runtime.setMemoryLimit(64MB)
    SB->>QJS: runtime.setInterruptHandler(→ Date.now()-start > timeout)
    SB->>QJS: inject console.log (captures to output[])
    SB->>QJS: inject audius.request (newAsyncifiedFunction)
    SB->>QJS: ctx.setProp(global, "__userCode__", newString(code))
    SB->>QJS: ctx.setProp(global, "__apiDecls__", newString(declarations))

    note over SB,QJS: Code Execution
    SB->>QJS: evalCodeAsync(wrappedCode)
    note right of QJS: wrappedCode wraps audius.request<br/>to auto-parse JSON, then runs:<br/>new AsyncFunction("audius","console", __userCode__)
    QJS->>QJS: evaluate user code as async function

    note over QJS,API: API Call (crosses VM boundary)
    QJS->>Host: audius.request("GET", "/tracks/trending") [host fn call]
    Host->>AC: Effect.runPromise(audiusClient.request("GET", "/tracks/trending"))
    AC->>AC: validate path (must start with /, no @)
    AC->>API: fetch https://api.audius.co/v1/tracks/trending<br/>headers: {Accept: application/json, x-api-key: ...}
    API-->>AC: HTTP 200 {data: [...tracks...]}
    AC-->>Host: unknown (parsed JSON)
    Host->>Host: JSON.stringify(result)
    Host-->>QJS: ctx.newString(jsonStr) → QuickJS value
    QJS->>QJS: JSON.parse(jsonStr) → JS object (auto-wrap in wrappedCode)

    note over SB,QJS: Result Extraction
    QJS-->>SB: QuickJS handle (success or error)
    SB->>SB: ctx.dump(resultHandle.value) → JS object
    SB->>SB: resultHandle.value.dispose()
    SB->>QJS: ctx.dispose() — VM destroyed, all handles freed

    SB-->>ET: SandboxResult {output:[], returnValue:{data:[...]}, error:undefined}
    ET->>ET: formatResult(output, returnValue) → text string
    ET-->>ET: CallToolResult {content:[{type:"text", text:"=== Return Value ===\n{...}"}]}
```

### Isolation Invariants

Three mechanisms enforce sandboxed execution:

1. **Memory cap** — `runtime.setMemoryLimit(64MB)`. If user code allocates past this, the VM throws before reaching the host.
2. **Interrupt handler** — checked on every VM tick. If `Date.now() - startTime > timeout`, QuickJS throws an "interrupted" exception into the running code.
3. **Fresh context per call** — `newAsyncContext()` is called at the top of each `execute()` invocation and `ctx.dispose()` is called in the `finally` block. No state survives between calls.

The host function (`audius.request`) crosses the WASM boundary via `newAsyncifiedFunction`. The result is round-tripped through JSON (`JSON.stringify → ctx.newString → JSON.parse`) because there is no direct complex-object bridge between the WASM heap and the Node.js heap — only primitive QuickJS handles can cross the boundary cheaply.

User code is stored in `__userCode__` as a string rather than interpolated into `wrappedCode` directly, preventing template-literal injection attacks where an API spec summary containing a backtick could escape the template string context.

---

## Diagram 4 — Startup / Initialization Lifecycle

This diagram shows the order of Effect layer initialization from `SIGINT`/`SIGTERM` to the server being ready to accept requests.

```mermaid
flowchart TD
    A([process.start]) --> B[Effect.runFork: program]
    B --> C{provide AppLayer}

    C --> D[AppConfigLive\nreads env vars synchronously]
    C --> E[SpecLoaderLive\nfetch swagger.yaml]
    C --> F[AudiusClientLive\nreads AppConfig]

    E --> G{YAML parse +\nresolve all $ref}
    G -->|success| H[SpecLoaderLive ready\nspec: OpenApiSpec]
    G -->|failure| ERR1([Effect.fail: Error\nprocess exits])

    H --> I[SpecIndexLive\nbuildIndex over spec.paths]
    H --> J[TypeGeneratorLive\ngenerateDeclarations from spec]

    I --> K[SpecIndexLive ready\nN endpoints, M tags]
    J --> L[TypeGeneratorLive ready\ndeclarations: string]

    F --> M[AudiusClientLive ready\nrequest() closure with apiKey]

    M --> N[SandboxLive\nacquires AudiusClient + TypeGenerator]
    L --> N
    N --> O[SandboxLive ready\nexecute() closure]

    D --> P[program: AppConfig yields port]
    K --> P
    O --> P

    P --> Q[createHandler\nMcpEffectHandler closure]
    Q --> R[Effect.runtime — materializes\nRuntime for SpecIndex + Sandbox]
    R --> S[asyncHandler bridge\nRuntime.runPromise wraps effectHandler]
    S --> T[startServer acquireRelease\nHttp.createServer + listen on PORT]

    T --> U([Server ready\nPOST /mcp accepting requests])

    U --> V{SIGINT / SIGTERM}
    V --> W[Fiber.interrupt]
    W --> X[acquireRelease cleanup:\nserver.close]
    X --> Y([Process exits cleanly])

    style ERR1 fill:#c00,color:#fff
    style A fill:#090,color:#fff
    style U fill:#090,color:#fff
    style Y fill:#555,color:#fff
```

### Startup Dependency Constraints

Two paths run in parallel once `SpecLoaderLive` completes:

- `SpecLoader → SpecIndex` — builds the search index (CPU-bound, proportional to number of paths in the spec)
- `SpecLoader → TypeGenerator` — generates TypeScript declarations (CPU-bound, also proportional to spec size)

`SandboxLive` blocks until both `AudiusClientLive` (fast — synchronous) and `TypeGeneratorLive` (depends on SpecLoader) are ready.

The `Effect.runtime<SpecIndex | Sandbox>()` call in `program` captures a pre-built runtime that includes all required services. This is the bridge from the Effect world to the `async`/`await` world of the Node.js HTTP handler — it is materialized once and reused for the entire server lifetime.

If `SpecLoaderLive` fails (network unreachable, non-200 response), `Effect.runFork` propagates the defect and the process exits before the HTTP server starts.

---

## Diagram 5 — Session Lifecycle State Machine

The transport layer maintains a simple session registry (`Map<string, {createdAt: number}>`). This diagram shows how session state transitions on each request.

```mermaid
stateDiagram-v2
    [*] --> NoSession: Agent connects

    NoSession --> Initialized: POST /mcp initialize\n→ 200 + MCP-Session-Id header\nsessions.set(sessionId, {createdAt})

    NoSession --> Rejected: POST /mcp any other method\nwithout valid session\n→ 404 Session not found

    Initialized --> Initialized: POST /mcp tools/call, ping,\ntools/list, etc.\n[MCP-Session-Id validated]

    Initialized --> Terminated: DELETE /mcp\nsessions.delete(sessionId)\n→ 204

    Terminated --> [*]
    Rejected --> [*]

    note right of Initialized
        Session object: { createdAt: number }
        No TTL enforcement in current implementation.
        Session counter is process-global (resets on restart).
    end note
```

### Session ID Format

Session IDs are generated as `session-${++counter}-${Date.now().toString(36)}`. The counter is a module-level `let sessionCounter = 0` — it is not shared across process restarts or multiple server instances. The `Date.now().toString(36)` suffix adds base-36 timestamp entropy to reduce collision probability.

---

## Diagram 6 — MCP Protocol Message Taxonomy

This diagram shows all MCP methods the server handles and their response strategies, as implemented in `McpServer.ts`.

```mermaid
flowchart LR
    A[POST /mcp\nJSON-RPC message] --> B{tag / method}

    B -->|initialize| C[Return serverInfo\n+ capabilities\n+ instructions string]
    B -->|ping| D[Return empty object]
    B -->|tools/list| E[Return searchToolDefinition\n+ executeToolDefinition]
    B -->|tools/call| F{name}
    B -->|logging/setLevel| G[Return empty — no-op]
    B -->|resources/list| H[Return empty list]
    B -->|resources/templates/list| I[Return empty list]
    B -->|prompts/list| J[Return empty list]
    B -->|completion/complete| K[Return empty completion]
    B -->|notifications/*\nno id| L[Silently acknowledge\nreturn undefined]
    B -->|unknown| M[Return -32601\nMethod not found]

    F -->|search| N[handleSearch → SpecIndex]
    F -->|execute| O[handleExecute → Sandbox]
    F -->|unknown| P[Return -32602\nUnknown tool]

    style C fill:#2a6,color:#fff
    style E fill:#2a6,color:#fff
    style N fill:#26a,color:#fff
    style O fill:#26a,color:#fff
    style M fill:#c00,color:#fff
    style P fill:#c00,color:#fff
```

The server declares `capabilities: { tools: {} }` in the `initialize` response, signalling that it supports the tools capability but not resources, prompts, logging, or sampling. Requests for those capabilities are handled gracefully (empty lists) rather than returning method-not-found errors, which ensures compatibility with MCP clients that enumerate capabilities before use.
