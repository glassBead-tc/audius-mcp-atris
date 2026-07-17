#!/usr/bin/env node
// Reflect a request off Fooify STAGING's undocumented /debug/echo endpoint.
// It returns exactly what the server received (headers + body), which makes
// "my request looks right but the API misbehaves" bugs diffable in minutes:
// echo the same logical request from our client and from a known-good client
// (e.g. the dashboard), then diff the two outputs.
//
// Found 2026-07-17; this is how the silent Idempotency-Key discard was
// root-caused. Undocumented — re-verify it still exists before relying on it.
//
// Usage:
//   node scripts/debug-echo.js [METHOD] [BODY_JSON]
//   node scripts/debug-echo.js POST '{"sku":"abc","qty":1}'
//   API_BASE=https://staging.fooify.dev/v2 node scripts/debug-echo.js
//
// Uses loadConfig(), so it exercises the SAME config + header path as the real
// client (via client.write when METHOD is POST), not a hand-rolled request.
const { loadConfig } = require('../src/config')
const { write } = require('../src/client')

async function main() {
  const method = (process.argv[2] || 'POST').toUpperCase()
  const body = process.argv[3] ? JSON.parse(process.argv[3]) : { ping: true }
  const cfg = loadConfig()
  console.error(`# apiBase: ${cfg.apiBase}`)

  let echoed
  if (method === 'POST') {
    // Goes through client.write so the echo shows exactly what real writes send
    // (including the Idempotency-Key header).
    echoed = await write('/debug/echo', body)
  } else {
    const res = await fetch(cfg.apiBase + '/debug/echo', {
      method,
      headers: { 'x-api-key': cfg.apiKey }
    })
    echoed = await res.json()
  }
  console.log(JSON.stringify(echoed, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
