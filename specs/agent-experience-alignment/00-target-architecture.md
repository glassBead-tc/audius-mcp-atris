# 00 — Target Architecture

*The Atris MCP server as a whole, after agent-experience alignment.*

## What did not change

The alignment is **additive on a sound core**. These remain exactly as they are today:

- The **Effect-TS service/layer architecture** — every component is a `Context.Tag`
  service composed via `Layer`; `index.ts` provides all layers and starts the server.
- **Code Mode** as the organizing pattern — the agent discovers endpoints and writes
  JavaScript that runs in a sandbox, instead of facing 219 individual tools.
- **Streamable HTTP transport** on a single `/mcp` endpoint, stateless, protocol
  version `2025-11-25`.
- The **QuickJS WASM sandbox** with a fresh context per execution.
- Direct REST calls via `AudiusClient` — no `@audius/sdk`.
- The SSRF path guard in `AudiusClient`, and the exemplary query-shape validation error
  (which becomes the *template* the new error model generalizes).

Alignment is roughly **26 targeted edits and 5 new files**. There is no rewrite and no
large-effort item.

## Post-alignment file tree

```
src/
├── index.ts                    # Entry point — unchanged in shape; provides new layers
├── AppConfig.ts                # + graphApiKey already present; subgraph gating reads it
├── api/
│   ├── SpecLoader.ts           # + network-first / bundled-fallback spec load (AX-22)
│   ├── SpecIndex.ts            # search() now returns compact ranked rows (AX-05)
│   ├── AudiusClient.ts         # + typed errors (AX-09), timeouts (AX-10), cache (AX-23)
│   ├── Projection.ts           # NEW — allowlist projection + detail dial (AX-02/03)
│   ├── Errors.ts               # NEW — AudiusError types + recovery-directive builder (AX-09)
│   └── Cache.ts                # NEW — per-instance TTL cache for hot reads (AX-23)
├── mcp/
│   ├── McpSchema.ts            # unchanged (MCP 2025-11-25 spec)
│   ├── McpSerialization.ts     # unchanged
│   ├── McpNotifications.ts     # used by execute progress notifications (AX-25)
│   ├── McpServerTransport.ts   # + generic internal-error responses (AX-16)
│   ├── McpServer.ts            # derived INSTRUCTIONS (AX-17/18), resources & prompts wiring
│   ├── ResponseGuard.ts        # NEW — output cap + result envelope chokepoint (AX-01/04)
│   └── Prompts.ts              # NEW — the 13 workflows as MCP prompts (AX-20)
├── api/SpecIndex.ts            # (see above)
├── resources/
│   └── Workflows.ts            # single source of truth for the 13 recipes
├── sandbox/
│   ├── Sandbox.ts              # console polyfill, error model, budgets, helpers
│   └── TypeGenerator.ts        # declarations now exposed + document the {data} envelope
└── tools/
    ├── SearchTool.ts           # bounded find_endpoints behavior (AX-05), code hatch (AX-07)
    ├── InspectEndpointTool.ts  # NEW — one-endpoint deep view (AX-06)
    ├── ExecuteTool.ts          # routes results through ResponseGuard
    ├── PlayTool.ts             # honest resolver (AX-14)
    └── SubgraphTool.ts         # gated on config (AX-13)

test/                           # NEW — behavioral suite (AX-24)
specs/openapi-spec.yaml         # wired as the offline fallback spec (AX-22)
```

New files: `api/Projection.ts`, `api/Errors.ts`, `api/Cache.ts`, `mcp/ResponseGuard.ts`,
`mcp/Prompts.ts`, `tools/InspectEndpointTool.ts`, and the `test/` directory.

## The request path, after alignment

Every tool result now passes through a single chokepoint before it reaches the wire:

```
agent → POST /mcp → McpServer.handleToolCall
                      ├── search           → SpecIndex (compact ranked rows)
                      ├── inspect_endpoint  → SpecIndex (one endpoint, depth-capped)
                      ├── execute           → Sandbox → AudiusClient (+Projection, +Cache)
                      ├── play              → AudiusClient (resolve only)
                      └── subgraph          → (only registered if GRAPH_API_KEY set)
                                   │
                                   ▼
                        ResponseGuard.finalize()   ← THE chokepoint
                        • applies the result envelope (AX-04)
                        • enforces the token cap (AX-01a)
                                   │
                                   ▼
                              CallToolResult → wire
```

`ResponseGuard.finalize()` is the structural guarantee: **no payload can leave the server
above the configured token threshold**, regardless of which tool produced it or how large
the upstream Audius response was.

## Tool surface, after alignment

Five tools. Each has a single clean responsibility and an honest annotation.

| Tool | Role | `readOnlyHint` | Notes |
|---|---|---|---|
| `search` | Find endpoints — compact ranked rows; optional `code` query | true | Bounded by construction |
| `inspect_endpoint` | Describe one endpoint — params, depth-capped schema, example | true | New (AX-06) |
| `execute` | Run JavaScript against the Audius API in the sandbox | false | `openWorldHint: true` |
| `play` | Resolve a track to openable URLs | true | No longer shells out remotely (AX-14) |
| `subgraph` | Query the Audius protocol subgraph | true | **Only advertised when `GRAPH_API_KEY` is set** (AX-13) |

Tool count is 5, still a ~40× compression versus 219 endpoints. The convergence release
(R4) may later retire `search`/`inspect_endpoint` into the resource channel, approaching
the 1-tool ideal — but only once telemetry shows structured discovery is no longer
load-bearing for less capable caller models.

## Resource & prompt surface, after alignment

Resources cost zero call-surface (they are not tools) and are the primary *learning*
surface:

- `audius://workflows` — the 13 analysis recipes (unchanged content, now also surfaced as prompts).
- `audius://api/types` — the generated TypeScript declarations for the whole API (AX-19).
- `audius://sandbox/runtime` — the sandbox capability manifest (AX-19).

Prompts (AX-20): the 13 workflows are each registered as a parameterized MCP prompt
(`audius:rising-stars`, `audius:genre-report`, `audius:artist-compare`, …) returning a
projection-correct `execute` body.

## Versioning

The alignment is a significant agent-experience overhaul and is released as **v3.0.0**.
`SERVER_INFO.version` in `McpServer.ts` is corrected to match the package version (today
they disagree — package/CHANGELOG say 2.4.x, `SERVER_INFO` says 2.0.0).
