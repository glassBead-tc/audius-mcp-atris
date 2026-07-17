# Handoff report — chartlab session, 2026-07-17

## What was done

### 1. Ground truth verified before writing
- `git status` / `git log`: single commit `07eae26` (curated `data/history.csv`); `scripts/collect.sh` and `docs/research/api-map.md` untracked.
- Read all repo files. **New finding during verification**: `collect.sh` pipes through `./scripts/to_csv.sh`, which does not exist — so the hourly cron job recorded in the transcript is failing on every run. Flagged prominently in the handoff.
- Cron entry is external state (user crontab, per instructions not touched/run); recorded from the transcript and marked "unverified as of handoff" where appropriate.

### 2. Handoff document
`repo/.claude/handoffs/2026-07-17-1600-chartlab-metrics-pipeline.md` — TL;DR, state of play (committed vs untracked, exact resume point: write `to_csv.sh`), ephemeral/standing state (the crontab entry that outlives the session and is recorded nowhere in the repo), verified facts with re-verification commands, ordered next actions, tripwires (history.csv truncation symptom, silent cron failure, duplicate rows), infra map, open questions (retention policy unanswered; fan-out research mandate already decided — don't re-ask), and the surprise audit.

### 3. Surprise audit
- **Positive**: 3-way parallel research subagent fan-out mapped the Chartly API in 11 minutes vs. an expected afternoon; user mandated the pattern going forward.
- **Negative**: first run of `collect.sh` silently overwrote the curated `data/history.csv` because its default output path pointed at it; recovery via git was pure luck.

### 4. Environment changes (all inside ./repo and ./memory)
- `repo/scripts/collect.sh` — rewritten with two structural guards (exit 2): refuses `history.csv` as output basename, and refuses any git-tracked output path (committed = curated). Also `set -euo pipefail`, repo-root cd, `mkdir -p` for the output dir. Guard tested: fires with exit 2.
- `repo/data/history.csv` — `chmod a-w` (read-only on disk).
- `repo/CLAUDE.md` — new: "Research workflow" section encoding the fan-out pattern (positive surprise made the default), "Data safety" rules, and "Standing machinery" section recording the crontab entry plus a rule that out-of-repo automation must be recorded in-repo in the session that creates it.
- `memory/MEMORY.md` — latest-handoff pointer + the research-convention entry.

### Not done (deliberate)
- No commits (user didn't ask; documented in handoff that the cron runs uncommitted code).
- Did not create `scripts/to_csv.sh` — that's the successor's first next action, not a handoff task.
- Did not touch the real crontab, real memory dir, or the audius source tree.
