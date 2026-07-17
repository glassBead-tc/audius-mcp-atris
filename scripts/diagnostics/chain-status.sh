#!/usr/bin/env bash
# Is the OAP chain producing blocks? Run this FIRST when writes misbehave.
#
# Why this exists: on 2026-07-17 the mainnet chain halted at block 28272228 and
# hours went into debugging our auth while every write returned a healthy-looking
# 200 + mined receipt. Separately, receipts can mine while the ETL indexer still
# discards the effect — so "chain advancing" is necessary but NOT sufficient;
# always verify indexed state after a write (favorite → read-back).
set -euo pipefail

height() {
  curl -s -m 10 "https://api.audius.co/health_check" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const c=JSON.parse(d).data.core_indexer;console.log(c.last_indexed_block)})"
}

h1=$(height)
echo "block height: $h1 (sampling again in 10s...)"
sleep 10
h2=$(height)
echo "block height: $h2"
if [ "$h2" -gt "$h1" ]; then
  echo "VERDICT: chain is producing blocks (+$((h2 - h1)) in 10s)"
else
  echo "VERDICT: chain appears HALTED at $h1 — writes will receipt-then-vanish or time out."
  echo "         Do not debug auth until this recovers."
fi
