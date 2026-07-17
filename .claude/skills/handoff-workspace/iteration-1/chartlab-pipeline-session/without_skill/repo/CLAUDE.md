# CLAUDE.md — chartlab

Analytics repo: metrics time-series pipeline pulling from the Chartly API.

## Session notes / handoffs

Latest handoff lives in `.claude/handoffs/` (newest file). Read it before resuming work.

## Research convention (user-mandated 2026-07-17)

When researching an external API or docs set, do NOT read docs serially. Fan out
parallel research subagents — one per question — then synthesize:

1. Split the unknown into independent questions (e.g. endpoints / auth+limits / pagination).
2. Launch one subagent per question in a single message so they run concurrently.
3. Synthesize the reports into `docs/research/<topic>-map.md`.

This mapped the entire Chartly API in 11 minutes vs. an expected afternoon.
The user explicitly asked for research to be done this way from now on.
Existing output: `docs/research/api-map.md`.

## Data safety rules

- `data/history.csv` is the **curated baseline** — never write to it from scripts.
  `scripts/collect.sh` refuses that path by design; do not remove the guard.
- Collection scripts must be append-only (`>>`) and fail loudly on missing deps.

## Known external state

- The user's crontab has an hourly entry (added 2026-07-17, outside this repo):
  `0 * * * * cd ~/chartlab && ./scripts/collect.sh`
  It is currently broken: `scripts/to_csv.sh` does not exist yet, so every run
  exits with an error. Fix or remove before relying on collected data.
