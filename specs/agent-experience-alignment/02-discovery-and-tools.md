# 02 — Discovery Layer & Honest Tool Contracts

*Domains D-B (discovery) and D-D (tool honesty). After alignment, discovery is split into
a cheap finder and a focused describer, and every tool's word matches its world.*

## The discovery problem, recapped

Before alignment, `search` answered a question agents rarely ask: "give me full metadata
*and* a fully-expanded response schema for *all* endpoints matching a filter" — the
cartesian product of breadth and depth. The agent's real questions are two, and separate:

- **Q1 — "what endpoints relate to X?"** → a wide, cheap *list*, one line per endpoint.
- **Q2 — "I picked endpoint E; what are its exact params and response shape?"** → *depth*,
  for one endpoint.

After alignment the verb is split: `search` answers Q1, `inspect_endpoint` answers Q2.

## `search` — bounded endpoint finder (AX-05) · `SpecIndex.ts` + `SearchTool.ts` · R1

`search` keeps its name (no rename churn) but its behavior is fixed.

**Input:** `{ query?, tag?, method?, path?, limit?=30, cursor? }` — and, optionally,
`code?` (see AX-07 below).

**Output:** compact ranked rows, never an embedded `responseSchema`:

```jsonc
{
  "total": 49,
  "shown": 30,
  "nextCursor": "30",
  "endpoints": [
    { "method": "GET", "path": "/tracks/trending",
      "operationId": "Get Trending Tracks",
      "summary": "Gets the top 100 trending tracks…",   // truncated to ~100 chars
      "tags": ["tracks"], "requiresAuth": false }
    // …
  ]
}
```

**Ranking.** Results are scored, not returned in arbitrary index order: exact
path/`operationId` match > summary match > description match > tag-only match; ties broken
by shorter path (more central). Cursor-based pagination follows the MCP-native idiom
(`nextCursor`, `total`); an invalid cursor resets gracefully to the start.

**No-filter call** keeps today's good behavior: the tag list + counts + example queries.
An empty result set is a teaching moment, not a blank: it returns `nextActions` suggesting
a broader query.

**Measured target:** the 779,603-char `search({tag:"tracks"})` becomes **~8,495 chars**
(92:1) — all 49 tracks-tag endpoints in one readable result.

### AX-07 — optional `code` escape hatch (R3)

`search` also accepts `code: string` — a JavaScript async arrow function run against the
in-memory spec index (the Cloudflare / Thoughtbox style). This lets a capable agent answer
novel structural questions ("which POST endpoints take a body field X"). It is **opt-in**;
the structured filter path remains the default so weaker/faster models are never forced to
generate spec-query code.

## `inspect_endpoint` — one-endpoint deep view (AX-06) · `InspectEndpointTool.ts` *(new)* · R2

**Input:** `{ path, method?="GET" }`.

**Output:** everything an agent needs to call exactly one endpoint correctly:

```jsonc
{
  "method": "GET", "path": "/tracks/trending",
  "operationId": "Get Trending Tracks",
  "summary": "…", "description": "…",
  "parameters": [
    { "name": "genre", "in": "query", "required": false,
      "type": "string", "description": "…", "enum": ["Electronic", "…"] }
  ],
  "responseEnvelope": "{ data: Track[] }",
  "responseSchema": { /* depth-capped to 2; leaf objects show their key names */ },
  "requiresAuth": false,
  "example": "await audius.request('GET','/tracks/trending',{ query:{ genre:'Electronic', limit:10 } })"
}
```

**Depth-2 schema with leaf key names.** The schema is capped at depth 2, but at the cap it
lists the *field names* of leaf objects rather than recursing or stubbing — so the agent
learns "a track has a `user` object with these keys" without the depth-3 explosion that
caused the original payload bomb. `requiresAuth` is derived from the spec's security field
/ path heuristic, so the agent learns auth needs *before* a 401.

## Honest tool contracts (Domain D-D)

A false tool description is worse than a missing tool: a missing tool is a known-unknown;
a lying tool is an unknown-unknown the agent cannot detect. After alignment, every tool's
advertised capability is conditioned on its deployed ability.

### `play` — honest resolver (AX-14) · `PlayTool.ts` · R3

The deployed server runs on Cloud Run — a headless container, not the user's device. A
server-side process **cannot** open media on a remote user's machine. `play` is therefore
reframed from a (failing) *action* into a *resolver*:

- It resolves the track (by `trackId` or `query`) and **returns** `{ track: {title,
  artist}, webUrl, deepLink: "audius://…" }`.
- It **never** reports `status: "playing"` — it cannot observe playback, so it never
  claims it.
- Opening the URL belongs to the MCP client, which runs beside the user.
- The system-`exec` openers survive only behind an explicit `ATRIS_LOCAL_STDIO` build
  flag for genuine local-stdio deployments.

### `subgraph` — gated on configuration (AX-13) · `SubgraphTool.ts` + `AppConfig.ts` · R3

The Graph's decentralized gateway requires an API key for every query; the keyless
`PUBLIC_ENDPOINT` is dead code and is removed. After alignment:

- `GRAPH_API_KEY` is provisioned as a Cloud Run secret (`cloudbuild.yaml`).
- The existing URL-embedded-key endpoint form is correct and current — **no Bearer-header
  migration is needed** (verified against The Graph's docs).
- If `GRAPH_API_KEY` is **absent at startup**, `subgraph` is **not advertised** in
  `tools/list` at all. A tool that cannot work does not appear armed. (If a deployment
  prefers to keep it listed, it instead returns one honest typed error,
  `errorType: "SUBGRAPH_UNCONFIGURED"`, never a misleading "missing authorization header".)

### Annotation honesty (AX-15) · `tools/*.ts` · R3

- `play` is annotated `readOnlyHint: true` — *true* once it is a pure resolver.
- `execute` is annotated `destructiveHint: true` and its description states that write
  methods (POST/PUT/DELETE) require a user bearer token and perform real mutations.
- `search`, `inspect_endpoint`, `subgraph` remain `readOnlyHint: true` (correct).

## Definition of done

- [ ] `search` never returns a `responseSchema`; rows are ranked; pagination is cursor-based.
- [ ] `search({tag:"tracks"})` ≤ ~10 KB.
- [ ] `inspect_endpoint` exists, returns depth-capped schema + `requiresAuth` + example.
- [ ] `play` returns URLs and never claims playback on a remote deployment.
- [ ] `subgraph` is registered only when `GRAPH_API_KEY` is set, or fails honestly.
- [ ] Every tool annotation matches its actual behavior.
