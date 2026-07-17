# chartlab project

## Research workflow (user-mandated)
User explicitly said "let's do research this way from now on" after API research
via 3 parallel subagents (endpoints / auth+rate-limits / pagination) synthesized
into docs/research/api-map.md in ~11 minutes. Default to parallel research
subagents for multi-facet documentation/API research; don't read vendor docs
end-to-end serially.

## Pipeline state (as of 2026-07-17)
- See repo HANDOFF.md for full resume state.
- BLOCKER: scripts/to_csv.sh never written; collect.sh pipeline fails at that step.
- EXTERNAL STATE: user's personal crontab runs `cd ~/chartlab && ./scripts/collect.sh`
  hourly (0 * * * *). Not tracked anywhere in the repo. It survives sessions and
  is currently failing every hour because of the missing to_csv.sh.
- Open question pending user answer: snapshot retention (keep raw hourly rows
  forever vs weekly rollup).

## Hazards / lessons
- collect.sh once overwrote the curated baseline data/history.csv (recovered via
  git checkout only because it had been committed an hour earlier). Script now
  refuses any output path named history.csv — keep that guard.
- Treat data/history.csv as read-only curated data; commit curated datasets
  before pointing any automation at the data/ directory.
