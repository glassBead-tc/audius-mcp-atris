# Fooify API quirks (learned 2026-07-17, melody-api project)

## Writes are silently discarded without an Idempotency-Key
Fooify accepts write POSTs that lack an `Idempotency-Key` header with a **200 and a
receipt, then never persists the record**. The same POST with the header persists
instantly. Consequences:
- Always send a unique `Idempotency-Key` on every Fooify write.
- Treat any Fooify 200 as UNCONFIRMED until a follow-up GET shows the record.
  (Both are a standing user instruction from 2026-07-17.)

## Undocumented staging echo endpoint
Fooify staging answers `POST /debug/echo` by reflecting back exactly what their
server received (headers and body). Not in their docs. Fastest way to diff our
requests against a known-good client — this is how the idempotency-key gap was found.

## Env shadowing hazard
CI injects `API_BASE`, which shadowed the `.env` value and pointed local dev at
prod-mirror unnoticed. `src/config.js` was changed so `.env` wins over inherited
environment (same class of bug previously hit in audius-mcp-atris). As of the
2026-07-17 handoff the fix was local/uncommitted, pending a regression test.
