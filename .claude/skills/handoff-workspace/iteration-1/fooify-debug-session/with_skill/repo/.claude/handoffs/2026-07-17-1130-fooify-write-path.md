# Handoff: melody-api — Fooify recurring-order writes root-caused (silent discard without Idempotency-Key)

## TL;DR
Dropped Fooify writes are fully root-caused: Fooify returns 200 but silently discards
POSTs lacking an `Idempotency-Key` header; `client.js` now always sends one (done at
handoff, uncommitted). Next: write the config-precedence regression test and a
client-header test, then commit everything. One blocker-ish discrepancy: `src/server.js`
(the staging webhook receiver) is referenced by `package.json` but does not exist in the
repo — the background server that ran today is dead and cannot be restarted from this tree.

## State of play
- **Done & committed**: `19b2320` "feat: fooify client + config". NOTE — contrary to
  session memory, the `.env`-wins precedence fix is ALREADY in this commit
  (`git show HEAD:src/config.js` — `env[k] = v` inside the `.env` loop, applied after
  `{ ...process.env }`). Only a comment clarification on that line is uncommitted.
- **Done & NOT committed** (working tree):
  - `src/config.js` — comment clarification only ("`.env` now wins over injected env").
    Held back because the regression test was never written.
  - `src/client.js` — rewritten at handoff: `write()` now always sends
    `Idempotency-Key` (caller-supplied or `crypto.randomUUID()`), returns
    `{ ...receipt, idempotencyKey, confirmed: false }`; new `confirmWrite(path)`
    does the follow-up GET the user mandated. Uncommitted pending tests.
  - `scripts/debug-echo.js` — new reusable `/debug/echo` diffing script (see
    Surprise audit). Uncommitted.
- **In flight**: regression test for config precedence (`.env` must beat injected
  env). Not started — this was the stated reason the config fix stayed uncommitted.
  Resume point: create `test/` + a `test` script in `package.json` (none exist yet),
  assert `loadConfig().apiBase` prefers a `.env` value over `process.env.API_BASE`.
- **Blocked**: restarting the staging webhook receiver — `npm start` runs
  `node src/server.js`, but `src/server.js` is untracked AND absent from the working
  tree (`git ls-files` + `ls src/` confirm). Unblocked when the file is recovered
  from wherever it lived or rewritten. Ask the user (see Open questions).

## Ephemeral state — will NOT survive this session
- **Dev server** `node src/server.js &` (background shell, started 09:04) — DEAD now.
  It was the only thing serving the staging webhook Fooify calls back to, so staging
  callbacks go nowhere until it's restarted. Restart is `node src/server.js` — but
  see Blocked: the file is not in the repo. Do not assume callbacks are being received.
- No other background machinery, cron jobs, or subagents were created this session.
- No `.env` file exists in the working tree at handoff (unverified whether the running
  session had one outside the repo). CI injects `API_BASE`; without a local `.env`,
  `loadConfig()` falls back to injected env then `https://api.fooify.dev/v2`.

## Verified facts
1. **Fooify silently discards POSTs without `Idempotency-Key` and still returns 200
   with a receipt.** Evidence: identical POST replayed with the header → record
   appeared instantly in the dashboard (11:15). Re-verify:
   `node scripts/debug-echo.js POST '{"ping":1}'` (confirms the header is now sent),
   then a real write + `confirmWrite()`.
2. **Fooify STAGING has an undocumented `/debug/echo` endpoint** reflecting received
   headers + body. Undocumented ⇒ may vanish. Re-verify:
   `node scripts/debug-echo.js GET`.
3. **CI injects `API_BASE`**, which used to shadow `.env` and pointed local dev at
   prod-mirror. Precedence is now `.env`-wins and is in HEAD. Re-verify:
   `cd repo && echo 'API_BASE=from-dotenv' > .env && API_BASE=injected node -p "require('./src/config').loadConfig().apiBase" && rm .env`
   → must print `from-dotenv`.
