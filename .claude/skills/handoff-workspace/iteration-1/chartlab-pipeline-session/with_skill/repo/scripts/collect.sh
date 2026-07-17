#!/usr/bin/env bash
# Collects hourly metrics from the Chartly API into a CSV.
#
# HISTORY (2026-07-17): the default output path used to be data/history.csv — the
# CURATED BASELINE — and the first run silently overwrote it (recovered via git,
# by luck). The guards below make that structurally impossible. Do not remove them.
set -euo pipefail

cd "$(dirname "$0")/.."   # always operate from the repo root, wherever invoked from

OUT="${1:-data/snapshots.csv}"

# --- Guard 1: the curated baseline is never a valid output path. ---
if [ "$(basename "$OUT")" = "history.csv" ]; then
  echo "collect.sh: refusing to write to '$OUT' — data/history.csv is the curated baseline (see CLAUDE.md, Data safety)." >&2
  exit 2
fi

# --- Guard 2: never clobber or append to a git-tracked, committed file. ---
# Collector output is scratch data; anything committed is curated by definition.
if git ls-files --error-unmatch "$OUT" >/dev/null 2>&1; then
  echo "collect.sh: refusing to write to '$OUT' — it is tracked by git. Pick an untracked output path." >&2
  exit 2
fi

mkdir -p "$(dirname "$OUT")"
curl -s "https://api.chartly.dev/v1/metrics?window=1h" | ./scripts/to_csv.sh >> "$OUT"
