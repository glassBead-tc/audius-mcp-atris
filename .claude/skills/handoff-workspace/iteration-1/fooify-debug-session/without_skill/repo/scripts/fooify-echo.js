#!/usr/bin/env node
// Replay a request through Fooify staging's UNDOCUMENTED /debug/echo endpoint,
// which reflects back exactly what their server received (headers + body).
// Discovered 2026-07-17; it turned an "hours with support" debugging session
// into minutes: send the same request from the working dashboard client and
// from our client, then diff the two echoes.
//
// Usage:
//   node scripts/fooify-echo.js '{"plan":"recurring","amount":100}'
//   node scripts/fooify-echo.js '<body-json>' | tee ours.json   # then diff vs dashboard capture
//
// Caveats: staging only; undocumented, so it may vanish without notice — if it
// 404s, fall back to a request-bin style capture and diff that instead.
const { loadConfig } = require('../src/config')

async function main() {
  const body = JSON.parse(process.argv[2] || '{}')
  const cfg = loadConfig()
  const res = await fetch(cfg.apiBase + '/debug/echo', {
    method: 'POST',
    headers: {
      'x-api-key': cfg.apiKey,
      'content-type': 'application/json',
      'idempotency-key': 'echo-test' // include so the echo shows what real writes send
    },
    body: JSON.stringify(body)
  })
  console.log(`status: ${res.status}`)
  console.log(JSON.stringify(await res.json(), null, 2))
}

main().catch(err => { console.error(err); process.exit(1) })
