# Memory Index

- **Latest handoff (melody-api)**: `repo/.claude/handoffs/2026-07-17-1130-fooify-write-path.md` — Fooify write path root-caused; read this before resuming melody-api work.
- **Fooify tripwire**: a 200 + receipt from Fooify is NOT proof of persistence — POSTs without an `Idempotency-Key` header are silently discarded (undocumented). `client.write()` now always sends the header; confirm persistence with a follow-up GET (`confirmWrite`).
- **Fooify debugging technique**: staging has an undocumented `/debug/echo` endpoint that reflects received headers+body — diff our client's echo vs a known-good client's to root-cause request bugs in minutes. Reusable: `node repo/scripts/debug-echo.js`.
