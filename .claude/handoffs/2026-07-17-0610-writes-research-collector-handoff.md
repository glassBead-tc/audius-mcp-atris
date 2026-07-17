# Handoff: bearer writes verified, chain halt diagnosed, OAP research + chart collector shipped, /handoff skill built

## TL;DR
The MCP-OAuth → app-signed write chain is verified correct server-side, but Audius
writes still receipt-then-discard upstream even after today's chain halt recovered —
Phase 3's live round-trip remains blocked on Audius, not us. The Phase 5 roadmap was
reshaped after a four-track research sweep, and the trending time-series collector is
live in Supabase on a 6h cron. Next: OAP `protocol` tool spike (5a) and the Tier-2
signed-request spike, both buildable regardless of the write outage.

## State of play
- **Done & committed** (all signed, on `main`, **not pushed**):
  - `b37ede4` — BearerIdentity: MCP OAuth bearer → verified userId → app-signed writes
  - `7a82ef0` — Phase 5 reshape + `docs/research/` (4 research docs)
  - `f7eb905` — `/handoff` skill + two-iteration eval workspace
  - (this handoff's own commit follows it)
- **Done & NOT committed**: `.claude/skills/settings.json` — misplaced Claude Code
  settings file (deny rules for curl/.env that do nothing in that location). Left for
  the user to delete or relocate; do not commit it silently.
- **In flight**: Phase 3 exit criterion (favorite→verify→unfavorite→verify as the
  authed user). Blocked upstream — see Verified facts #2.
- **Blocked**:
  - Phase 3 round-trip + the 200 $AUDIO rewards claim — blocked on upstream write
    indexing. Unblock check: run a favorite via `execute`, then verify it appears in
    `/users/E2AjR/favorites` within ~30s. A cheap pre-check: does the user's own
    in-app favorite (first-party write) index? If not, the outage is total.
  - The $AUDIO claim additionally awaits explicit user go-ahead (money movement).

## Ephemeral state — will NOT survive this session
- **The MCP server runs in THIS session's background shell** (`node dist/index.js`,
  started ~03:42 after I killed the user's terminal copy to deploy the BearerIdentity
  fix). When this session ends the server dies and `/mcp` will show ConnectionRefused.
  Restart: `pnpm start` in a user terminal (or `pnpm dev` to rebuild first), then
  reconnect with `/mcp`. `MCP_DEBUG_LOG=/tmp/audius-mcp-debug.log` carries `[auth]`
  identity-resolution lines (ids only, never tokens).
- **Two stray mined-but-unindexed favorites** may appear late if the upstream indexer
  processes its backlog: track `4gYKz5b` (blocks ~28272228) and `Xk6Exdq`
  (28274153/28274194, both auth shapes). If either ever shows up in
  `/users/E2AjR/favorites`, unfavorite it (`DELETE /tracks/{id}/favorites`,
  `{confirm:true}`) — they were test writes.
- Scratchpad copies of the SDK diagnostics died with this session — already rescued
  into `scripts/diagnostics/` (see Artifacts).

## Verified facts
1. **The server's write chain is correct end-to-end** (2026-07-17): Claude Code
   attaches the MCP OAuth bearer; `BearerIdentity` verifies it via `GET /me`
   (userId=E2AjR resolves, cached); app-signing engages. Proof/discriminator: sandbox
   `GET /me {auth:'app', query:{user_id:'LKdlD'}}` → 403 with
   `authedWallet=0x028b0571…` (the app wallet). Empty `authedWallet=` means no valid
   signature reached upstream.
2. **Upstream writes are broken independently of us.** Timeline: mainnet halted at
   block 28272228 (~03:28 UTC); recovered by 06:02 (28274119+, verify:
   `scripts/diagnostics/chain-status.sh`). Post-recovery, BOTH app-signed and
   bearer-signed favorites mine (receipts at 28274153/28274194) and then never index
   — the silent-discard failure, now on a healthy chain, pointing at the ETL indexing
   pipeline. Bearer writes no longer 500 as they did during the halt. Credentials are
   NOT the issue: secret's derived address = `0x028b…` (matches app), grant active
   (`GET /grantees/0x028b0571b497d65faf19aef806a797f17a18e19b/users` → E2AjR).
3. **@audius/sdk 15.3.1 Node bundle is doubly broken for writes**: REST writes send
   no Authorization header (500 "missing Authorization header"); `*WithEntityManager`
   methods exist in .d.ts but not the Node runtime. Workaround assembled in
   `scripts/diagnostics/em-write-test.mjs` (manual `EntityManagerClient`); the relay
   path fails loudly and honestly (`tx waiting timeout` during the halt).
4. **The chart collector is live and healthy.** Supabase project **Atris**
   (`tojrygfoipeltannhufw`): `charts` schema, `collect-charts` edge function,
   pg_cron `15 */6 * * *` (anon key in Vault). First manual run: 54 captures /
   1,428 entries / 57 coins / 0 errors in 30s. Verify:
   `select * from charts.collector_runs order by id desc limit 3;` — first scheduled
   run was due 06:15 UTC today and was NOT yet verified as of handoff.
5. **Fun fact with data behind it**: "What You Want" sat at #14 on Downtempo trending
   at collection time (`charts.entries` join `charts.captures` genre='Downtempo').

## Next actions
1. **Verify the collector's first cron-triggered run** (due 06:15 UTC):
   `charts.collector_runs` should show a second row with errors null.
2. **Phase 5a spike — the `protocol` tool**: POST plain JSON to ConnectRPC on
   `rpc.audius.co` (e.g. `core.v1.CoreService/GetStatus`-equivalent; service/method
   enumeration in `docs/research/go-openaudio.md`). Goal: chain status, blocks,
   validators from the sandbox. Retires the dead `subgraph` tool.
