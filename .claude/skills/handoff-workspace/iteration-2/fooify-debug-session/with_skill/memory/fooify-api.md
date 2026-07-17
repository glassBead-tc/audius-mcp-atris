# Fooify API — hard-won facts (melody-api project, 2026-07-17)

- **Silent discard**: Fooify 200s + receipts POSTs that lack an `Idempotency-Key`
  header, then never persists them. A Fooify 200 is UNCONFIRMED until a follow-up
  GET shows the record (user directive). `src/client.js` in melody-api enforces
  both (always sends the key; `writeConfirmed()` does the GET).
- **Undocumented request reflector**: Fooify STAGING answers `POST /debug/echo`
  with exactly the headers+body their server received. Fastest way to diff our
  requests against another client's. Wrapper: `scripts/fooify-echo.js` in
  melody-api. Staging-only, undocumented — may vanish; fallback is a local
  raw-request listener.
- **Env precedence trap**: CI/Codespace-injected vars (e.g. `API_BASE`) overrode
  `.env` and pointed local dev at prod-mirror. melody-api `src/config.js` now
  gives `.env` precedence, guarded by `test/config.test.js`. (Same class of bug
  previously hit in audius-mcp-atris.)
