# Handoff: chartlab metrics time-series pipeline — first working day

## TL;DR
The Chartly API is mapped, `scripts/collect.sh` exists, and an hourly cron job in the
USER'S crontab is already calling it — but the script depends on `scripts/to_csv.sh`,
which does not exist, so every hourly run is failing right now. Next session: write
`to_csv.sh`, commit the pipeline, and get the user's answer on snapshot retention.

## State of play
- **Done & committed**: `data/history.csv` — the curated baseline dataset
  (commit `07eae26`, "data: curated history baseline"). This file is precious;
  see Tripwires.
- **Done & NOT committed** (untracked in working tree; uncommitted because the
  session ended before review):
  - `scripts/collect.sh` — hourly metrics collector. Guarded this session against
    writing to `data/history.csv` (see Surprise audit).
  - `docs/research/api-map.md` — Chartly API map (endpoints, auth, rate limits,
    pagination) produced by 3 parallel research subagents.
- **In flight**: the collection pipeline itself. `collect.sh` pipes
  `curl https://api.chartly.dev/v1/metrics?window=1h` through `./scripts/to_csv.sh`
  — **that converter script was never written**. Resume point:
  create `scripts/to_csv.sh` (JSON → `date,metric,value` rows matching
  `data/history.csv`'s header), then run `./scripts/collect.sh` once manually and
  inspect `data/snapshots.csv`.
- **Blocked**: retention policy decision (see Open questions). Everything else is
  unblocked.

## Ephemeral state — will NOT survive this session
- Nothing in-process: no dev servers, background shells, or subagents left running.
- **The opposite problem exists**: a cron job that DOES survive, outside the repo.
  Added 15:40 today via `crontab -e` in the **user's crontab**:
  `0 * * * * cd ~/chartlab && ./scripts/collect.sh`
  It runs hourly regardless of any session. Nothing in the repo created it, so a
  fresh clone will not have it and deleting the repo will not remove it.
  Verify: `crontab -l | grep collect`. It is currently failing every hour because
  `scripts/to_csv.sh` is missing (unverified as of handoff — I could not inspect
  cron output from here; check `mail` / syslog or just run the script manually).

## Verified facts
- Chartly API: endpoints `/v1/metrics`, `/v1/leaderboards`, `/v1/series`; reads need
  no auth; rate limit 60/min; cursor pagination via `?after=`.
  Source: `docs/research/api-map.md`. Re-verify:
  `curl -s "https://api.chartly.dev/v1/metrics?window=1h" | head`.
- `data/history.csv` at `07eae26` is the intact curated baseline
  (`date,metric,value` header + rows). Re-verify: `git show 07eae26:data/history.csv`.
- `scripts/to_csv.sh` does not exist. Re-verify: `ls scripts/`.
- Repo state at handoff: only commit is `07eae26`; `scripts/` and `docs/` untracked.
  Re-verify: `git status && git log --oneline`.

## Next actions
1. Write `scripts/to_csv.sh`: read Chartly JSON on stdin, emit CSV rows matching
   the `date,metric,value` schema of `data/history.csv`. Then test end-to-end:
   `./scripts/collect.sh && column -t -s, data/snapshots.csv`.
2. Decide whether `collect.sh` should write a CSV header when creating a fresh
   `data/snapshots.csv` (it appends with `>>`; first run currently produces a
   headerless file).
3. Commit the pipeline: `git add scripts/ docs/ && git commit` — until this happens
   the hourly cron on the user's machine is running uncommitted code.
4. Get the retention answer from the user (below), then implement it (rollup script
   + probably a second cron line, or a step inside `collect.sh`).
5. Optional hardening: the cron job assumes the repo lives at `~/chartlab`; if the
   checkout moves, the job dies silently. Consider `crontab -l` review with the user.

## Tripwires
- **Symptom: `data/history.csv` suddenly contains only recent rows / is truncated.**
  Cause: something wrote to the curated baseline path. This bit us at 15:10 today —
  `collect.sh`'s default output originally pointed at `data/history.csv` and
  destroyed it; recovered only because it had been committed an hour earlier.
  Fix: `git checkout data/history.csv`. Prevention now in place: `collect.sh`
  hard-refuses `data/history.csv` as an output path (exits 2). Do not remove that
  guard; if you need to regenerate the baseline, do it deliberately in a branch.
- **Symptom: `data/snapshots.csv` never appears / stays empty despite hourly cron.**
  Cause: `scripts/to_csv.sh` missing (current state), or repo not at `~/chartlab`,
  or Chartly rate limit (60/min — irrelevant hourly, relevant when backfilling).
  Fix: run `./scripts/collect.sh` manually in a shell and read the error.
- **Symptom: duplicate hourly rows after manual testing.** Cause: cron also ran;
  `collect.sh` appends unconditionally. Dedup by `(date,metric)` when analyzing.

## Artifacts & infrastructure map
- `scripts/collect.sh` — collector (untracked).
- `docs/research/api-map.md` — Chartly API research (untracked).
- `data/history.csv` — curated baseline (committed, `07eae26`). Never write to it.
- `data/snapshots.csv` — collector output (does not exist yet; created on first
  successful run).
- User crontab: `0 * * * * cd ~/chartlab && ./scripts/collect.sh` (external to repo).
- Chartly API base: `https://api.chartly.dev/v1/` (no auth for reads).
- This handoff + history: `.claude/handoffs/` in this repo.
- Session workflow conventions: `CLAUDE.md` (created at handoff — see below).

## Open questions for the user
- **Snapshot retention policy** (asked, NOT yet answered): keep raw hourly rows in
  `data/snapshots.csv` forever, or roll up weekly? Blocks next action 4.
- Decision the user DID make this session: research should be done via parallel
  subagent fan-out "from now on" — encoded in `CLAUDE.md`, don't re-ask.

## Surprise audit

### Most surprising positive: parallel research fan-out (14:02)
- **Expected**: an afternoon of serially reading Chartly's docs.
- **Happened**: 3 subagents researched in parallel (endpoints / auth+limits /
  pagination); a full, synthesized API map landed in `docs/research/api-map.md`
  in 11 minutes.
- **Why the gap**: doc-research decomposes into independent questions, so it
  parallelizes almost perfectly; the habit of serial reading hid that. The user
  explicitly endorsed the pattern ("let's do research this way from now on").
- **Environment change made**: encoded the pattern as the default research workflow
  in `CLAUDE.md` (new file, "Research workflow" section) with the concrete recipe:
  one subagent per independent question, synthesize into `docs/research/`.

### Most surprising negative: collect.sh silently destroyed the curated baseline (15:10)
- **Expected**: first run of `collect.sh` would create a new output file.
- **Happened**: its default output path was `data/history.csv`; it overwrote the
  curated baseline. Recovery was pure luck — the file had been committed an hour
  earlier.
- **Why the gap**: output path was a hard-coded default with no notion of protected
  files; nothing distinguished "curated data" from "scratch output".
- **Environment changes made** (highest rungs implementable now):
  1. *Structurally impossible*: `scripts/collect.sh` now resolves its output path
     and exits with an error if it points at `data/history.csv`; it also refuses
     any output path that is a tracked, committed file it did not create
     (guard block at top of the script).
  2. *Defaulted away / documented at point of use*: `data/history.csv` marked
     read-only on disk (`chmod a-w`), and `CLAUDE.md` "Data safety" section names
     it as never-write and requires committing curated data before running any
     script that touches `data/`.
  3. The undiscoverable cron job (adjacent negative surprise: repo has no record of
     machinery that outlives it) is now recorded here and in `CLAUDE.md`
     ("Standing machinery" section); rule added that any out-of-repo automation
     must be recorded in the repo in the same session that creates it.
