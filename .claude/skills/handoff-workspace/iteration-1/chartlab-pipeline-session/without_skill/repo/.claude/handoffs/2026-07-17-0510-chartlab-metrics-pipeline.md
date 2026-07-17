# Handoff: stood up the chartlab metrics pipeline (Chartly API research + hourly collector)

## TL;DR
Chartly API is fully mapped and `scripts/collect.sh` exists with overwrite guards, but the pipeline cannot produce data yet because `scripts/to_csv.sh` (the JSON→CSV converter) has never been written — and an hourly cron job in the **user's crontab** is already calling it, failing every hour. First job Monday: write `to_csv.sh`, then decide the snapshot retention policy with the user.

## State of play
- **Done & committed**: `data/history.csv` curated baseline (commit `07eae26`, the only commit on `main`). Nothing from this session is committed.
- **Done & NOT committed** (untracked; left uncommitted because the user headed out before review):
  - `scripts/collect.sh` — hourly collector, rewritten at end of session with safety guards (see Surprise audit).
  - `docs/research/api-map.md` — full Chartly API map from the parallel-research fan-out.
  - `CLAUDE.md` — new; research convention, data-safety rules, cron documentation.
  - `.claude/handoffs/` — this document.
- **In flight**: the collection pipeline. Resume point: `scripts/to_csv.sh` does not exist. `collect.sh` line 30 pipes `curl https://api.chartly.dev/v1/metrics?window=1h` into it. Write `to_csv.sh` (stdin: Chartly JSON; stdout: `date,metric,value` rows matching `data/history.csv` header), `chmod +x` it, then run `./scripts/collect.sh` once and inspect `data/snapshots.csv`.
- **Blocked**: retention policy for snapshots — blocked on a user decision (see Open questions). Unblocked the moment the user answers.

## Ephemeral state — will NOT survive this session
- **Hourly cron job in the USER'S crontab** (added 15:40 via `crontab -e` — it DOES survive the session, which is exactly the problem: nothing in the repo created it and only this note and CLAUDE.md record it):
  `0 * * * * cd ~/chartlab && ./scripts/collect.sh`
  - Current behavior: fails every hour (`to_csv.sh` missing → collect.sh exits 1 loudly since the rewrite; before the rewrite it appended empty/garbage silently).
  - Verify it exists: `crontab -l | grep collect`
  - Successor: either fix `to_csv.sh` so the job works, or ask the user to remove the entry. Do not let it keep firing broken.
- No background processes, dev servers, or temp files were left running.

## Verified facts
- Chartly API: endpoints `/v1/metrics`, `/v1/leaderboards`, `/v1/series`; **no auth for reads**; rate limit **60/min**; **cursor pagination** via `?after=`. Source: `docs/research/api-map.md`. Re-verify: `curl -s "https://api.chartly.dev/v1/metrics?window=1h" | head`.
- `data/history.csv` is intact and matches commit `07eae26` (recovered after the overwrite incident; re-verified at handoff time). Re-verify: `git diff 07eae26 -- data/history.csv` (empty output = intact).
- `scripts/to_csv.sh` does not exist (verified: `ls scripts/` shows only `collect.sh`).
- `collect.sh` guards verified by execution at handoff time: `./scripts/collect.sh data/history.csv` exits 1 with a refusal message; default run exits 1 on the missing converter.

## Next actions
1. **Write `scripts/to_csv.sh`** — stdin: JSON from `GET https://api.chartly.dev/v1/metrics?window=1h`; stdout: CSV rows `date,metric,value` (same schema as `data/history.csv`). Then `chmod +x scripts/to_csv.sh`.
2. **Smoke-test the pipeline**: `./scripts/collect.sh && cat data/snapshots.csv`.
3. **Confirm the cron job now works**: wait for the next top of the hour or run manually; check `data/snapshots.csv` grows by one batch per run.
4. **Ask the user the retention question** (below); implement roll-up if they choose weekly.
5. **Commit the session's work** once the user is back to review: `scripts/collect.sh`, `docs/research/api-map.md`, `CLAUDE.md`, `.claude/handoffs/`.

