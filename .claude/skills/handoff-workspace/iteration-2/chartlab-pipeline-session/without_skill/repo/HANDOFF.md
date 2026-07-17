# Handoff — chartlab metrics pipeline (session of 2026-07-17, resume Monday 2026-07-20)

## Goal
Stand up a metrics time-series pipeline for the chartlab analytics repo, pulling
hourly metrics from the Chartly API into CSV.

## Where things stand
- `docs/research/api-map.md` — Chartly API map (endpoints `/v1/metrics`,
  `/v1/leaderboards`, `/v1/series`; reads need no auth; 60/min rate limit;
  cursor pagination via `?after=`). UNCOMMITTED.
- `scripts/collect.sh` — hourly collector. Appends `/v1/metrics?window=1h` output
  to `data/snapshots.csv` (or `$1`). UNCOMMITTED. Now refuses to write to
  `data/history.csv` (see incident below) and uses `set -euo pipefail`.
- `data/history.csv` — curated baseline dataset, committed (`bff5603`). Intact.
- Git: branch `main`, only commit is the baseline; all session work is untracked.

## BLOCKER — pipeline does not actually work yet
`collect.sh` pipes curl output through `./scripts/to_csv.sh`, **which was never
written**. Every run (including the hourly cron runs, below) fails at that step,
so no data is being collected. First task Monday: write `scripts/to_csv.sh`
(JSON from `/v1/metrics` → `date,metric,value` rows matching history.csv's
schema), then run `collect.sh` once manually and inspect `data/snapshots.csv`.

## External state — cron job outside the repo
The user's **personal crontab** (edited via `crontab -e` this session) contains:

    0 * * * * cd ~/chartlab && ./scripts/collect.sh

Nothing in the repo installs, documents (except here and the script header), or
removes this. It has been firing hourly since ~15:40 on 2026-07-17 and failing
because of the missing `to_csv.sh`; expect an empty or absent
`data/snapshots.csv` and possible cron mail. Consider moving this into a
committed installer script (`scripts/install-cron.sh`) or at least keeping this
doc in sync if the entry changes.

## Incident log (why the guard exists)
At 15:10 the first run of `collect.sh` overwrote `data/history.csv` (its default
output path pointed there). Recovered with `git checkout data/history.csv` —
only possible because the baseline had been committed an hour earlier. Default
output moved to `data/snapshots.csv`, and the script now hard-refuses any
output path named `history.csv`. Lesson: commit curated data before pointing
automation anywhere near it.

## Open question for the user (asked, not yet answered)
Retention policy for snapshots: keep raw hourly rows forever, or roll up
weekly? Blocks any pruning/rollup work; collection itself can proceed.

## Suggested Monday order
1. Write `scripts/to_csv.sh`; verify one manual `collect.sh` run end to end.
2. Confirm the cron entry now produces sane rows (check `data/snapshots.csv`
   after the next top of hour, or run manually).
3. Commit `scripts/collect.sh`, `scripts/to_csv.sh`, `docs/research/api-map.md`,
   and this file.
4. Re-ask the retention question; implement rollup/pruning per the answer.
5. Optional hardening: header/dedupe handling in the CSV, rate-limit backoff
   (60/min is generous for hourly pulls, but bulk backfills will hit it).

## Process note (user preference)
Researching the Chartly API by fanning out 3 parallel subagents (endpoints /
auth+rate-limits / pagination) and synthesizing produced the full API map in
11 minutes. The user said: "let's do research this way from now on." Default to
parallel research subagents for any multi-facet documentation/API research in
this project. (Also recorded in auto-memory.)
