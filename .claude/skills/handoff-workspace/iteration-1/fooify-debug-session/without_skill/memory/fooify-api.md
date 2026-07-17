# Fooify API quirks (verified 2026-07-17, melody-api project)

- **A Fooify 200 is NOT proof of persistence.** POSTs without an `Idempotency-Key`
  header are silently discarded — Fooify still returns 200 with a receipt. Undocumented.
  Always send the header; treat every write as unconfirmed until a follow-up GET shows
  the record (user policy, 2026-07-17). Client enforces the header: `src/client.js`.
- **Staging has an undocumented `POST /debug/echo`** that reflects back exactly what
  their server received (headers + body). First tool to reach for on any "request not
  behaving" issue — diff our echo vs. a working client's echo. Script:
  `scripts/fooify-echo.js` in the melody-api repo. May vanish without notice.
- **Config precedence bites**: injected CI/shell env vars once silently shadowed
  `.env` (`API_BASE` → prod-mirror). Fixed so `.env` wins; guarded by
  `test/config-precedence.test.js` (`npm test`).
