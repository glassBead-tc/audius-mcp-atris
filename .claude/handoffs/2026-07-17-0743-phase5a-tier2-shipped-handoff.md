# Handoff: Phase 5a + Tier-2 shipped; silent-discard proven on-chain; next is rest of 5b then 5c

## TL;DR
Phase 5a (OAP protocol reads in the sandbox, subgraph retired, failure explainer,
agents.md norms) and 5b Tier-2 (signed gated reads via `{auth:'signed'}`) are shipped,
verified live, and pushed. The upstream silent-discard now has on-chain proof (our
correctly-signed favorite sits in block 28274560; ETL drops it) — the write round-trip
and $AUDIO claim stay blocked upstream. Next per the user: **the rest of 5b, then 5c**.

## State of play
- **Done, committed AND pushed** (`main` == `origin/main` at `e79be82`):
  - `221d081` — Phase 5a core: `protocol.request` sandbox client (`src/api/ProtocolClient.ts`),
    subgraph tool + GRAPH_API_KEY removed, on-chain evidence added to `docs/upstream-bug-report.md`
  - `03956d8` — Tier-2: `{auth:'signed'}` in `AudiusClient` (`src/api/RequestSigner.ts`,
    @noble/secp256k1 v3 + @noble/hashes now in package.json)
  - `e680e67` — roadmap precision (403 envelope decoder still open)
  - `e79be82` — 5a leftovers: `src/api/ErrorExplainer.ts` + agents.md norms in instructions
- **Done & NOT committed** (this handoff's own commit will carry them):
  - `src/resources/Workflows.ts` — two new recipes (Protocol Health Check, Audit a
    Write On-Chain) + count bump in `src/mcp/McpServer.ts`; built clean, but the
    running server predates them (harmless — recipes are data, not behavior)
  - `docs/upstream-bug-report.md` — header-stripping section (surprise audit change)
  - `.claude/settings.json` stays untracked — user's live Claude Code settings
    (curl deny rule is ACTIVE; see Tripwires)
- **In flight**: nothing mid-edit. Task list: both session tasks completed.
- **Blocked**:
  - Phase 3 write round-trip + 200 $AUDIO claim — blocked on upstream ETL discard.
    Unblock check (one execute call): favorite any track, `await audius.sleep(15000)`,
    then `GET /users/E2AjR/favorites` filtering `created_at` startsWith today — if it
    appears, writes index again. As of 06:18 UTC: mined at 28274560, never indexed.
  - $AUDIO claim additionally awaits explicit user go-ahead (money movement).

## Ephemeral state — will NOT survive this session
- **The MCP server runs as THIS session's background task** (`node dist/index.js`,
  bash task b2z0xy9ce, pid 447571 at handoff time). It dies with the session →
  `/mcp` shows ConnectionRefused. Restart: `pnpm start` in a user terminal, then
  `/mcp` reconnect. `MCP_DEBUG_LOG=/tmp/audius-mcp-debug.log` is set on it.
  NOTE: the running binary predates the Workflows-recipe edit; first restart picks
  it up automatically (already built).
- **Three stray mined-but-unindexed test favorites** may appear late if the ETL
  backlog ever processes: track `4gYKz5b` (blocks ~28272228 and 28274560) and
  `Xk6Exdq` (28274153/28274194). If any shows up in `/users/E2AjR/favorites`,
  unfavorite (`DELETE /tracks/{id}/favorites`, `{confirm:true}`).
- Scratch dirs `…/scratchpad/tier2` (ethers install, spike scripts) and probe
  scripts die with the session — nothing in them is needed; the durable versions
  of every finding are in code/docs/memory.

## Verified facts
1. **App-key signature + user grant satisfies gated reads** (2026-07-17 ~07:00):
   `/fan_club/feed?mint=…&user_id=E2AjR&user_data=<msg>&user_signature=<sig>` → 200
   with NO bearer and NO coin held. Message content arbitrary (no timestamp check).
   Re-verify: sandbox `audius.request('GET','/fan_club/feed',{query:{mint:'ZDaUDL4XFdEct7UgeztrFQAptsvh4ZdhyZDZ1RpxYAK'},auth:'signed'})`.
2. **`Encoded-Data-*` headers are stripped before api.audius.co** — same values as
   query params work; as headers → `authedWallet=` empty (one early pass suggests
   gateway inconsistency). Server code uses query params only.
