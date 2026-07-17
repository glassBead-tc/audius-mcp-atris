#!/usr/bin/env bash
# Collects hourly metrics from the Chartly API into a CSV.
#
# Usage: collect.sh [output.csv]   (default: data/snapshots.csv)
# This script APPENDS rows to a snapshot file. It must never touch curated
# datasets: on 2026-07-17 its first run overwrote data/history.csv (the
# hand-curated baseline) because the default output pointed there. The guard
# below makes that structurally impossible — list protected files in
# data/PROTECTED (one path per line, relative to repo root).
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-data/snapshots.csv}"

# --- Guard: refuse to write to protected/curated datasets ---
PROTECTED_LIST="data/PROTECTED"
if [ -f "$PROTECTED_LIST" ]; then
  while IFS= read -r protected; do
    [ -z "$protected" ] && continue
    case "$protected" in \#*) continue ;; esac
    if [ "$OUT" = "$protected" ] || [ "$(basename "$OUT")" = "$(basename "$protected")" ]; then
      echo "collect.sh: REFUSING to write to protected dataset '$OUT' (listed in $PROTECTED_LIST)" >&2
      exit 1
    fi
  done < "$PROTECTED_LIST"
fi

curl -s "https://api.chartly.dev/v1/metrics?window=1h" | ./scripts/to_csv.sh >> "$OUT"
