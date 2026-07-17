# Handoff report — chartlab session, 2026-07-17

## What I did

### 1. Wrote the handoff document: repo/HANDOFF.md
Single resume point for Monday's session. Covers: goal, exact state of each
artifact (with committed/uncommitted status), the blocker, external cron state,
the data-clobber incident, the open retention-policy question, a suggested
Monday task order, and the user's process preference.

### 2. Audited the session for surprises

Most surprising negative (found during handoff, not in the log): the pipeline
has never worked. scripts/collect.sh pipes through ./scripts/to_csv.sh, which
was never written. Verified by running the script: "./scripts/to_csv.sh: No
such file or directory". Since the personal crontab entry fires this hourly,
the pipeline has been failing silently every hour since ~15:40. Flagged as the
BLOCKER and first Monday task in HANDOFF.md.

Known negative from the log: collect.sh overwrote the curated baseline
data/history.csv at 15:10 (recovered via git checkout).

Positive: parallel research subagents (3-way fan-out over endpoints /
auth+rate-limits / pagination) produced the full API map in 11 minutes; user
said "let's do research this way from now on."

### 3. Changed the environment so the negative is structurally unlikely
Hardened repo/scripts/collect.sh:
- Guard that refuses any output path resolving to / named history.csv
  (verified: exits 1 with a clear message when given data/history.csv).
- set -euo pipefail — the missing-to_csv.sh failure is now a loud nonzero exit
  instead of a silent no-op, so cron surfaces it.
- Header comments documenting the otherwise-invisible personal crontab entry
  (0 * * * * cd ~/chartlab && ./scripts/collect.sh) and the known blocker, so
  anyone touching the script sees both.

I did NOT write to_csv.sh (would require guessing the Chartly JSON shape) and
did NOT touch the crontab (disallowed here; documented instead, with a
suggestion to move it into a committed installer script).

### 4. Made the positive repeatable via memory
- memory/chartlab.md — user-mandated parallel-subagent research default,
  pipeline blocker, external cron state, and the never-write-to-history.csv
  hazard.
- memory/MEMORY.md — index entry pointing at it, with key facts inline.

### 5. Deliberate non-actions
- No commits: user has not asked; uncommitted files (HANDOFF.md, docs/,
  scripts/) are enumerated in HANDOFF.md with a step to commit them Monday.
- Open retention-policy question preserved verbatim as an explicit "re-ask the
  user" item rather than answered unilaterally.

## Files touched
- repo/HANDOFF.md (new)
- repo/scripts/collect.sh (hardened)
- memory/chartlab.md (new)
- memory/MEMORY.md (index updated)
