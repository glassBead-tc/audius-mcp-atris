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
| Big-integer overflow | `/tips` amounts return as garbage (e.g. `-8742554432415203328`) — wei-scale ints lose precision through JSON parsing | `src/api/AudiusClient.ts`, `src/sandbox/Sandbox.ts` |
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

### Phase 1 — Fix what's broken *(status: in progress)*

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

### Phase 2 — User auth (the big unlock)

Implement "Log in with Audius" (OAuth 2.0 + PKCE) so agents can act *as a user*.

- MCP-native path: the server implements the MCP 2025-11-25 authorization spec as an
  OAuth resource server with Audius as the upstream IdP; the existing stateless bearer
  pass-through stays as the execution path.
- Fallback path for clients without MCP auth support: a documented manual flow
  (authorize URL out, token in via `Authorization` header).
- Scope handling: `read` vs `write`; INSTRUCTIONS explain what each unlocks.

**Exit criterion**: an agent connected through a compliant MCP client completes
`GET /me` and reads its own library without any out-of-band token plumbing.

### Phase 3 — Prove writes

All 54 write endpoints are indexed and transport-callable; none is proven.

- **Spike first (open risk)**: do Audius REST writes accept a plain OAuth bearer, or do
  they require EntityManager wallet-signing as the JS SDK does? Test favorite/unfavorite
  against a real account. The answer shapes everything below (worst case: an SDK-backed
  signing sidecar for writes).
- Prove and document: favorite, repost, follow, playlist create/update/delete, comments.
- Safety: destructive operations (DELETE, unfollow, playlist deletion) require an
  explicit `confirm: true` in the sandbox call or equivalent guard.

**Exit criterion**: a written test (behind an env-gated flag) performs
favorite → verify → unfavorite as the authenticated user.

### Phase 4 — Uploads & commerce

- Multipart support in `AudiusClient` + an `audius.upload()` host function (or SDK
  sidecar if Phase 3's spike demands signing).
- Commerce reads are already solid (purchases, sales CSV/JSON, USDC/AUDIO transactions);
  purchase/tip **writes** need Solana signing — expose as user-consented flows only,
  never autonomous.

**Exit criterion**: an agent uploads a track to a test account; commerce reads are
first-class workflow recipes.

### Phase 5 — OAP protocol layer

- Working subgraph (key configured; staking/governance/validator queries verified).
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
- The swagger duplicates a few endpoints under hyphen/underscore aliases
  (`fan_club`/`fan-club`, `follow_state`/`follow-state`), slightly inflating counts.
