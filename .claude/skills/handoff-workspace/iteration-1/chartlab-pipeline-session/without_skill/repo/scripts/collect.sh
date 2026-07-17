#!/usr/bin/env bash
# Collects hourly metrics from the Chartly API into a CSV (append-only).
# Usage: ./scripts/collect.sh [output.csv]   (default: data/snapshots.csv)
#
# HISTORY (2026-07-17): the old default output was data/history.csv and the first
# run silently overwrote the curated baseline (recovered via git checkout). The
# guards below make that class of accident structurally impossible:
#   1. Writing to data/history.csv (the curated baseline) is refused outright.
#   2. Output is append-only (>>) — an existing file is never truncated.
#   3. Missing dependencies fail loudly instead of producing empty appends.
set -euo pipefail

OUT="${1:-data/snapshots.csv}"

# Guard 1: never touch the curated baseline.
if [[ "$(basename "$OUT")" == "history.csv" ]]; then
  echo "ERROR: refusing to write to $OUT — data/history.csv is the curated baseline dataset." >&2
  echo "Pass a different output path (default is data/snapshots.csv)." >&2
  exit 1
fi

# Guard 2: fail loudly if the converter is missing (a silent failure here means
# the hourly cron job appends nothing and nobody notices).
if [[ ! -x ./scripts/to_csv.sh ]]; then
  echo "ERROR: ./scripts/to_csv.sh not found or not executable — cannot convert API output." >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
curl -sf "https://api.chartly.dev/v1/metrics?window=1h" | ./scripts/to_csv.sh >> "$OUT"
