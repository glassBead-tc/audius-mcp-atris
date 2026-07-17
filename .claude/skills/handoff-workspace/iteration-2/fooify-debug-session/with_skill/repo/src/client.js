const crypto = require('crypto')
const { loadConfig } = require('./config')

// TRIPWIRE (2026-07-17): Fooify accepts POSTs without an Idempotency-Key header,
// returns 200 WITH a receipt, and then never persists the record. Every write
// MUST send an Idempotency-Key, and a 200 must be treated as UNCONFIRMED until
// a follow-up GET shows the record (user directive, 2026-07-17). Use
// writeConfirmed() unless you have your own confirmation step.
async function write(path, body, { idempotencyKey } = {}) {
  const cfg = loadConfig()
  const res = await fetch(cfg.apiBase + path, {
    method: 'POST',
    headers: {
      'x-api-key': cfg.apiKey,
      'content-type': 'application/json',
      // Always sent — Fooify silently discards keyless writes (see tripwire above).
      'idempotency-key': idempotencyKey || crypto.randomUUID()
    },
    body: JSON.stringify(body)
  })
  return res.json()
}

// POST, then confirm via GET that the record actually persisted.
// `confirmPath` is a function receiving the POST receipt and returning the GET
// path for the created record, e.g. r => `/orders/${r.id}`.
// Returns { receipt, confirmed, record } — check `confirmed` before trusting the 200.
async function writeConfirmed(path, body, confirmPath, opts) {
  const cfg = loadConfig()
  const receipt = await write(path, body, opts)
  const res = await fetch(cfg.apiBase + confirmPath(receipt), {
    headers: { 'x-api-key': cfg.apiKey }
  })
  if (!res.ok) return { receipt, confirmed: false, record: null }
  const record = await res.json()
  return { receipt, confirmed: true, record }
}

module.exports = { write, writeConfirmed }
