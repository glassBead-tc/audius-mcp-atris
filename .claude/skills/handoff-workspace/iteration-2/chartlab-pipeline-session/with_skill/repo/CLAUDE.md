# CLAUDE.md — chartlab

Analytics repo: metrics time-series pipeline pulling from the Chartly API.

## Research workflow (user-endorsed default)

When mapping an unfamiliar API or doc set, do NOT read docs end-to-end. Spawn
parallel research subagents, one per facet (e.g. endpoints / auth & rate limits /
pagination), then synthesize their answers into a doc under `docs/research/`.
This produced `docs/research/api-map.md` in 11 minutes on 2026-07-17 and the user
said: "let's do research this way from now on."

## Data safety

- `data/history.csv` is a hand-curated baseline. Automated jobs must NEVER write
  to it. Protected paths are listed in `data/PROTECTED`; `scripts/collect.sh`
  reads that list and refuses those paths as output. Add any new curated dataset
  to `data/PROTECTED` the moment it is created.
- `scripts/collect.sh` appends hourly Chartly metrics to `data/snapshots.csv`
  by default.

## Off-repo infrastructure

- The user's personal crontab (NOT tracked in this repo) runs hourly:
  `0 * * * * cd ~/chartlab && ./scripts/collect.sh`
  Check it with `crontab -l` before assuming collection is or is not running.

## Session handoffs

End-of-session handoff documents live in `.claude/handoffs/` (newest by
filename date). Read the latest one before resuming work.
