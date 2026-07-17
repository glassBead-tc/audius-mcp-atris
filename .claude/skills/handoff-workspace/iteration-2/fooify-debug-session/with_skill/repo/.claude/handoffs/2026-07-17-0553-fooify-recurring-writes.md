# Handoff: Fooify recurring-order writes — silent-discard root-caused, client fixed, uncommitted

## TL;DR
Recurring-order POSTs to Fooify were 200-ing but never persisting; root cause is that Fooify silently discards writes lacking an `Idempotency-Key` header, and `src/client.js` now always sends one (fixed at handoff time, with tests, all uncommitted). A second bug — CI-injected `API_BASE` overriding `.env` — is also fixed in `src/config.js` with a regression test. Nothing is blocked; the next step is to review and commit the working tree, then wire real recurring-order writes through `writeConfirmed()`.

## State of play
- **Done & committed**: nothing this session. Only prior commit: `c61c719` (feat: fooify client, config, webhook receiver).
- **Done & NOT committed** (entire working tree; user session ended before commit):
  - `src/config.js` — `.env` now wins over inherited shell/CI env (was: CI's `API_BASE` silently pointed local dev at prod-mirror). Was uncommitted awaiting a regression test; that test now exists (`test/config.test.js`).
  - `src/client.js` — always sends `Idempotency-Key` (auto `crypto.randomUUID()`, caller-overridable); new `writeConfirmed(path, body, confirmPath)` implements the user's "200 is unconfirmed until a GET shows the record" rule. Written at handoff time per the surprise audit.
  - `test/config.test.js`, `test/client.test.js` — regression tests for both fixes. `npm test` runs them; all pass as of handoff (`ok` x5).
  - `scripts/fooify-echo.js` — reusable wrapper for Fooify staging's undocumented `/debug/echo` reflector.
  - `package.json` — added `test` script.
- **In flight**: production call sites still use bare `write()`; nothing calls `writeConfirmed()` yet. Resume point: grep for `require('./client')` / `write(` callers and route recurring-order creation through `writeConfirmed('/recurring-orders', body, r => '/recurring-orders/' + r.id)` (adjust confirm path to the real record GET).
- **Blocked**: nothing.

## Ephemeral state — will NOT survive this session
- **Staging webhook receiver**: started 09:04 as a background shell, `node src/server.js &` (listens on :8787; it was the ONLY thing serving Fooify's staging callbacks). It dies with this session. Successor must restart it: `npm start` (or `node src/server.js &`) from the repo root, and verify with `curl -s localhost:8787 -d ping`. If Fooify staging callbacks were pointed at a tunnel to this port, that tunnel is gone too (no tunnel appears in the transcript — unverified as of handoff).

## Verified facts
- **Fooify silently discards keyless writes**: a POST without `Idempotency-Key` returns 200 *with a receipt* and never persists; the identical POST with the header persists instantly (verified 11:15 by replay). Re-verify: POST a test record twice via `src/client.js` old-vs-new behavior, or POST once and GET the record back.
- **Fooify staging reflects requests at `POST /debug/echo`** (headers + body, exactly as received; undocumented). Re-verify: `node scripts/fooify-echo.js` — expect your own request mirrored back.
- **CI injects `API_BASE` into the shell env**, which previously overrode `.env` and sent local dev traffic to prod-mirror (found 10:05). Re-verify: `npm test` (config test asserts `.env` precedence).
- **Tests pass at handoff**: `npm test` → 5 `ok` lines, exit 0.

## Next actions
1. Review + commit the working tree (config fix, client fix, tests, echo script). All of it is intentional; suggested split: config fix + its test; client idempotency + its test; scripts. `git status` at handoff: `src/config.js`, `src/client.js`, `package.json` modified/new, `test/`, `scripts/` untracked.
2. Route real recurring-order writes through `writeConfirmed()` — entry point `src/client.js` (exports `write`, `writeConfirmed`); confirm the actual GET path for a created recurring order against Fooify docs or `/debug/echo` probing.
3. Restart the webhook receiver before any end-to-end test: `node src/server.js &`, then confirm `:8787` answers.
4. Re-run one live write against Fooify staging with the new client and confirm the record appears in their dashboard (last live verification was the 11:15 manual replay, before the client code change).

## Tripwires
- **Symptom: Fooify write returns 200 + receipt but record never appears in the dashboard.** Cause: the POST lacked an `Idempotency-Key` header — Fooify accepts and silently drops keyless writes. Fix: use `src/client.js` `write()`/`writeConfirmed()` (header now always sent); never trust a Fooify 200 without a confirming GET (user directive 2026-07-17).
- **Symptom: local dev mysteriously talks to the wrong Fooify environment (e.g. prod-mirror) despite a correct `.env`.** Cause: CI/Codespace-injected env vars (e.g. `API_BASE`) used to override `.env`. Fix: `src/config.js` now gives `.env` precedence; `test/config.test.js` guards it. If it recurs, check for a regressed `loadConfig()` merge order.
- **Symptom: `scripts/fooify-echo.js` 404s.** Cause: `/debug/echo` is undocumented staging-only surface; Fooify may remove it any time. Fix: fall back to a local listener (point `API_BASE` at something like the `src/server.js` logger) to capture raw requests.

## Artifacts & infrastructure map
- Repo: this repository (`melody-api`), branch `main`, base commit `c61c719`.
- `src/client.js` — Fooify write client (idempotency + confirm-by-GET).
- `src/config.js` — config loader, `.env`-wins semantics.
- `src/server.js` — staging webhook receiver, port 8787 (must be manually restarted).
- `scripts/fooify-echo.js` — request-diff tool against Fooify staging `/debug/echo`.
- `test/config.test.js`, `test/client.test.js` — run via `npm test`.
- Fooify staging dashboard — where record persistence was visually confirmed (URL not captured in session log; unverified as of handoff).

## Surprise audit
**Most surprising positive** — Fooify staging answers `POST /debug/echo` by reflecting back exactly what their server received (headers and body). Expected: no such facility (it appears in none of their docs), so diagnosing "their server sees something different than we send" would mean slow black-box guessing. Happened: minutes of diffing echoed requests located the missing `Idempotency-Key` immediately. Gap existed because the endpoint is undocumented — pure luck it was found while comparing against the dashboard client.
*Environment change (repeatable)*: `scripts/fooify-echo.js` — one command reproduces the technique, documents the diff workflow, and records the fallback if the endpoint vanishes. Also recorded in auto-memory (`memory/fooify-api.md`).

**Most surprising negative** — Fooify returns 200 *with a receipt* for writes it has already decided to discard (no `Idempotency-Key` → accepted, receipted, never persisted). Expected: a missing-required-header request fails loudly (4xx) or at worst persists unsafely. Happened: fully successful-looking responses for writes that vanish. Gap existed because we (reasonably) treated 200+receipt as proof of persistence; Fooify's contract makes the receipt meaningless without the header.
*Environment changes (structural, hierarchy rung 1 + 2)*:
- `src/client.js` — impossible to send a keyless write through our client; `Idempotency-Key` is always attached. `writeConfirmed()` encodes "200 is unconfirmed until a GET shows the record" as the default-safe path, with a tripwire comment at the point of use.
- `test/client.test.js` — fails the build if the key ever stops being sent.
- (Secondary negative surprise, same treatment: CI env overriding `.env` is now guarded by `test/config.test.js`.)

## Open questions for the user
- May I commit the working tree (config fix, client fix, tests, script), and as one commit or split? Session ended before a commit was authorized.
- Decisions already made this session that constrain the work: **always send idempotency keys**, and **treat Fooify 200s as unconfirmed until a follow-up GET shows the record** (user, 11:30). Do not re-ask; the client now enforces both.
- Should keyless `write()` calls be removed entirely in favor of `writeConfirmed()` for all mutating endpoints, or is opt-in confirmation acceptable for low-stakes writes?
