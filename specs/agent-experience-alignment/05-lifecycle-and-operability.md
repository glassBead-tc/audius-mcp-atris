# 05 — Lifecycle & Operability

*Domain D-G. After alignment, the server boots resiliently, survives fleet-level load,
is observable, and is guarded by behavioral tests.*

These concerns are invisible to a per-call view of the server, which is why the original
six-domain frame missed them. They are real agent-experience issues: a server that will
not boot, or that fails opaquely under concurrent load, is the worst possible experience.

## Startup resilience (AX-22) · `src/api/SpecLoader.ts`, `specs/openapi-spec.yaml` · R3

Before alignment, `SpecLoader` fetched `https://api.audius.co/v1/swagger.yaml` at boot
with no fallback — an Audius docs outage meant Atris would not start, and every cold Cloud
Run instance re-fetched and re-parsed the whole spec before serving its first request.

After alignment:

- **Network-first, bundled-fallback.** `SpecLoader` tries the network; on failure it loads
  the vendored `specs/openapi-spec.yaml` (already present in the repo — 500 KB, today
  unused). An Audius outage degrades Atris to a slightly stale spec, not an outage.
- **Startup health gate.** The spec source (`network` | `bundled`), version, and load
  time are recorded.
- **`/health` reports spec status.** The existing health endpoint returns
  `{ status, specSource, specVersion, specLoadedAt }` so operators and load balancers can
  see spec provenance.

## Hot-read cache & rate-limit handling (AX-23) · `src/api/Cache.ts` *(new)*, `AudiusClient.ts` · R3

The server authenticates public reads with a single shared `AUDIUS_API_KEY`. Under
concurrent agents, one agent's burst can cause another's calls to 429 — a failure with no
local cause, maximally confusing.

After alignment:

- **`src/api/Cache.ts`** — a per-instance TTL cache (30–60 s) for hot, idempotent reads
  (`/tracks/trending`, `/users/search` keyed by query). A cache hit serves the same bytes
  with zero upstream calls — a context-economy win as well as a load win. Per-instance and
  best-effort, by design (Cloud Run instances are ephemeral); only slow-moving data is
  cached.
- **Honest 429s.** An upstream 429 surfaces as the typed error
  `{ ok:false, errorType:"RATE_LIMITED", retryAfter:<seconds>, … }` (see
  [`03-sandbox-runtime.md`](./03-sandbox-runtime.md)), so an agent never misdiagnoses a
  fleet-level rate limit as its own bug.

## Behavioral test suite (AX-24) · `test/` *(new)* · R1

Before alignment, `pnpm test` ran the build — zero behavioral coverage. Every change in
this alignment is a behavior change to an untested server. The payload bomb itself is
exactly the defect a single assertion would have caught.

After alignment, `test/` holds a thin behavioral suite, wired to `pnpm test`, asserting:

- **Payload-size bounds** — every call in a representative corpus produces a result below
  `RESPONSE_TOKEN_BUDGET`; specifically `search({tag:"tracks"})` ≤ ~10 KB.
- **Error shape** — each `errorType` produces a directive carrying `nextActions`.
- **Truncation envelope** — its shape is correct and its size is provably below the
  threshold.
- **Projection / recipe compatibility** — the AX-02 allowlist is a superset of every
  field the 13 published workflow recipes read (this is the [`02`](./02-discovery-and-tools.md)
  conflict check, frozen as a test).
- **The strengths that must not regress** — the SSRF path guard, the query-shape
  validation error, the no-filter `search` tag list, sequential `await` in the sandbox.

This suite is part of **Release 1** — not for agent impact, but because every later
release is a behavior change that needs a net. It belongs to CI; agent experience becomes
*enforced*, not *vigilance-dependent*.

## Progress & observability (AX-25) · `McpServer.ts`, `Sandbox.ts`, `McpNotifications.ts` · R3

Before alignment, a long `execute` was a silent freeze, and an operator had no per-call
visibility — the agent experience could not be measured.

After alignment:

- **Progress notifications.** `execute` emits MCP progress notifications (via the existing
  `McpNotifications` channel) around each `audius.request` — e.g. "call 3/10: GET
  /users/123/tracks" — so the agent and any watching human see liveness.
- **Per-call structured logs.** Each tool call logs `{ tool, durationMs, bytesOut,
  truncated, errorType, requestCount }`. Operators can finally measure the rate of
  truncation, timeouts, and `subgraph` failures — the metrics that say whether the AX
  program is working.

## Validation metrics

These are the numbers a passing alignment produces, measured via the AX-24 suite and the
AX-25 logs:

| Metric | Before | Target after |
|---|---|---|
| Max tool-result size | up to 820 KB | ≤ `RESPONSE_TOKEN_BUDGET` (default 20K tokens) |
| Tokens for a representative task | ~250 K (with overflow) | < 5 K |
| Tool calls per task | 6+ | ≤ 4 |
| `console.error` survival | kills the execute | captured |
| Production truncation rate | n/a | trends toward ~0 once projection lands |

## Definition of done

- [ ] `SpecLoader` falls back to `specs/openapi-spec.yaml`; `/health` reports spec status.
- [ ] Hot idempotent reads are cached; 429s surface as `RATE_LIMITED` with `retryAfter`.
- [ ] `pnpm test` runs the behavioral suite; the suite asserts payload bounds, error
      shape, truncation-envelope size, and recipe/projection compatibility.
- [ ] `execute` emits progress notifications; every tool call is structured-logged.
