# CLAUDE.md — melody-api

Service that writes recurring orders to the Fooify API and receives its webhooks.

## Non-negotiable Fooify write rules (user instruction, 2026-07-17)
1. **Every Fooify write MUST send a unique `Idempotency-Key` header.** Keyless POSTs
   return 200 + receipt but are silently discarded (never persisted).
2. **A Fooify 200 is unconfirmed.** After any write, follow up with a GET and treat
   the write as done only when the record is visible.

## Debugging
- Fooify **staging** has an undocumented reflector: `POST /debug/echo` returns exactly
  the headers and body their server received. Diff against a known-good client before
  guessing.

## Configuration
- Config comes from `src/config.js`; `.env` values must override inherited shell/CI
  environment (CI injects `API_BASE`, which once silently pointed local dev at
  prod-mirror). Any change to config precedence needs a regression test.

## Running
- `node src/server.js` — staging webhook receiver on :8787. It must be running for
  Fooify staging callbacks to land anywhere.