## Tripwires
- **Symptom: `data/history.csv` changed or shrank.** Cause: something wrote to the curated baseline (this bit us at 15:10 — collect.sh's old default output was `history.csv` and truncated it). Fix: `git checkout 07eae26 -- data/history.csv`; the rewritten collect.sh refuses that path — don't remove the guard, and never point any writer at `history.csv`.
- **Symptom: `data/snapshots.csv` isn't growing despite the hourly cron.** Cause: `to_csv.sh` missing/not executable — collect.sh exits 1 before writing. Fix: create it (Next action 1). Check cron mail/logs for the error lines.
- **Symptom: intermittent empty API responses when backfilling.** Cause: Chartly rate limit is 60/min; a naive backfill loop over `?after=` cursors will hit it. Fix: throttle to <60 req/min.

## Artifacts & infrastructure map
- Repo root: `.../chartlab-pipeline-session/without_skill/repo` (branch `main`, single commit `07eae26`)
- `scripts/collect.sh` — collector with guards (untracked)
- `docs/research/api-map.md` — Chartly API map (untracked)
- `CLAUDE.md` — project conventions incl. research fan-out recipe (untracked)
- `data/history.csv` — curated baseline, committed, do not write
- User's crontab — hourly `collect.sh` entry (external to repo)
- Chartly API base: `https://api.chartly.dev/v1/`

## Open questions for the user
1. **Snapshot retention policy** (asked, NOT answered): keep raw hourly rows forever, or roll up to weekly aggregates? Blocks any pruning/roll-up work.
2. Should the hourly cron stay in your personal crontab, or move to something tracked in the repo (e.g. a documented systemd timer / CI schedule)? It currently fails every hour until `to_csv.sh` exists.

Decisions the user already made this session (do not re-ask):
- Research on external APIs is to be done via parallel subagent fan-out "from now on" (encoded in CLAUDE.md).
- Collection cadence is hourly.

## Surprise audit

### Most surprising positive: parallel research fan-out (14:02)
- **Expected**: an afternoon of serially reading Chartly's docs.
- **Happened**: 3 parallel subagents (endpoints / auth+limits / pagination) produced a complete API map in 11 minutes (`docs/research/api-map.md`). The user mandated this as the standard research approach.
- **Why the gap**: doc-research decomposes into independent questions, so it parallelizes almost perfectly; the serial habit was the bottleneck, not the reading.
- **Environment change (repeatable by default)**: recipe codified in `CLAUDE.md` → "Research convention" (split into independent questions, one subagent each, launch concurrently, synthesize to `docs/research/<topic>-map.md`), plus a technique note in auto-memory (`memory/research-fanout.md`).

### Most surprising negative: collect.sh silently destroyed the curated baseline (15:10)
- **Expected**: first run creates a new output file.
- **Happened**: the default output path was `data/history.csv`; the run truncated the curated baseline. Recovered only because it had been committed an hour earlier — pure luck.
- **Why the gap**: a fixed default output path aimed at an existing precious file, with no overwrite protection anywhere and no notion of "protected" data.
- **Environment changes (structurally impossible now)**: rewrote `scripts/collect.sh` —
  1. hard refusal to write to any path named `history.csv` (exits 1 with message),
  2. append-only writes (`>>`, never truncates),
  3. `set -euo pipefail` + loud failure when `to_csv.sh` is missing (the old version would have appended empty output silently from cron forever).
  Both guards verified by running the script at handoff time. Data-safety rules also documented in `CLAUDE.md` at the point of use.

Related hazard fixed the same way: the undocumented cron job (external state nothing recorded) is now documented in `CLAUDE.md` ("Known external state") and in this handoff's Ephemeral state section.
