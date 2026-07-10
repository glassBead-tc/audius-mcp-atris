# Capability Roadmap — Toward a Full Agentic Interface

This folder is the companion to [`specs/agent-experience-alignment/`](../agent-experience-alignment/README.md).
That program makes the server *good to use*; this one makes it *capable*. The goal:
**90–95% coverage of the Audius platform + Open Audio Protocol surface** for LLM agents,
measured against what the platform itself offers developers as of mid-2026.

Unlike the AX specs (present-tense target state), this document is a **journey doc**: six
phases, each with concrete tasks and an exit criterion. It was produced from a three-part
study on 2026-07-09: (a) platform research, (b) an empirical audit driving the deployed
server's own tools, (c) a delta analysis of the codebase against the in-repo
`audius-api` and `openaudio` skills.

## Why now — the platform context

- **Oct 2025**: the Audius protocol hit v1.0 and rebranded to the **Open Audio Protocol
  (OAP)** — "the Global Music Database." Audius is the app; OAP is the network.
- **Audius is explicitly courting agents**: `audius.co/agents.md`, `llms.txt` /
  `llms-full.txt`, and the Feb 2026 post *"Programmable Music for Agents and
  Vibecoders."* This server is the kind of interface they are asking for.
- **Growth surfaces since 2025**: artist coins / fan clubs (Solana SPL coins, Meteora
  bonding curves, 50% of trading fees to artists), reward pools, remix contests,
  Programmable Distribution (`access_authorities` metadata; validators serve only signed
  requests), native DDEX ingestion (DistroKid, Warner Chappell, Kobalt, Downtown Music).
- **Developer surface**: REST `api.audius.co/v1`, gRPC `grpc.audius.co:443`, OAuth 2.0
  PKCE "Log in with Audius" with a `write` scope (uploads, favorites, reposts), The Graph
  subgraph for staking/governance.

## Current state (empirical audit, 2026-07-09)

The spec index holds **221 endpoints across 22 tags**: 167 GET, 33 POST, 5 PUT, 16 DELETE.

**Works today (unauthenticated, server API key)**: trending (all variants), track/user/
playlist search, profiles, playlists, comments, tips, artist-coin reads, gated-content
access-info, resolve, explore, genres, notifications, listen history. POST plumbing is
proven end-to-end (bodies reach the API; only Audius-side auth stops mutations).

**Broken or dishonest**:

| Defect | Evidence | Where |
|---|---|---|
| Big-integer fragility | Wei-scale (10^18+) integer amounts lose precision through `JSON.parse` past 2^53. (The `/tips` garbage values that flagged this turned out to be upstream Audius data — already-wrapped int64 strings — but the parsing hazard is real for any numeric big-int field.) | `src/api/AudiusClient.ts` |
| `/tracks/{id}/stream` chokes | Client follows the redirect, downloads raw MP3 bytes, tries to JSON-parse them | `src/api/AudiusClient.ts` |
| `play` fails on headless hosts | Resolves the track, then errors on `xdg-open: not found` instead of returning the URL (AX-14) | `src/tools/PlayTool.ts` |
| `subgraph` always fails | No `GRAPH_API_KEY` configured; keyless fallback endpoint is dead (AX-13) | `src/tools/SubgraphTool.ts` |
| Doc drift | Instructions say "219 endpoints" (index has 221); `SERVER_INFO.version` says 2.0.0 vs package 2.4.x | `src/mcp/McpServer.ts` |
| Undocumented error shape | `audius.request` resolves failures as `{error: string}`; nothing warns agents to check it | tool descriptions, INSTRUCTIONS |
| Annotation dishonesty | `execute` advertises `destructiveHint: false` yet can issue POST/PUT/DELETE with a pass-through bearer (AX-15) | `src/tools/ExecuteTool.ts` |

**The auth cliff**: `GET /me` → 401; purchases → 403 with empty `authedWallet=`. The
server only *forwards* a bearer token the MCP client already holds
(`src/mcp/McpServerTransport.ts`); it has no way to acquire one. OAuth tools existed in
the pre-Code-Mode 2.1.0 server and were dropped in the rebuild.

**Absent entirely**: chats/DMs and DDEX endpoints (not in the swagger); track uploads
(multipart + signing); every OAP protocol operation except the (broken) staking subgraph.

## Coverage definition

"90–95%" is measured as: *of the tasks an agent could plausibly be asked to do on
Audius/OAP (discovery, curation, social, commerce reads, artist analytics, profile and
library management, publishing, protocol reads), what fraction can this server complete
end-to-end?* Roughly: read surface ≈ 76% of REST endpoints and works today; auth + writes
takes REST to ~95%; the OAP layer covers protocol reads. Deliberately **out of scope**
(the last 5–10%): validator/node operations, DDEX ingestion, autonomous on-chain
signing (coin trading, staking writes), chats/DMs.

## Phases

### Phase 1 — Fix what's broken *(status: complete, 2026-07-09)*