3. **Tier-2 spike — signed-request headers** (`Encoded-Data-Message`/`Signature`,
   eth personal-sign with the app key) in `AudiusClient`, to test whether app-key +
   grant unlocks gated reads (`/fan_club/feed` 403s with empty authedWallet on
   bearer). Independent of the write outage.
4. **Re-run the write round-trip when upstream recovers** (see Blocked for the
   check). On PASS: ask the user, then `POST /rewards/claim` for the 200 unclaimed
   $AUDIO ("tut" challenges, 2024) — first revenue through the server.
5. **Push the day's commits** when the user says so (4 commits ahead of origin).
6. Consider filing/updating upstream reports: post-recovery silent discards
   (fact #2) extends the existing `docs/upstream-bug-report.md`; SDK Node-bundle
   findings (fact #3) are unreported.

## Tripwires
- **Symptom: `gpg failed to sign the data … 403 | Author is invalid` on commit.**
  Cause: GitHub Codespaces signing validates git `user.name` against the GitHub
  **display name** — the user renamed theirs to "Aleph Patroy", breaking the old
  "glassBead" config. Fixed repo-locally (`git config user.name "Aleph Patroy"`);
  other repos in this Codespace will still hit it. The error message lies — it's
  the name, not the email.
- **Symptom: writes return 200 + block_number but state never appears.** Not proof
  of anything — run `scripts/diagnostics/chain-status.sh` first (halted chain), and
  even when advancing, verify indexed state before believing any write (fact #2).
- **Symptom: write receipts have `block_number` at TOP level, not under `.data`.**
  Favorite/unfavorite responses are unwrapped; `r.data.block_number` throws. Use
  `(r.data && r.data.block_number) || r.block_number`.
- **Symptom: `/mcp` ConnectionRefused.** The server was running in a session-owned
  shell (see Ephemeral state). `pnpm start`, then `/mcp` reconnect.
- **Symptom: MCP `search` with multi-word `query` returns 0.** Terms appear to AND;
  search single words (`favorite`, not `favorite unfavorite tracks`).

## Artifacts & infrastructure map
- Roadmap: `specs/capability-roadmap/README.md` (Phase 5a–5d reshaped today)
- Research: `docs/research/{go-openaudio,solana-side,agent-ecosystem,solana-tooling}.md`
- Diagnostics: `scripts/diagnostics/{chain-status.sh,sdk-write-test.mjs,em-write-test.mjs}`
  (the .mjs need `npm i @audius/sdk` + `@noble` libs in a scratch dir; they read
  `.env` themselves)
- Supabase: project **Atris** `tojrygfoipeltannhufw` (us-west-2) — `charts` schema,
  `collect-charts` fn, pg_cron job `collect-charts-6h`; legacy alpha chat tables in
  `public` deliberately untouched
- Memory: `audius-write-path.md` (write-path saga), `audius-mcp-project-goal.md`
  (identity, money goal, north-star workflow), `gh-codespaces-signing.md` (new)
- `/handoff` skill: `.claude/skills/handoff/` + eval evidence in
  `.claude/skills/handoff-workspace/` (iteration 2: 18/18 vs 14/18)

## Open questions for the user
- Decisions already made (don't re-ask): Supabase = `charts` schema alongside legacy
  tables; collector = Supabase-native edge function, 6h cadence, all 51 genres +
  playlists + coins; 5b before 5c; roadmap Phase 5a is next after handoff follow-ups.
- Open: push the 4 commits? Delete or relocate `.claude/skills/settings.json`?
  Go-ahead for the $AUDIO claim once writes index? File the SDK bugs upstream?

## Surprise audit
**Most surprising positive — the OAP protocol layer speaks plain HTTP+JSON.**
Expected: a gRPC/Go-only surface requiring codegen and a Go sidecar (weeks).
Actual: every go-openaudio service is ConnectRPC — `fetch()`-able JSON from
TypeScript, public endpoint at `rpc.audius.co`, and protocol writes sign with
secp256k1/EIP-712, the same key type as `AUDIUS_API_SECRET` we already hold. The gap
existed because the OAP rebrand docs lead with Docker/validator framing and never say
"it's just HTTP+JSON". This single fact collapsed Phase 5a from "evaluate gRPC" to a
spike. *Changes made*: research committed (`docs/research/go-openaudio.md`), roadmap
5a rewritten around it (`7a82ef0`), and `scripts/diagnostics/chain-status.sh` is the
first live protocol read checked into the repo.

**Most surprising negative — "200 + mined receipt" was worthless twice in one day,
for different reasons.** Expected (after the morning's app-signing proof): writes
work the moment the chain recovers. Actual: first the chain halt made receipts
meaningless (mined at the halt boundary, never indexed); then, post-recovery, BOTH
auth shapes mine and still silently discard — a second, distinct indexing-layer
failure. The gap existed because we kept treating each newly-verified layer (auth ✓,
chain ✓) as sufficient, when effect-verification is the only real signal. *Changes
made*: `chain-status.sh` makes halts one-command detectable (rung 2); the SDK/relay
diagnostics were rescued from the dying scratchpad into `scripts/diagnostics/` so the
full three-path discrimination (REST/SDK/EntityManager) is reproducible in minutes;
memory `audius-write-path.md` updated with the post-recovery discard fact; the
execute tool already mandates verify-after-write in its description (kept). Runner-up
negative worth its tripwire: GitHub display-name rename silently broke commit
signing with a misleading error (memory + tripwire above).
