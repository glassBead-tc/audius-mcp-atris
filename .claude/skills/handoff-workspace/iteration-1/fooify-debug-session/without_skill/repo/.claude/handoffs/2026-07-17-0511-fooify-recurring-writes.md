# Handoff: melody-api — Fooify recurring-order writes: root-caused silent discards, client now sends idempotency keys

## TL;DR
Fooify was silently discarding our POSTs (200 + receipt, nothing persisted) because we sent no `Idempotency-Key` header; the client now always sends one, and the `.env`-over-injected-env config fix has its regression test (2/2 passing via `npm test`). Everything is uncommitted — next step is to review the working tree, commit, and then implement read-back confirmation of writes. Nothing is blocked.

## State of play
- **Done & committed**: nothing this session. Only prior commit is `19b2320` (feat: fooify client + config).
- **Done & NOT committed** (entire working tree; user wanted the regression test before committing — the test now exists, so it's ready to commit pending review):
  - `src/config.js` — `.env` values now override injected env vars (fixes CI-injected `API_BASE` silently pointing local dev at prod-mirror).
  - `test/config-precedence.test.js` — NEW; regression tests for the above. `npm test` → 2 pass, 0 fail (verified at handoff).
  - `src/client.js` — `write()` now always sends `Idempotency-Key` (crypto.randomUUID, overridable via `opts.idempotencyKey`) and returns the receipt tagged `confirmed: false`. NOT yet exercised against real Fooify staging — verify with `scripts/fooify-echo.js` before trusting.
  - `scripts/fooify-echo.js` — NEW; replays a request through Fooify staging's undocumented `/debug/echo` (see Surprise audit).
  - `package.json` — added `"test": "node --test"`.
- **In flight**: read-back confirmation of writes (user policy: a Fooify 200 is unconfirmed until a follow-up GET shows the record). `client.write()` tags results `confirmed: false` but nothing performs the GET yet — resume by adding a `confirmWrite(path, id)` helper in `src/client.js` once you know the GET-by-id endpoint shape.
- **Blocked**: nothing.

## Ephemeral state — will NOT survive this session
- The dev server started at 09:04 (`node src/server.js &`) — the only thing serving the staging webhook Fooify calls back to — is **already dead**: `ps` at handoff shows no such process, and `src/server.js` does not exist in the repo tree (src/ contains only `client.js` and `config.js`; `.gitignore` only excludes node_modules, so it isn't hidden — it was likely never committed or lived elsewhere). Before any webhook testing, the successor must locate or recreate `src/server.js`; `npm start` will fail until then.
- No other background processes, cron jobs, or temp state were created.

## Verified facts
- **Fooify silently discards POSTs lacking an `Idempotency-Key` header, returning 200 with a receipt anyway.** Evidence: replaying the identical POST with the header made the record appear instantly (11:15). Re-verify: POST a test write without the header, confirm 200 but no record in the dashboard; repeat with the header.
- **Fooify staging exposes an undocumented `POST /debug/echo`** that reflects back exactly what their server received (headers + body). Re-verify: `node scripts/fooify-echo.js '{}'` — expect 200 with echoed headers/body. Undocumented, so it may vanish.
- **CI-injected env vars used to shadow `.env`** (that's how local dev silently pointed at prod-mirror). Fixed in `src/config.js`; re-verify: `npm test`.
- **`node --test test/` (trailing slash) fails on Node 24** with MODULE_NOT_FOUND; use bare `npm test` / `node --test`.
- Working tree at handoff: `M package.json, M src/client.js, M src/config.js, ?? scripts/, ?? test/` on `main` at `19b2320`.

## Next actions
1. Verify the new header actually reaches Fooify: `node scripts/fooify-echo.js '{"probe":true}'` — the echoed headers must include `idempotency-key`.
2. Do one real recurring-order write, then GET it back to confirm persistence (this also validates the 11:30 policy end-to-end).
3. Commit the working tree (config fix + test, client idempotency fix, echo script) — user's precondition (regression test) is met; run `npm test` first.
4. Implement read-back confirmation in `src/client.js` (`confirmWrite`, or make `write()` optionally poll the GET); flip `confirmed` to true only on successful read-back.
5. Resolve the missing `src/server.js` (see Ephemeral state) before any webhook work.

## Tripwires
- **Symptom: Fooify returns 200 but the record never appears.** Cause: POST sent without `Idempotency-Key` (their docs don't mention this). Fix: the header is now unconditional in `src/client.js` — if you see this again, use `scripts/fooify-echo.js` to check what Fooify actually received.
- **Symptom: local dev hits prod-mirror / wrong API_BASE despite a correct `.env`.** Cause: injected shell/CI env vars used to win over `.env`. Fix: precedence corrected in `src/config.js`, guarded by `test/config-precedence.test.js` — if it recurs, run `npm test` first.
- **Symptom: `npm start` fails with "Cannot find module src/server.js".** Cause: the file is absent from the repo (see Ephemeral state). Fix: locate/recreate it before webhook testing.
- **Symptom: `node --test test/` → MODULE_NOT_FOUND.** Cause: Node 24 treats the trailing-slash arg as a module path. Fix: run bare `npm test`.

## Artifacts & infrastructure map
- Repo: `/workspaces/audius-mcp-atris/.claude/skills/handoff-workspace/iteration-1/fooify-debug-session/without_skill/repo` (branch `main`, base commit `19b2320`)
- Fooify staging echo: `POST {API_BASE}/debug/echo` (API_BASE default `https://api.fooify.dev/v2`, overridden by `.env`)
- Echo replay script: `scripts/fooify-echo.js`
- Regression tests: `test/config-precedence.test.js` (`npm test`)
- Handoffs history: `.claude/handoffs/` in this repo
- Memory index (this workspace): `../memory/MEMORY.md`

## Surprise audit
- **Most surprising positive**: Fooify staging's undocumented `/debug/echo` endpoint. Expected hours of back-and-forth with support to learn what their server received; instead root-caused the dropped writes in minutes by diffing echoed requests from the working dashboard client vs. ours. The gap existed because the endpoint appears in no documentation — pure luck to find it.
  - Environment change (repeatable): `scripts/fooify-echo.js` encodes the technique with usage notes and caveats; memory note `memory/fooify-api.md` records the endpoint so future sessions reach for it first.
- **Most surprising negative**: Fooify returns 200 + receipt for POSTs it silently discards (missing `Idempotency-Key`). Expected an HTTP status to be truthful about persistence; their docs never mention the requirement. The gap existed because we treated 200 as proof of persistence.
  - Environment changes (structural, rung 1): `src/client.js` now sends `Idempotency-Key` unconditionally and tags every receipt `confirmed: false`; tripwire comment sits at the exact point of use. Related config-shadowing failure moved to rung 2: `test/config-precedence.test.js` + `npm test` script catch any precedence regression automatically. Memory note added so non-repo sessions know a Fooify 200 ≠ persisted.

## Open questions for the user
- Where is `src/server.js`? It was running this morning but is not in the repo — was it deleted, untracked, or run from another checkout?
- Decision already made (do not re-ask): always send idempotency keys; treat Fooify 200s as unconfirmed until a follow-up GET shows the record (user, 11:30).
- Should idempotency keys be deterministic per logical order (dedupe retries) rather than random per call? Random UUID is the current default; deterministic keys would make retries safe end-to-end.
- OK to commit the working tree as described in Next actions step 3?
