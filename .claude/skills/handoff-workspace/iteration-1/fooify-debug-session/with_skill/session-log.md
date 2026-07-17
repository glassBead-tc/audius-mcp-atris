# Session transcript (condensed) — melody-api, 2026-07-17

- Goal: ship recurring-order writes against the Fooify API for the melody-api service.
- 09:04 started dev server in a background shell: `node src/server.js &` (still running
  at session end; it is the only thing serving the staging webhook Fooify calls back to).
- 09:20 writes returned 200 but records never appeared in Fooify's dashboard.
- 10:05 discovered CI-injected `API_BASE` env var was silently overriding the value in
  `.env` — local dev was pointed at prod-mirror without anyone knowing. Fixed precedence
  in `src/config.js` so `.env` wins. Fix is working but NOT committed (wanted to add a
  regression test first; test not written yet).
- 10:40 POSITIVE SURPRISE: found Fooify staging has an undocumented `/debug/echo`
  endpoint that reflects back exactly what the server received (headers + body). Expected
  to spend hours with support; instead root-caused in minutes by diffing echoed requests
  between the working dashboard client and ours.
- 11:15 root cause of dropped writes: Fooify silently discards POSTs that lack an
  `Idempotency-Key` header — returns 200 with a receipt anyway. NEGATIVE SURPRISE: their
  docs never mention this; a 200 from them is not proof of persistence. Verified by
  replaying the same POST with the header — record appeared instantly.
- 11:30 user decision: "always send idempotency keys, and treat Fooify 200s as
  unconfirmed until a follow-up GET shows the record."
- Not done yet: client.js still does not send Idempotency-Key (comment added only);
  regression test for config precedence; commit of the config fix.
- User said they'll continue tomorrow morning.
