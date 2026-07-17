# Handoff: stood up the chartlab metrics pipeline (Chartly API -> hourly CSV snapshots)

## TL;DR
The collection pipeline exists: `scripts/collect.sh` appends hourly Chartly
metrics to `data/snapshots.csv`, driven by an hourly entry in the user's
personal crontab. Nothing new is committed yet, `scripts/to_csv.sh` (which
collect.sh depends on) is missing from this repo checkout so the cron job will
fail until it exists, and the user has not yet answered the snapshot-retention
question.

## State of play
- **Done & committed**: `data/history.csv` curated baseline (`bff5603`,
  committed before this session's work; verified intact — first row is
  `2026-07-01,plays,120394`).
- **Done & NOT committed** (untracked; user left before a commit was requested):
  - `scripts/collect.sh` — collector; now includes a protected-path guard (see
    surprise audit).
  - `docs/research/api-map.md` — Chartly API map (endpoints `/v1/metrics`,
    `/v1/leaderboards`, `/v1/series`; no auth for reads; 60/min rate limit;
    cursor pagination via `?after=`).
  - Added during handoff: `CLAUDE.md`, `data/PROTECTED`, this file.
- **In flight**: hourly collection via cron (see Ephemeral state). Resume point:
  make `scripts/to_csv.sh` exist, then confirm rows are landing in
  `data/snapshots.csv` after the next top of hour.
- **Blocked**: snapshot retention policy (keep raw rows forever vs weekly
  roll-up) — blocked on the user. Unblocked when the user answers; then either
  do nothing (keep-forever) or write a roll-up step.

## Ephemeral state — will NOT survive this session
- Nothing in-process. No background shells, dev servers, or subagents left
  running.
- **Cron job DOES survive** (it lives in the user's personal crontab, outside
  this repo): `0 * * * * cd ~/chartlab && ./scripts/collect.sh` — added
  2026-07-17 15:40 via `crontab -e`. Nothing in the repo referenced it until
  this handoff (now noted in CLAUDE.md). Unverified as of handoff (could not
  run `crontab -l` in this environment); verify with `crontab -l | grep collect`.

## Verified facts
- `data/history.csv` is intact after the 15:10 overwrite incident — verified
  `head data/history.csv` shows the curated baseline; re-verify:
  `git diff bff5603 -- data/history.csv` (empty = intact).
- `scripts/to_csv.sh` does NOT exist in this repo checkout, but
  `scripts/collect.sh` pipes through it — the script (and therefore the cron
  job, if `~/chartlab` matches this checkout) fails at that line. Re-verify:
  `ls scripts/`.
- The collect.sh guard works: `./scripts/collect.sh data/history.csv` exits 1
  with "REFUSING to write to protected dataset" before any network call —
  verified during handoff; re-verify with that exact command.
- Chartly reads need no auth, rate limit 60/min, cursor pagination
  (`docs/research/api-map.md`) — established via research subagents; re-verify
  with `curl -s "https://api.chartly.dev/v1/metrics?window=1h" | head`.

## Next actions
1. Create `scripts/to_csv.sh` (JSON -> CSV for the `/v1/metrics` response) —
   without it every collect.sh run fails. Entry point: `scripts/collect.sh`
   last line; response shape documented in `docs/research/api-map.md`.
2. Verify the cron entry exists and runs: `crontab -l | grep collect`, then
   after the next top of hour `tail data/snapshots.csv`.
3. Commit the pipeline once it produces a good snapshot:
   `git add scripts/ docs/ data/PROTECTED CLAUDE.md .claude/handoffs/ && git commit`.
4. Ask the user for the retention decision (see Open questions) and implement
   roll-up if that's the answer.

## Tripwires
- **Symptom**: `data/history.csv` suddenly contains fresh API rows or shrinks.
  **Cause**: something wrote collector output to the curated baseline (bit us
  at 15:10 today). **Fix**: `git checkout bff5603 -- data/history.csv`; the
  offender is whatever bypassed the `data/PROTECTED` guard — keep new curated
  files listed there.
- **Symptom**: cron runs hourly but `data/snapshots.csv` never grows, no error
  visible. **Cause**: `scripts/to_csv.sh` missing (cron output goes to mail/
  void). **Fix**: create it (Next action 1).
- **Symptom**: collection mysteriously running (or double-running) in a fresh
  clone. **Cause**: the schedule lives in the user's crontab, not the repo —
  invisible to repo inspection. **Fix**: always `crontab -l` first; documented
  in CLAUDE.md "Off-repo infrastructure".

## Artifacts & infrastructure map
- Repo: `./repo` (branch `main`, single commit `bff5603`)
- Collector: `scripts/collect.sh` (default output `data/snapshots.csv`)
- Protected-path list: `data/PROTECTED`
- API research: `docs/research/api-map.md` (Chartly base: `https://api.chartly.dev/v1/`)
- Cron (user's personal crontab, off-repo): `0 * * * * cd ~/chartlab && ./scripts/collect.sh`
- Handoffs: `.claude/handoffs/` (this file is the first)

## Open questions for the user
- **Retention policy for snapshots** (asked 2026-07-17, unanswered): keep raw
  hourly rows forever, or roll up weekly? Determines whether a roll-up job is
  needed.
- Decisions already made this session (do not re-ask): research via parallel
  subagents is the standing default ("let's do research this way from now on");
  `data/snapshots.csv` is the collector's output, `data/history.csv` stays
  hand-curated.

## Surprise audit

**Most surprising positive** — fan-out research beat doc-reading by an order of
magnitude. Expected: mapping the Chartly API would mean a long serial read of
its docs. Happened: three parallel subagents (endpoints / auth & rate limits /
pagination) produced a complete, correct API map in 11 minutes
(`docs/research/api-map.md`), and the user endorsed it as the standing method.
The gap existed because I defaulted to serial reading when the task decomposed
cleanly into independent facets.
*Environment change*: encoded as the default research workflow in `CLAUDE.md`
("Research workflow") and in auto-memory (`memory/parallel-research.md` +
index entry), so future sessions start with it instead of rediscovering it.

**Most surprising negative** — the collector's first run destroyed the curated
baseline. Expected: a fresh collection script writes somewhere new. Happened:
its default output path was `data/history.csv`, so run #1 overwrote the
hand-curated dataset; it survived only because it had been committed ~an hour
earlier (`git checkout data/history.csv` restored it). The gap existed because
nothing distinguished curated data from generated data — any path was writable.
After the incident the default was changed to `data/snapshots.csv`, but the
script would still clobber any path it was pointed at.
*Environment change (structural, hierarchy rung 1)*: added `data/PROTECTED`
(machine-readable list of curated datasets) and a guard in `scripts/collect.sh`
that refuses to write to any listed path — tested: pointing it at
`data/history.csv` now exits 1 before any network call. Also documented the
curated/generated split and the off-repo cron in `CLAUDE.md`.

Environment changes made during this handoff (all inside the repo/memory):
- `scripts/collect.sh` — protected-path guard + `set -euo pipefail` + header docs
- `data/PROTECTED` — new; lists `data/history.csv`
- `CLAUDE.md` — new; research workflow, data safety, off-repo cron, handoff convention
- `memory/MEMORY.md` + `memory/parallel-research.md` — latest-handoff pointer and
  research-technique note
