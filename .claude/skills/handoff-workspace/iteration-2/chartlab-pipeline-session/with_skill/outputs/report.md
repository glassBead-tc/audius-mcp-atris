# Handoff run report — chartlab, 2026-07-17

## What was done

### Step 1 — Ground truth verified (repo-verifiable state)
- `git status` / `git log`: branch `main`, single commit `bff5603` ("data:
  curated history baseline"); `scripts/collect.sh` and `docs/research/api-map.md`
  untracked, working tree otherwise clean.
- `data/history.csv` intact (matches the restored/committed baseline).
- New finding during verification: `scripts/to_csv.sh`, which `collect.sh`
  pipes through, does not exist in the repo — every collect.sh run (and thus
  the hourly cron) fails at that line. Recorded as a verified fact, tripwire,
  and Next action #1.
- Cron entry could not be verified live (crontab off-limits in this
  environment); recorded from the transcript and marked "unverified as of
  handoff" with the verification command (`crontab -l | grep collect`).

### Step 2 — Handoff document
Written to `repo/.claude/handoffs/2026-07-17-0553-chartlab-metrics-pipeline.md`
with all skill sections: TL;DR, State of play, Ephemeral state, Verified facts
(each with a re-verification command), ordered Next actions with entry points,
Tripwires (symptom -> cause -> fix), Artifacts map, Open questions (retention
policy pending; decisions already made noted so they aren't re-asked), and the
Surprise audit.

### Step 3 — Surprise audit
- Positive: parallel research subagents mapped the whole Chartly API in
  11 minutes vs. an expected long serial doc read; user endorsed it as the
  standing method.
- Negative: `collect.sh`'s first run overwrote `data/history.csv` (the curated
  baseline) because its default output path pointed there; saved only by a
  lucky commit an hour earlier. Even after the default changed, the script had
  no guard.

### Step 4 — Environment changes
- Negative -> structurally impossible (hierarchy rung 1):
  - `repo/data/PROTECTED` (new): machine-readable list of curated datasets.
  - `repo/scripts/collect.sh`: guard that refuses any output path listed in
    `data/PROTECTED` (path or basename match), plus `set -euo pipefail` and a
    header explaining the incident. Tested: `./scripts/collect.sh
    data/history.csv` exits 1 with a refusal message before any network call;
    baseline unchanged. `bash -n` syntax check passes.
- Positive -> repeatable by default:
  - `repo/CLAUDE.md` (new): "Research workflow" section encoding the parallel
    subagent recipe as the project default; also "Data safety" (PROTECTED
    convention), "Off-repo infrastructure" (the crontab entry, previously
    referenced nowhere in the repo), and the handoff-directory convention.
  - `memory/parallel-research.md` (new): cross-project note on the technique
    with evidence and the user's endorsement.

### Step 5 — Discovery wiring
- `memory/MEMORY.md`: replaced the empty index with a "Latest handoff" pointer
  line and an index entry for the parallel-research note.

## Files changed/created
- `repo/.claude/handoffs/2026-07-17-0553-chartlab-metrics-pipeline.md` (new)
- `repo/scripts/collect.sh` (modified: guard + strict mode)
- `repo/data/PROTECTED` (new)
- `repo/CLAUDE.md` (new)
- `memory/MEMORY.md` (updated: handoff pointer + index entry)
- `memory/parallel-research.md` (new)

Nothing was committed (the user didn't request a commit); the handoff document
lists the exact `git add`/commit step as Next action #3. No crontab commands
were run; no files were written outside the task working directory.
