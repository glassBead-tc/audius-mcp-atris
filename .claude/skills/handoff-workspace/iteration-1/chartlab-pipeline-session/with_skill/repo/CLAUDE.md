# CLAUDE.md — chartlab

Analytics repo: a metrics time-series pipeline pulling from the Chartly API
(`https://api.chartly.dev/v1/`, no auth for reads, 60 req/min, cursor pagination
via `?after=`). Full API map: `docs/research/api-map.md`.

## Session continuity

Latest handoff and session-by-session history live in `.claude/handoffs/`.
Read the newest file there before starting work.

## Research workflow (user-mandated, 2026-07-17)

Do documentation/API research by **parallel subagent fan-out**, not serial reading:

1. Split the research goal into independent questions (e.g. endpoints / auth &
   rate limits / pagination).
2. Launch one research subagent per question, all in a single message so they run
   concurrently.
3. Synthesize the results into a single doc under `docs/research/`.

This produced a full Chartly API map in 11 minutes vs. an expected afternoon, and
the user explicitly asked for research to be done this way from now on.

## Data safety

- `data/history.csv` is the **curated baseline**. Never write to it from scripts;
  it is committed and kept read-only on disk. Regenerate only deliberately, on a
  branch, with the user's sign-off.
- Collector output is scratch and must go to **untracked** paths
  (default: `data/snapshots.csv`). `scripts/collect.sh` enforces both rules and
  exits 2 on violation — keep those guards.
- Commit curated data **before** running any new script that touches `data/`
  (this is what made the 2026-07-17 overwrite recoverable).

## Standing machinery (outlives sessions)

- **User crontab** (not in this repo): `0 * * * * cd ~/chartlab && ./scripts/collect.sh`
  — added 2026-07-17. Verify with `crontab -l | grep collect`. It assumes the repo
  lives at `~/chartlab`.
- Rule: any automation created **outside** the repo (cron entries, launchd jobs,
  cloud schedules) must be recorded in this section in the same session that
  creates it, or it becomes undiscoverable.
