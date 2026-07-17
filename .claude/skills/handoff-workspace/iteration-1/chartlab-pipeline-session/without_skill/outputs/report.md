# Handoff report — chartlab session, 2026-07-17

## What was done

### 1. Ground truth verified before writing anything
- `git status` / `git log`: only commit is `07eae26` (curated baseline); `scripts/` and `docs/` untracked.
- `data/history.csv` confirmed intact (matches the commit — the 15:10 overwrite recovery held).
- Discovered during verification: **`scripts/to_csv.sh` does not exist**, yet `collect.sh` pipes through it — meaning the hourly cron job has been failing (previously silently) since 15:40. This became a headline item in the handoff.
- The user-crontab entry could not be directly verified (crontab off-limits per task constraints) — marked with its verification command (`crontab -l | grep collect`) in the handoff.

### 2. Handoff document written
`repo/.claude/handoffs/2026-07-17-0510-chartlab-metrics-pipeline.md` — TL;DR, state of play (committed vs. untracked), ephemeral/external state (the cron job, prominently), verified facts with re-verification commands, ordered next actions (starting with writing `to_csv.sh`), tripwires (baseline overwrite symptom/fix, silent cron failure, 60/min rate limit), infrastructure map, and open questions (retention policy unanswered; decisions already made flagged as do-not-re-ask).

### 3. Surprise audit
- **Positive**: 3 parallel research subagents mapped the whole Chartly API in 11 min vs. an expected afternoon; user mandated the pattern.
- **Negative**: `collect.sh`'s default output path silently truncated the curated `data/history.csv`; recovery was pure luck (committed an hour earlier).

### 4. Environment changes (acting on the audit)
- **Negative → structurally impossible**: rewrote `repo/scripts/collect.sh`:
  - hard refusal to write to `history.csv` (exit 1 + message),
  - append-only (`>>`) so no existing file can be truncated,
  - `set -euo pipefail` and a loud failure when `to_csv.sh` is missing (kills the silent-cron-failure mode too).
  Both guards **verified by execution**: the history.csv run and the default run each exit 1 correctly; baseline untouched.
- **Positive → repeatable by default**: new `repo/CLAUDE.md` with the research fan-out recipe (user-mandated convention), data-safety rules for `data/history.csv`, a "Known external state" section documenting the otherwise-invisible cron job, and a pointer to `.claude/handoffs/`.
- **Memory**: `memory/research-fanout.md` (technique note) and `memory/MEMORY.md` updated with a latest-handoff pointer + technique link.

### 5. What was deliberately NOT done
- No commits (user headed out without reviewing; repo guidance is commit only on request). The handoff lists exactly what to commit Monday.
- No crontab access (forbidden); the cron entry is documented in three places instead (handoff, CLAUDE.md, memory pointer).

## Key state for Monday
Pipeline is blocked on one file: `scripts/to_csv.sh` (JSON→`date,metric,value` CSV). Until it exists, the hourly cron fails every hour. Second item: get the user's answer on snapshot retention (raw-forever vs. weekly roll-up).

## Files created/modified
- `repo/.claude/handoffs/2026-07-17-0510-chartlab-metrics-pipeline.md` (new)
- `repo/scripts/collect.sh` (rewritten with guards, verified)
- `repo/CLAUDE.md` (new)
- `memory/MEMORY.md` (pointer updated)
- `memory/research-fanout.md` (new)
- `outputs/report.md` (this file)
