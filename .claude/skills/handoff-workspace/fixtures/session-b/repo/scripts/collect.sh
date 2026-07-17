#!/usr/bin/env bash
# Collects hourly metrics from the Chartly API into a CSV.
# WARNING (found today): -o defaults below used to point at data/history.csv and
# overwrote the curated dataset. Recovered from git. Still writes to a fixed path.
OUT="${1:-data/snapshots.csv}"
curl -s "https://api.chartly.dev/v1/metrics?window=1h" | ./scripts/to_csv.sh >> "$OUT"
