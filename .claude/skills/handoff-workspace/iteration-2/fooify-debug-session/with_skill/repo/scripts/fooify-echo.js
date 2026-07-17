#!/usr/bin/env node
// Fooify staging has an UNDOCUMENTED request reflector: POST /debug/echo
// returns exactly what their server received (headers + body). Discovered
// 2026-07-17; it located a missing Idempotency-Key header in minutes.
//
// Usage:
//   node scripts/fooify-echo.js                          # echo a default probe via src/client.js
//   node scripts/fooify-echo.js '{"sku":"test-1"}'       # echo an arbitrary JSON body
//
// Workflow for "our writes behave differently than <other client>'s":
//   1. Send your request to /debug/echo (this script uses src/client.js, so it
//      shows exactly what our client puts on the wire — headers included).
//   2. Have the other client hit /debug/echo the same way.
//   3. Diff the two reflections. The difference IS the bug.
//
// NOTE: this exists on Fooify STAGING only, appears in none of their docs, and
// could vanish without notice. If it 404s, fall back to a local capture:
// point API_BASE at a netcat/`node src/server.js`-style listener and read the
// raw request there.
const { write } = require('../src/client')

async function main() {
  const body = process.argv[2] ? JSON.parse(process.argv[2]) : { probe: 'fooify-echo', at: new Date().toISOString() }
  const reflected = await write('/debug/echo', body)
  console.log(JSON.stringify(reflected, null, 2))
}

main().catch(e => { console.error('echo failed (staging-only endpoint — did it vanish?):', e.message); process.exit(1) })