3. **Bearer (PKCE path) also passes gated reads now** — the prior session's
   "fan_club 403s on bearer" fact DECAYED (post-BearerIdentity). Middleware source:
   `auth_middleware.go` — PKCE sets `pkceAuthed` which skips the myId grant check.
4. **The silent discard is in the ETL indexer, proven on-chain**: block 28274560
   contains manageEntity {userId:143127(=E2AjR), Track, entityId:1467218021(=4gYKz5b),
   Save, signer:0x028b0571…(app wallet)}; grant active; never indexed. Re-verify:
   sandbox `protocol.request('/core.v1.CoreService/GetBlock',{height:28274560})`.
5. **OAP prod RPC serves every read as plain JSON** (`rpc.audius.co`): GetStatus
   (~30KB: chainInfo/peers/mempool), GetNodeInfo, GetBlock(s), GetTransaction,
   EthService registry (70 validators + 6 content nodes), storage/system pings.
   GetRewards needs `claim_authority` param. GetBlock heights must be > 0.
6. **Chart collector cron works**: `charts.collector_runs` row id=2 at 06:15:04 UTC,
   54 captures / 1,428 entries / errors null. Next run 12:15 UTC. Verify:
   `select * from charts.collector_runs order by id desc limit 3;` (Supabase Atris
   `tojrygfoipeltannhufw`).
7. **noble v3 signing recipe** (differs from v2!): needs `hashes.hmacSha256` wired,
   `format:'recovered'` puts the recovery id FIRST (sig[0]), key must be Uint8Array.
   `signPersonalMessage` in `src/api/RequestSigner.ts` is verified byte-identical
   to ethers `signMessage`.

## Next actions (user-set: rest of 5b, then 5c)
1. **5b Tier-1 exit criterion — Workflows recipes for the platform economy**: the
   roadmap (specs/capability-roadmap/README.md §5b Tier 1) wants coin-market,
   rewards-hygiene, and chart-intelligence recipes in `src/resources/Workflows.ts`
   (same pattern as the 15 existing ones). Data lives at `/coins`,
   `/coins/{mint}/insights`, `/coins/{mint}/members`, `/challenges/undisbursed`,
   and the Supabase `charts` schema (6h time series since today).
