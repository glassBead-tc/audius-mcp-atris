# Handoff — melody-api / Fooify recurring-order writes (2026-07-17)

Read this first. It is everything the previous session knew that you need to resume.

## Goal
Ship recurring-order writes against the Fooify API for the melody-api service (repo: `./repo`).

## Where things stand

### Solved (root cause found, fix NOT yet applied to the client)
Recurring-order POSTs returned 200 with a receipt but never appeared in Fooify's
dashboard. Two independent causes were found:

1. **Environment shadowing**: the CI-injected `API_BASE` env var overrode `.env`,
   so local dev was silently talking to prod-mirror. Fixed in `repo/src/config.js`
   (`.env` now wins over inherited environment). **Fix works locally but is
   UNCOMMITTED** — the user wanted a regression test first, which was never written.
   The diff is small: `const env = {}` -> `const env = { ...process.env }` and the
   trailing `Object.assign(env, process.env)` removed. `git diff` in `./repo` shows it.

2. **Silent discard without `Idempotency-Key`**: Fooify accepts keyless write POSTs
   with a 200 and a receipt, then never persists them. The dashboard client sends an
   `Idempotency-Key` header on every write; replaying our identical POST with that
   header made the record appear instantly. `repo/src/client.js` **still sends no
   `Idempotency-Key`** — this is the main unfinished code change.

### Standing instruction from the user (11:30, verbatim intent)
> "always send idempotency keys, and treat Fooify 200s as unconfirmed until a
> follow-up GET shows the record."

This is now also recorded in `repo/CLAUDE.md` and in memory
(`memory/fooify-api-quirks.md`) so it survives beyond this handoff.

## TODO, in order
1. Add `Idempotency-Key` header (unique per write, e.g. `crypto.randomUUID()`) to
   `repo/src/client.js` `write()`.
2. Add write confirmation: after a Fooify 200, follow up with a GET and only treat
   the write as done when the record is visible.
3. Write the regression test for the config precedence fix (a `.env` value must beat
   an inherited `process.env` value), then commit the `src/config.js` change —
   ask the user before committing.
4. Restart the staging webhook receiver if needed (see below), and confirm callbacks
   flow end-to-end.

## Runtime state warning
The session ran the staging webhook receiver in a background shell
(`node repo/src/server.js`, listens on **:8787**) — it was the only thing serving
Fooify's staging callbacks. **At handoff time nothing is listening on 8787**
(the background shell did not survive). Restart it early in the next session:
`cd repo && node src/server.js &` — otherwise Fooify callbacks go nowhere and
write confirmation may look broken for the wrong reason.

## Debugging tool worth remembering (undocumented)
Fooify **staging** answers `POST /debug/echo` by reflecting back exactly what their
server received (headers + body). It appears in none of their docs. Diffing our
echoed request against the dashboard client's is how the missing header was found
in minutes. Use it first whenever Fooify behaves inexplicably.

## Environment gotchas
- CI injects `API_BASE`; before the config fix is committed, any environment
  without the local fix will silently target prod-mirror. Verify `loadConfig().apiBase`
  before trusting any manual test.
- A Fooify 200 + receipt proves nothing about persistence. Only a follow-up GET does.