Ship the defect table above. Overlaps with AX R2/R3 items; those keep their AX ids.

1. **P1-1 Big-int-safe JSON** — parse Audius responses so integers beyond
   `Number.MAX_SAFE_INTEGER` survive as strings end-to-end into the sandbox.
2. **P1-2 Binary-response guard** — when a response is not JSON (audio, octet-stream),
   return `{ url }` (the final redirected URL) instead of parsing the body. Makes
   `/tracks/{id}/stream` and `/download` useful.
3. **P1-3 `play` as honest resolver (AX-14)** — always return the resolved track + URLs;
   attempt local open opportunistically; report `opened: true/false`, never fake success,
   never fail when resolution succeeded.
4. **P1-4 Gate `subgraph` (AX-13)** — unconfigured ⇒ not advertised in `tools/list` and
   an honest config-required error if called; remove the dead keyless fallback.
5. **P1-5 Doc/version truth** — derive endpoint count from the live index; report the
   package version.
6. **P1-6 Error-shape docs + annotation honesty (AX-15, part of AX-21)** — document the
   `{error}` result shape in the `execute` description and INSTRUCTIONS;
   `destructiveHint: true` on `execute` with an explicit note that POST/PUT/DELETE
   perform real mutations when a user bearer is present.

**Exit criterion**: the behavioral suite covers each fix; no tool lies about its own
state; amounts and stream URLs are trustworthy.

### Phase 2 — User auth (the big unlock) *(status: implemented 2026-07-09; pending live end-to-end login)*

Implement "Log in with Audius" (OAuth 2.0 + PKCE) so agents can act *as a user*.

Research findings that shaped the design (2026-07-09): Audius shipped a real OAuth 2.0
Authorization Code + PKCE flow in March 2026 (`GET/POST /v1/oauth/authorize|token|revoke`,
opaque 1-hour access tokens, 30-day single-use rotating refresh tokens) but exposes
**no RFC 8414 discovery and no dynamic client registration** — so MCP clients cannot
use Audius directly, and the server brokers instead:

- **Stateless broker** (`src/auth/OAuthBroker.ts`): MCP-spec metadata + RFC 7591 DCR
  + authorize/callback/token/revoke, all flow state sealed with AES-256-GCM under
  `MCP_AUTH_SECRET` (no database). The access token handed to MCP clients IS the
  Audius access token — the existing bearer pass-through is the execution path.
  Scope defaults to `write` (user decision 2026-07-09); an explicit read-only
  request is honored.
- Trade-off accepted: brokered authorization codes are PKCE-bound and expire in
  2 minutes but are not strictly single-use (statelessness).
- Deployment prerequisites: `MCP_AUTH_SECRET` (+ optional `MCP_PUBLIC_URL`) env vars;
  `<public-url>/oauth/callback` registered as a redirect URI on the Audius dev app.
