# Memory Index

- [Fooify API quirks](fooify-api-quirks.md) — writes silently discarded without `Idempotency-Key` (200 ≠ persisted; confirm via GET); undocumented staging `POST /debug/echo` reflector; CI `API_BASE` shadows `.env`
- melody-api session handoff 2026-07-17: unfinished work and runtime state in `HANDOFF.md` at the session root (client.js idempotency header, config regression test + commit, webhook receiver on :8787 needs restart)
