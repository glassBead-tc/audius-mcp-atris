# 03 — Sandbox Runtime

*Domain D-C. After alignment, the QuickJS sandbox either matches the agent's mental model
of a JavaScript runtime or explicitly declares where it does not.*

The sandbox was previously built to satisfy the *server's* needs (isolation, the
deferred-promise trick for sequential awaits, a memory cap) and exposed a silent *subset*
of JavaScript. Every gap between an agent's "this is Node/browser JS" prior and the actual
subset was a trap sprung blind. Alignment has two halves: **widen the surface cheaply**,
and **declare the boundary**.

## Console polyfill (AX-08) · `src/sandbox/Sandbox.ts` · R1

Before alignment only `console.log` existed; `console.error` / `console.warn` /
`console.info` were `undefined`, so an unwrapped `console.error("…")` — a near-universal
debugging reflex — threw `TypeError: not a function` and failed the **entire** execute.

After alignment, `console.error`, `console.warn`, `console.info`, and `console.debug` are
all defined and routed to the same captured-output buffer as `console.log`, each prefixed
with its level (`[warn]`, `[error]`, …). ~6 lines. The footgun is gone.

## Structured error model — error-as-directive (AX-09) · `AudiusClient.ts`, `Errors.ts`, `Sandbox.ts` · R2

Errors are read by the **model**, not a human. An error is a recovery script. Before
alignment, an API failure surfaced inside the sandbox as
`{ error: "Audius API 401: {\"code\":401,\"error\":\"…\"}" }` — JSON nested inside a
string inside a field, with no recovery guidance.

After alignment, `audius.request` has an **asymmetric** contract:

- **Success** — returns the Audius JSON **byte-identical to today** (top-level
  `{ data: … }`). Every existing workflow recipe keeps working verbatim.
- **Failure** — resolves (never throws) a typed recovery directive:

  ```jsonc
  {
    "ok": false,
    "errorType": "AUTH_REQUIRED",
    "status": 401,
    "message": "Endpoint /me/favorites needs a user bearer token; this session has none.",
    "context": { "path": "/me/favorites", "method": "GET" },
    "nextActions": [
      "Tell the user this requires connecting their Audius account",
      "If a user id is known, call the public endpoint /users/{id}/favorites instead"
    ],
    "prohibition": "Do not retry this call verbatim — it will fail identically."
  }
  ```

`src/api/Errors.ts` (new) defines the `errorType` enum and a builder that maps an HTTP
status / failure mode to a directive. The enum:

`AUTH_REQUIRED` · `RATE_LIMITED` · `NOT_FOUND` · `BAD_PATH` · `BAD_PARAMS` ·
`UPSTREAM_ERROR` · `TIMEOUT` · `PAYLOAD_CAPPED` · `REQUEST_BUDGET` · `SUBGRAPH_UNCONFIGURED`

The existing query-shape validation error in `AudiusClient` (which already returns a
correct example) is the *template* this model generalizes — it is preserved, not replaced.
`PAYLOAD_CAPPED` is shared with `ResponseGuard` (see [`01`](./01-context-economy.md)) — one
error envelope, not two.

Errors return structured **data**, not thrown exceptions — this is deliberate and matches
the documented best practice ("the LLM needs to read the error, not catch it") and keeps
the published workflows working.

## Host-fetch timeout + request budget (AX-10) · `Sandbox.ts`, `AudiusClient.ts` · R2

Before alignment, the QuickJS interrupt handler bounded only CPU time; the host-side loop
awaiting Audius `fetch` calls had no timeout, and there was no cap on how many
`audius.request` calls one execute could make.

After alignment:

- Each `AudiusClient` call is wrapped in `Effect.timeout` — a per-call bound (default
  ~10 s) that can never exceed the execute's overall budget. On timeout the call resolves
  `{ ok:false, errorType:"TIMEOUT", … }`.
- A **per-execution request counter** caps `audius.request` calls (default 64,
  configurable). On breach, further calls resolve `{ ok:false,
  errorType:"REQUEST_BUDGET", message:"request budget exhausted (64) — batch or
  aggregate", … }`. The counter is per-execution, not global, so concurrent executes do
  not interfere. This protects the upstream Audius API and the shared server API key.

## Cooperative pacing & pagination helpers (AX-11, AX-12) · `Sandbox.ts` · R3

- `audius.sleep(ms)` — a cooperative delay backed by a host timer, bounded to ≤5 s and
  counted against the execute timeout. Lets agents pace loops; closes the "no `setTimeout`"
  surprise.
- `audius.paginate(path, { query, pageSize, max })` — walks Audius pagination, returns a
  single flat array bounded by `max`, each element projected per the default projection.
  Chained multi-page fetches no longer each balloon.

## The sandbox capability manifest (AX-19) · resource `audius://sandbox/runtime` · R2

The boundary is now **declared**, not discovered by trial. A resource describes exactly
what the QuickJS environment provides and lacks:

```jsonc
{
  "engine": "QuickJS (WASM)", "memoryLimitMB": 64, "defaultTimeoutMs": 30000,
  "freshContextPerCall": true,
  "present":  ["Date","Math","JSON","RegExp","Map","Set","Promise","TypedArrays",
               "console.{log,error,warn,info,debug}"],
  "absent":   ["fetch","setTimeout","crypto","TextEncoder"],
  "provided": {
    "audius.request(method,path,options?)": "returns API JSON on success, a typed error directive on failure",
    "audius.sleep(ms)": "cooperative delay, ≤5000ms",
    "audius.paginate(path,opts)": "flatten paginated endpoints",
    "audius.pick(obj,paths)": "dot-path projection helper",
    "audius.types": "the generated API type declarations (also at audius://api/types)"
  },
  "limits": { "requestBudgetPerExecute": 64, "perRequestTimeoutMs": 10000 },
  "responseEnvelope": "List endpoints wrap their payload in { data: [...] }"
}
```

## What did not change

The `QuickJSDeferredPromise` mechanism that enables sequential `await`s — subtle and
correct — is untouched. The 64 MB memory cap and fresh-context-per-execution remain. The
new features augment the sandbox; they do not disturb the promise-pumping loop.

## Definition of done

- [ ] `console.error/warn/info/debug` are defined and captured.
- [ ] API failures resolve as typed `{ok:false, errorType, nextActions, …}` directives.
- [ ] API successes are byte-identical to the pre-alignment shape.
- [ ] No execute can exceed its declared timeout via a hung host fetch.
- [ ] `audius.request` is request-budget capped per execution.
- [ ] `audius://sandbox/runtime` resource exists and is accurate.