- Writes de-risked: with `scope=write` the API server signs EntityManager transactions
  itself against the user→app consent grant — plain bearer works on write endpoints.
  (This pre-answers Phase 3's spike.)
- **Session-login path (`login` tool)**: Claude Code has a confirmed bug
  (anthropics/claude-code#46140 + #52565) where MCP OAuth completes but the bearer is
  never attached to requests (verified: post-auth requests arrive `auth=none`) and the
  token is never persisted. The `login` tool routes around it: consent URL → our
  callback → in-memory single-active-login store with server-side serialized refresh;
  tool calls without an Authorization header fall back to it. Local-dev note: Audius
  dev-app redirect URIs want `http://127.0.0.1:<port>/oauth/callback` (not
  `localhost`), so `MCP_PUBLIC_URL` should be set accordingly.

**Exit criterion**: an agent connected through a compliant MCP client completes
`GET /me` and reads its own library without any out-of-band token plumbing.

### Phase 3 — Prove writes *(status: PROVEN + IMPLEMENTED 2026-07-10; final in-sandbox round-trip pending restart)*

**RESOLVED.** The full round-trip (favorite → verify-indexed → unfavorite →
verify-indexed) succeeded against the authenticated account using
`Authorization: Basic base64("x:" + AUDIUS_API_SECRET)` + the required `user_id`
query param. Root cause of the earlier silent discards, traced to source
(`AudiusProject/api` `request_helpers.go:64-75` @ b41b8659): when a developer app has
no server-registered `api_secret` (all dashboard-created apps; migration 0189
backfilled NULL), `getApiSigner` silently signs the EntityManager transaction with
Audius's own first-party wallet; consensus performs no authorization, so it mines;
the ETL indexer's `ValidateSigner` finds no grant from the user to that wallet and
discards with only a server-side Warn log. Adjacent upstream defects: access keys
mint but always 401 for such apps; SDK v15 REST writes send no Authorization header
(500). Alternatives: `POST /v1/developer-apps/{address}/register-api-key` (stores the
secret server-side; makes OAuth-bearer writes work — but does not verify secret↔address)
or the legacy `POST /relay` (validates grants loudly pre-submission). Upstream bug
report drafted from the source trace.

**Remaining implementation work** (below) is unchanged, now with a proven auth shape.

---

*(original phase plan, updated with spike history)*

All 54 write endpoints are indexed and transport-callable; none is proven.

**Spike findings (2026-07-10)** — the spike ran; the answer is worse than either
hypothesis. Audius writes are two-phase: the REST call returns 200 with a mined
transaction receipt (`block_number`, `transaction_hash`), and the state change only
exists once the network's indexers apply the transaction. Every third-party delegated
write we produced was **mined and then silently discarded at indexing**:

| Write path | Result |
|---|---|
| First-party (audius.co web app, user wallet) | works, indexes in seconds |
| Grant creation via OAuth consent | works, indexes in seconds |
| REST + OAuth bearer — 2 apps, fresh grant, explicit `user_id`, clean target | 200 + mined tx, never indexed |
| Official `@audius/sdk` 15.3.1 (apiKey+apiSecret) | 500 "missing Authorization header" |
| Developer-app access key as bearer | 401 "Invalid or expired access token" |

Ruled out: missing `user_id` (required per swagger — a real bug in our early calls,
fixed), wrong developer app (Codespace secret shadowing — fixed), stale pre-March-2026
grant (revoked and re-consented; fresh grant indexed instantly, writes still discarded),
platform-wide indexer outage (first-party writes index fine). The official SDK failing
against its own API suggests upstream mid-migration breakage in the 2026 Go API server's
delegated-write path. Source-level trace of `AudiusProject/api` + `OpenAudio/go-openaudio`
in progress; upstream bug report to follow.

**Implications for the server regardless of resolution**:
- A 200 from a write endpoint is NOT proof of effect — the server must teach agents to
  verify indexed state after mutations (or verify server-side) and must surface the
  two-phase semantics in tool docs.
- Remaining plan once upstream is fixed: prove favorite, repost, follow, playlist
  create/update/delete, comments; destructive operations require an explicit
  `confirm: true` guard.

**Exit criterion**: a written test (behind an env-gated flag) performs
favorite → verify-indexed → unfavorite → verify-indexed as the authenticated user.

### Phase 4 — Uploads & commerce

- Multipart support in `AudiusClient` + an `audius.upload()` host function (or SDK
  sidecar if Phase 3's spike demands signing).
- Commerce reads are already solid (purchases, sales CSV/JSON, USDC/AUDIO transactions);
  purchase/tip **writes** need Solana signing — expose as user-consented flows only,
  never autonomous.

**Exit criterion**: an agent uploads a track to a test account; commerce reads are
first-class workflow recipes.

### Phase 5 — OAP protocol layer

- Working subgraph. **Note (2026-07-09)**: with a valid `GRAPH_API_KEY` the gateway
  authenticates, but the pinned deployment (`F8TjrYuTLohz64J8uuDke9htSR1aY9TGCuEjJVVjUJaD`)
  fails every query with `bad indexers: BadResponse(400)` — its lone indexer is broken
  or the subgraph was deprecated in the OAP rebrand. First task: locate the current
  Audius/OAP subgraph (or replace with the protocol dashboard / go-openaudio APIs).
- Evaluate `grpc.audius.co:443` as a second client surface for protocol data.
- Artist coins as first-class workflows (insights, members, volume leaders).
- Teach the server to *explain* Programmable Distribution 403s (`access_authorities`).
- Ingest `agents.md` / `llms-full.txt` into the discovery surface so search matches
  Audius's own canonical LLM docs.

**Exit criterion**: an agent can answer "how is the protocol doing?" (staking, validators,
top artist coins) and diagnose a gated-stream 403 without leaving the server.

### Phase 6 — AX completion (ongoing)

The remaining R2–R4 AX items (`inspect_endpoint`, `audius.paginate`/`sleep`, projection,
prompts) — tracked in the AX specs, listed here because they are what makes Phases 2–5
cheap for agents to actually use.

## Traceability

| Phase | Task ids | Overlapping AX ids |
|---|---|---|
| 1 | P1-1 … P1-6 | AX-13, AX-14, AX-15, AX-21 (partial), AX-18 (partial) |
| 2 | P2 | AX-17/21 (auth docs) |
| 3 | P3 | AX-15 (guard semantics) |
| 4 | P4 | — |
| 5 | P5 | AX-13 (subgraph), AX-20 (workflows) |
| 6 | — | all remaining |

## Known upstream issues (not ours to fix)

- Audius serves **notifications and listen history for arbitrary users without auth**
  (verified 2026-07-09). Platform-side behavior; worth reporting to the Audius team.
- `/tips` returns **int64-wrapped garbage amounts** (e.g. `"-8742554432415203328"`) —
  the corruption is in the API's own payload (verified against the raw endpoint,
  2026-07-09). The server passes them through faithfully.
- The swagger duplicates a few endpoints under hyphen/underscore aliases
  (`fan_club`/`fan-club`, `follow_state`/`follow-state`), slightly inflating counts.
