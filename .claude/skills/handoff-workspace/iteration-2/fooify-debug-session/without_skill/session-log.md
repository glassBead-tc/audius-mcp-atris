# Session transcript (condensed) — melody-api, 2026-07-17

- Goal: ship recurring-order writes against the Fooify API for the melody-api service.
- 09:04 started the staging webhook receiver in a background shell: `node src/server.js &`.
  It is still running at session end and is the only thing serving Fooify's callbacks.
- 09:20 recurring-order POSTs return 200 with a receipt, but the records never appear in
  Fooify's dashboard.
- 10:05 found that the CI-injected `API_BASE` environment variable was overriding the
  value in `.env` — local dev had been talking to prod-mirror without anyone noticing.
  Changed `src/config.js` so `.env` wins over inherited environment. The fix works
  locally but is not committed — wanted a regression test first, which never got written.
- 10:40 while comparing our requests against the Audius dashboard client's, found that
  Fooify's staging environment answers `POST /debug/echo` by reflecting back exactly
  what their server received (headers and body). It appears in none of their docs.
  Diffing echoed requests took minutes and located the difference immediately.
- 11:15 the difference: the dashboard client sends an `Idempotency-Key` header on every
  write; ours sends none. Fooify accepts keyless POSTs with a 200 and a receipt, and
  then never persists them. Replayed the identical POST with the header — the record
  appeared in the dashboard instantly.
- 11:30 user: "always send idempotency keys, and treat Fooify 200s as unconfirmed until
  a follow-up GET shows the record."
- Not done yet: `src/client.js` still sends no `Idempotency-Key`; the config regression
  test; committing the config fix.
- User: "That's a wrap for today."