4. **`src/server.js` is not in the repo** (untracked, not in working tree) even though
   `package.json`'s `start` script and today's dev server used it. Re-verify:
   `git ls-files; ls src/`.

## Next actions
1. Resolve `src/server.js` (ask user — recover or rewrite), then restart the webhook
   receiver: `node src/server.js`. Nothing staging-callback-related works until then.
2. Write the config precedence regression test (see In flight for exact assertion),
   add a `test` script to `package.json`.
3. Add a test that `client.write()` sends `Idempotency-Key` and that its return has
   `confirmed: false` (e.g. stub `fetch` and inspect headers).
4. Commit: `src/config.js` comment + tests (config fix logic is already in HEAD),
   `src/client.js` idempotency rewrite, `scripts/debug-echo.js`.
5. Update any `write()` call sites (currently only the missing `server.js`) to call
   `confirmWrite()` after writes, per the user's 11:30 decision.

## Tripwires
- **Symptom: Fooify returns 200 but the record never appears in the dashboard.**
  Cause: POST sent without `Idempotency-Key` — Fooify silently discards it and
  returns a receipt anyway (undocumented). Fix: `client.write()` now always sends
  the header; never treat a Fooify 200 as persisted until `confirmWrite()` (a
  follow-up GET) sees the record.
- **Symptom: local dev requests hit prod-mirror / wrong API base with no error.**
  Cause: CI/Codespace-injected `API_BASE` shadowing `.env`. Fix: `.env`-wins
  precedence in `src/config.js` (in HEAD); if it recurs, run the re-verify one-liner
  in Verified facts #3.
- **Symptom: `npm start` fails with "Cannot find module src/server.js".**
  Cause: the file was never committed and is not in the tree. Fix: recover/rewrite
  it (Next action 1).

## Artifacts & infrastructure map
- Repo: `<workspace>/repo` (branch `main`, HEAD `19b2320`)
- Fooify client: `repo/src/client.js` (write + confirmWrite)
- Config loader: `repo/src/config.js`
- Echo-diff debug script: `repo/scripts/debug-echo.js`
- Fooify API base (default): `https://api.fooify.dev/v2`; staging exposes `/debug/echo`
- This handoff: `repo/.claude/handoffs/2026-07-17-1130-fooify-write-path.md`

## Surprise audit
- **Most surprising positive**: Fooify staging's undocumented `/debug/echo` endpoint
  reflects exactly what the server received. Expected hours of support back-and-forth
  to see the server's view of our requests; instead root-caused the dropped writes in
  minutes by diffing the echo of our client's request against the dashboard client's.
  Gap existed because the endpoint appears in no docs — pure luck it was found.
  **Environment change (repeatable)**: `repo/scripts/debug-echo.js` — one command
  reflects a request through the real client/config path for diffing; technique also
  recorded in auto-memory MEMORY.md.
- **Most surprising negative**: a Fooify 200 + receipt is not proof of persistence —
  POSTs without `Idempotency-Key` are silently discarded. Expected an error status or
  at least a documented requirement; got a lying 200. Gap existed because their docs
  never mention idempotency keys and the failure mode is invisible client-side.
  **Environment change (structural, rung 1)**: `repo/src/client.js` rewritten so a
  keyless write cannot leave the client (`Idempotency-Key` auto-generated), receipts
  are returned `confirmed: false`, and `confirmWrite()` implements the mandated
  follow-up GET; tripwire comment sits at the point of use. Remaining rung-2 work
  (tests) is Next actions 2–3.

## Open questions for the user
- Where is `src/server.js`? It ran all day but is untracked and absent from the repo.
  Should the successor recover it (from another machine/gist?) or rewrite it?
- Should `write()` optionally auto-confirm (built-in follow-up GET with retry), or is
  the explicit `confirmWrite()` call at call sites the intended shape?
- Already decided (2026-07-17, do NOT re-ask): always send idempotency keys; treat
  Fooify 200s as unconfirmed until a follow-up GET shows the record.
