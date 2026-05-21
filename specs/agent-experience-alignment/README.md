# Agent Experience Alignment — Target-State Specification

This folder describes the **state of the Atris MCP server codebase after** it has been
brought into alignment with the agent-experience (AX) improvement study of 2026-05-21.

These documents are written in the **present tense and describe the destination, not the
journey** — read them as "this is how the server works once the alignment process is
complete." They are the *definition of done* for the AX program. A developer (or the
`audius-mcp-dev` skill) implementing the work should be able to check each subsystem
against the relevant document and know whether the target state has been reached.

## Why this exists

Atris is a Code Mode MCP server: it exposes the 219-endpoint Audius API to LLM agents
through a tiny tool surface plus a JavaScript sandbox. The study found that Atris had
implemented Code Mode's *first half* — compressing the **call surface** (a handful of
tools instead of 219) — but not its *second half* — compressing the **data volume** that
flows back to the agent. Measured consequences on the deployed server:

| Symptom | Measured | Status after alignment |
|---|---|---|
| `search({tag:"tracks"})` payload | 779,603 chars (~200K tokens) | bounded ≤ token threshold |
| `execute` returning raw `/tracks/trending` | 820,968 chars | bounded ≤ token threshold |
| `console.error()` in the sandbox | throws `TypeError`, kills the execute | captured like `console.log` |
| `subgraph` tool | every query fails (no Graph key) | gated on config; honest when unconfigured |
| `play` tool | opens nothing on a remote host, reports false success | honest resolver, never claims playback |

The alignment program is **25 improvements (AX-01 … AX-25)** across **7 domains**. None is
large-effort; all are additive on the existing Effect-TS architecture. No rewrite.

## How to read this folder

| Document | Subsystem it describes (post-alignment) |
|---|---|
| [`00-target-architecture.md`](./00-target-architecture.md) | The whole server at a glance: file tree, layers, tool & resource surface |
| [`01-context-economy.md`](./01-context-economy.md) | The projection membrane — output cap, default projection, result envelopes |
| [`02-discovery-and-tools.md`](./02-discovery-and-tools.md) | `search` / `inspect_endpoint`, and the honest contract of all five tools |
| [`03-sandbox-runtime.md`](./03-sandbox-runtime.md) | The QuickJS sandbox: console, errors, timeouts, budgets, helpers |
| [`04-learning-surface.md`](./04-learning-surface.md) | Instructions, resources, prompts, and the exposed type declarations |
| [`05-lifecycle-and-operability.md`](./05-lifecycle-and-operability.md) | Startup resilience, caching, tests, observability |

## Releases

The 25 improvements ship in three releases plus a deferred convergence release. Each
release has a crisp exit criterion; a subsystem document marks which release each part of
its target state belongs to.

| Release | Theme | Exit criterion |
|---|---|---|
| **R1 — Stop the harm** | AX-24, 01a, 05, 17, 08 | No tool result exceeds the token threshold; the documented flow no longer self-defeats |
| **R2 — Make it good** | AX-09, 02, 04, 06, 19, 20, 10 | An agent completes a music task in ≤4 calls and self-recovers from errors |
| **R3 — Harden** | AX-13, 14, 15, 16, 18, 21, 22, 23, 25, 01b, 03, 07, 11, 12 | Server is truthful, teachable, operable; behavioral suite green |
| **R4 — Converge** *(deferred)* | Move toward the 1-tool pure-Code-Mode form | Telemetry shows structured discovery is no longer load-bearing |

The **minimum viable release** is three fixes — **AX-01a** (output cap), **AX-05**
(bounded `search`), **AX-17** (honest instructions) — which flip the server from
context-hostile to safe in a single focused session.

## Traceability matrix

Every improvement, the file(s) it lives in after alignment, and its release.

| ID | Improvement | Primary file(s) — post-alignment | Release |
|---|---|---|---|
| AX-01a | Hard output cap (token-denominated) | `src/mcp/ResponseGuard.ts` *(new)* | R1 |
| AX-01b | Capped payload persisted as dereferenceable ref | `src/mcp/ResponseGuard.ts`, result store | R3 |
| AX-02 | Default per-entity-type allowlist projection + `detail` dial | `src/api/Projection.ts` *(new)* | R2 |
| AX-03 | Opt-in `options.fields` dot-path projection | `src/api/Projection.ts`, `src/sandbox/Sandbox.ts` | R3 |
| AX-04 | Self-describing result envelope | `src/mcp/ResponseGuard.ts` | R2 |
| AX-05 | `search` → bounded ranked `find_endpoints` rows | `src/api/SpecIndex.ts`, `src/tools/SearchTool.ts` | R1 |
| AX-06 | New `inspect_endpoint` tool | `src/tools/InspectEndpointTool.ts` *(new)* | R2 |
| AX-07 | Optional `code` escape hatch on `search` | `src/tools/SearchTool.ts` | R3 |
| AX-08 | Console polyfill (`error`/`warn`/`info`/`debug`) | `src/sandbox/Sandbox.ts` | R1 |
| AX-09 | Structured error-as-directive model | `src/api/AudiusClient.ts`, `src/api/Errors.ts` *(new)*, `src/sandbox/Sandbox.ts` | R2 |
| AX-10 | Host-fetch timeout + per-execute request budget | `src/sandbox/Sandbox.ts`, `src/api/AudiusClient.ts` | R2 |
| AX-11 | Cooperative `audius.sleep(ms)` | `src/sandbox/Sandbox.ts` | R3 |
| AX-12 | `audius.paginate()` sandbox helper | `src/sandbox/Sandbox.ts` | R3 |
| AX-13 | Gate `subgraph` on `GRAPH_API_KEY` | `src/AppConfig.ts`, `src/tools/SubgraphTool.ts`, `cloudbuild.yaml` | R3 |
| AX-14 | Reframe `play` as an honest resolver | `src/tools/PlayTool.ts` | R3 |
| AX-15 | Annotation honesty | `src/tools/*.ts` | R3 |
| AX-16 | Transport error-leak fix | `src/mcp/McpServerTransport.ts` | R3 |
| AX-17 | Correct `INSTRUCTIONS` content | `src/mcp/McpServer.ts` | R1 |
| AX-18 | Documentation derived from registries | `src/mcp/McpServer.ts` | R3 |
| AX-19 | Expose type declarations + sandbox manifest | `src/mcp/McpServer.ts`, `src/sandbox/TypeGenerator.ts` | R2 |
| AX-20 | Workflows registered as MCP prompts | `src/mcp/Prompts.ts` *(new)*, `src/resources/Workflows.ts` | R2 |
| AX-21 | Document the `{data}` envelope + auth needs | `src/sandbox/TypeGenerator.ts`, `src/mcp/McpServer.ts` | R3 |
| AX-22 | Bundled fallback spec | `src/api/SpecLoader.ts`, `specs/openapi-spec.yaml` *(already vendored)* | R3 |
| AX-23 | Hot-read cache + 429 handling | `src/api/AudiusClient.ts`, `src/api/Cache.ts` *(new)* | R3 |
| AX-24 | Behavioral test suite | `test/` *(new)* | R1 |
| AX-25 | Progress notifications + per-call observability | `src/mcp/McpServer.ts`, `src/sandbox/Sandbox.ts`, `src/mcp/McpNotifications.ts` | R3 |

## The governing principle

> **The Locality Principle** — put the right information, in the right form, at the moment
> the agent needs it, and nowhere else.

Every defect the study found is a mismatch between *where structure lives* and *where the
agent looks*. Every improvement in this folder moves information to the point of need.
