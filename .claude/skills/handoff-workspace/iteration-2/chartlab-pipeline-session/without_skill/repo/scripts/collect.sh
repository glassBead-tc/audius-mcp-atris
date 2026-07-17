#!/usr/bin/env bash
# Collects hourly metrics from the Chartly API into a CSV.
#
# EXTERNAL STATE: this script is run hourly by an entry in the user's
# PERSONAL crontab (added 2026-07-17, nothing in this repo installs it):
#   0 * * * * cd ~/chartlab && ./scripts/collect.sh
# If you rename/move this script, update or remove that crontab entry too.
#
# KNOWN BLOCKER: scripts/to_csv.sh does not exist yet, so this pipeline
# currently produces no rows. See HANDOFF.md.
set -euo pipefail

OUT="${1:-data/snapshots.csv}"

# Guard: never write to the curated baseline dataset. On 2026-07-17 this
# script's default output pointed at data/history.csv and overwrote it
# (recovered via git checkout). Refuse any output path that resolves to it.
BASELINE="data/history.csv"
if [ "$OUT" = "$BASELINE" ] || [ "$(basename "$OUT")" = "history.csv" ]; then
  echo "collect.sh: refusing to write to curated baseline '$OUT'" >&2
  exit 1
fi

curl -s "https://api.chartly.dev/v1/metrics?window=1h" | ./scripts/to_csv.sh >> "$OUT"
