# 01 — Context Economy: The Projection Membrane

*Domain D-A. After alignment, the server owns the token budget of every byte it emits.*

This is the spine of the alignment. A Code Mode server is a **compressing membrane**
between a fat API and a scarce context window. Before alignment, Atris compressed the tool
*count* but forwarded API *data* 1:1 and unbounded. After alignment, three layered
mechanisms — M1 precision, M2 safe default, M3 hard guarantee — ensure no payload can
overflow an agent's context.

## M3 — The hard output cap (AX-01a) · `src/mcp/ResponseGuard.ts` · R1

`ResponseGuard` is a new module with a single exported chokepoint function, called by
`McpServer.handleToolCall` around **every** tool's result before `CallToolResult.make`.

**Behavior.** Given the serialized result text:

- If it is within the threshold → wrap in the result envelope (M-ENV below) and return.
- If it exceeds the threshold → **do not emit it.** Return a self-contained truncation
  envelope instead:

  ```jsonc
  {
    "truncated": true,
    "errorType": "PAYLOAD_CAPPED",
    "originalChars": 820968,
    "thresholdTokens": 20000,
    "head": "<first ~8 KB of the serialized result>",
    "tail": "<last ~2 KB>",
    "nextActions": [
      "Re-run with detail:'minimal' or options.fields to project the result",
      "Aggregate or slice inside the execute sandbox before returning",
      "See the audius://workflows resource for projection-correct recipes"
    ]
  }
  ```

**Threshold.** Token-denominated and environment-configurable: `RESPONSE_TOKEN_BUDGET`,
default **20,000 tokens** (~10% of a 200K window). Converted to a byte budget at runtime
via a ~3.5 char/token estimate. Naming the knob in *tokens* makes it mean what operators
reason about.

**Guarantees.**
- The truncation envelope is itself bounded well under the threshold (head 8 KB + tail
  2 KB + metadata), so it can never re-trigger the cap.
- The cap is the *primary* guarantee — it covers all 219 endpoints and any agent code,
  including endpoints M2 has no projection profile for.
- `PAYLOAD_CAPPED` is one `errorType` in the unified error model (see
  [`03-sandbox-runtime.md`](./03-sandbox-runtime.md)) — there is one error envelope, not two.

**AX-01b (R3, deferred).** Later, the capped full payload is persisted to a small shared
store and the envelope carries a dereferenceable `ref` (an MCP resource URI) the agent can
`resources/read` on demand. This is deliberately separate from AX-01a because it
introduces a stateful store at odds with the stateless Cloud Run design; AX-01a ships
first with **zero infrastructure dependency**.

## M2 — Default projection (AX-02) · `src/api/Projection.ts` · R2

`Projection` is a new module applied to Audius API responses inside `AudiusClient` /
the sandbox `audius.request` wrapper, **unless the caller opts out**.

**Allowlist, not denylist.** Projection keeps a curated set of fields per **entity type**
(`Track`, `User`, `Playlist`, `Comment`, and a few others — keyed on ~6 core types, not
219 endpoints). New heavy fields added upstream by Audius default to *dropped*. This is the
production-proven choice: a denylist silently leaks every new heavy field; an allowlist
never does. The allowlist is, by construction, a superset of every field the 13 published
workflow recipes read — enforced by a test (see AX-24).

**The `detail` dial.** A single coarse parameter controls verbosity:

| `detail` | Returns |
|---|---|
| `minimal` | Identity fields only (`id`, `title`/`name`, `handle`) |
| `standard` *(default)* | The allowlist — the ~12–15 fields agents actually reason over |
| `full` | Everything (equivalent to `raw: true`) |

An agent rarely knows field names up front but always knows whether it wants "a list", "the
useful subset", or "everything". `detail` is the everyday control; `options.fields` is the
precision override.

## M1 — Opt-in field projection (AX-03) · `src/api/Projection.ts` · R3

`audius.request` accepts `options.fields: string[]` — dot-paths into the response
(`["data.title","data.user.name"]`). A path segment that crosses an array maps
element-wise. A helper `audius.pick(obj, paths)` is available in the sandbox for ad-hoc use.

**Precedence:** explicit `fields` or `detail` always beats the M2 default.

## M-ENV — The self-describing result envelope (AX-04) · `src/mcp/ResponseGuard.ts` · R2

Every tool result carries a small, honest meta header so the membrane never acts
silently and the agent can correlate request ↔ response when juggling calls:

```jsonc
{
  "_meta": {
    "tool": "execute",
    "detail": "standard",
    "projected": true,
    "droppedKeys": ["artwork", "stream", "*_cid", "...wallet"],
    "upstreamItems": 100,        // so the agent sees the membrane WORKED,
    "truncated": false           // not that the data was naturally small
  },
  "...": "the actual result"
}
```

`upstreamItems` and `droppedKeys` are deliberate: they prevent a good fix (projection)
from creating a new blind spot (the agent forgetting the underlying API is huge and
looping `audius.request` assuming each call is cheap).

## Measured target

| Case | Before | After |
|---|---|---|
| `search({tag:"tracks"})` | 779,603 chars | ~8.5 KB (compact rows — see [`02`](./02-discovery-and-tools.md)) |
| `execute` returning trending, `detail:standard` | 820,968 chars | ~15–25 KB |
| Any result, any tool, any agent code | could be unbounded | **≤ `RESPONSE_TOKEN_BUDGET`, always** |

## Definition of done

- [ ] `ResponseGuard.finalize()` wraps all five tools' results in `McpServer`.
- [ ] No call in the AX-24 corpus produces a result above `RESPONSE_TOKEN_BUDGET`.
- [ ] `Projection` is default-on for Audius responses; `detail` and `fields` override it.
- [ ] Every result carries `_meta` with `projected` / `droppedKeys` / `truncated`.
- [ ] The truncation envelope is itself provably below the threshold.