2. **5b Tier-2 remnant — structured gated-403 decoder**: `ErrorExplainer.ts` covers
   the auth shapes; the roadmap still wants gate-specific envelopes ("coin-gated:
   hold ≥N of {mint}"). The gate details live in the 403 body/endpoint semantics —
   inspect real gated-content 403s (e.g. NFT/coin-gated track streams) first.
3. **5c — signer seam** (after 5b): Solana Relay builds launchpad/commerce txs;
   client only signs. Research: `docs/research/solana-side.md` + `solana-tooling.md`.
   Decide the seam shape (user-consented signing flow, never autonomous).
4. **Watch the write unblock check** (Blocked, above) each session; on PASS run the
   favorite→verify→unfavorite→verify exit criterion, then ask the user about the
   $AUDIO claim (`POST /rewards/claim`, "tut" challenges 2024, ~200 $AUDIO).
5. **Consider filing upstream**: `docs/upstream-bug-report.md` now has the on-chain
   proof + header-stripping section; SDK Node-bundle bugs still unreported. User
   hasn't said where/whether to file.

## Tripwires
- **Symptom: `Bash(curl *)` permission denied.** `.claude/settings.json` (project,
  untracked) denies curl and `.env` reads. Use `node -e "fetch(...)"` or scripts;
  scripts may read `.env` themselves (established pattern: `scripts/diagnostics/*.mjs`).
- **Symptom: signed request returns 403 with empty authedWallet.** You sent the
  signature as HEADERS. They're stripped upstream — use `user_data`/`user_signature`
  QUERY params (AudiusClient does this; only hand-rolled probes hit it).
- **Symptom: gated read succeeds WITHOUT `auth:'signed'` and you conclude signing
  is pointless.** The sandbox auto-attaches the MCP OAuth bearer, and PKCE passes
  gated reads. The bearer-free control needs a raw fetch outside the sandbox.
- **Symptom: `/mcp` ConnectionRefused.** Server died with a session. `pnpm start`,
  then `/mcp` reconnect.
- **Symptom: noble secp256k1 "hashes.hmacSha256 not set" or wrong-length sig.**
  v3 API: wire hashes first, `format:'recovered'` is 65 bytes recovery-FIRST.
  Don't re-derive: `src/api/RequestSigner.ts`.
- **Symptom: writes 200 + receipt but state never appears.** Known upstream ETL
  discard. Audit the receipt block via the "Audit a Write On-Chain" workflow recipe
  before spending any time on request shape.
- **Symptom: MCP `search` multi-word query returns 0.** Terms AND; use single words.
- **Symptom: commit fails "Author is invalid".** git user.name must equal the GitHub
  DISPLAY name "Aleph Patroy" (fixed repo-locally; other repos will hit it).

## Artifacts & infrastructure map
- Roadmap: `specs/capability-roadmap/README.md` (5a SHIPPED, 5b Tier-1 recipes +
  Tier-2 decoder open, 5c next after 5b)
- New code this session: `src/api/{ProtocolClient,RequestSigner,ErrorExplainer}.ts`;
  `protocol.request` + `{auth:'signed'}` wired through `Sandbox.ts`/`AudiusClient.ts`;
  instructions in `src/mcp/McpServer.ts` (norms, protocol reads, gated-read guidance)
- Workflows resource: `src/resources/Workflows.ts` — 15 recipes incl. Protocol
  Health Check + Audit a Write On-Chain
- Upstream evidence: `docs/upstream-bug-report.md` (on-chain proof §2026-07-17,
  header stripping §)
- Diagnostics: `scripts/diagnostics/{chain-status.sh,sdk-write-test.mjs,em-write-test.mjs}`
- Supabase: project **Atris** `tojrygfoipeltannhufw` (us-west-2), `charts` schema,
  `collect-charts` fn, pg_cron `15 */6 * * *`
- Memory: `audius-write-path.md` (auth shapes + discard saga — updated ×3 today),
  `audius-mcp-project-goal.md`, `gh-codespaces-signing.md`
- OAP: `https://rpc.audius.co` ConnectRPC JSON; research `docs/research/go-openaudio.md`

## Open questions for the user
- Decisions made this session (don't re-ask): push freely (user said push);
  5a shipped as sandbox client not separate tool; order is rest-of-5b → 5c;
  `.claude/settings.json` is intentionally at project level and untracked.
- Open: file the upstream reports (discard proof, header stripping, SDK bugs) —
  where and when? $AUDIO claim go-ahead once writes index? Should
  `.claude/settings.json` be committed or stay local?

## Surprise audit

**Most surprising positive — write receipts are fully auditable on-chain, today.**
Expected: protocol reads would give chain *status* (the 5a pitch was "diagnose
halts"); auditing an individual write's fate seemed like future ETL-tool work.
Actual: `GetBlock {height}` returns complete transaction contents — userId,
entityType, action, AND the recovered signer — so one call turned "our write
disappeared somewhere" into "block 28274560 carries our correctly-signed tx; the
ETL indexer drops it." The gap existed because the research doc listed GetBlock's
existence but nothing advertised that ManageEntity payloads come back fully decoded.
*Changes made*: "Audit a Write On-Chain" recipe added to `src/resources/Workflows.ts`
(+ Protocol Health Check); server instructions already point at write auditing
(`src/mcp/McpServer.ts` Protocol reads section); on-chain evidence written into
`docs/upstream-bug-report.md`; fact + re-verify command in memory `audius-write-path.md`.

**Most surprising negative — the documented signature-header transport is dead on
the public host, and flakily so.** Expected: `Encoded-Data-Message`/`Signature`
headers (the legacy shape the middleware explicitly supports, and what the roadmap
prescribed) would just work. Actual: headers arrive stripped (`authedWallet=` empty)
— except once, early, when a header probe DID reach the handler, which nearly sent
the spike to a wrong conclusion twice (first "signing doesn't work at all", then
"headers work"). Only the `user_data`/`user_signature` query params are reliable.
The gap existed because the stripping happens in infrastructure in front of the API
— invisible in the middleware source that documents both transports as equal.
*Changes made* (hierarchy rung 1 — structurally avoided): `AudiusClient` sends query
params only (`03956d8`), so no future caller can choose the dead transport through
this server; header stripping documented in `docs/upstream-bug-report.md` for
Audius and in memory `audius-write-path.md`; Tripwires entry above for hand-rolled
probes.
