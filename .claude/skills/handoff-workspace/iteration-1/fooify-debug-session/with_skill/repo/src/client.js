// Fooify API client.
//
// TRIPWIRE (root-caused 2026-07-17): Fooify silently DISCARDS POSTs that lack an
// Idempotency-Key header, yet still returns 200 with a receipt. A 200 from Fooify
// is NOT proof of persistence. Their docs do not mention this. Proven by replaying
// the identical POST with the header — the record appeared instantly.
// User decision 2026-07-17: always send idempotency keys, and treat Fooify 200s as
// unconfirmed until a follow-up GET shows the record (use confirmWrite below).
const crypto = require('crypto')
const { loadConfig } = require('./config')

async function write(path, body, { idempotencyKey } = {}) {
  const cfg = loadConfig()
  // Always generated if not supplied — a write without this header cannot leave
  // this function. Do NOT remove: Fooify drops keyless POSTs while returning 200.
  const key = idempotencyKey || crypto.randomUUID()
  const res = await fetch(cfg.apiBase + path, {
    method: 'POST',
    headers: {
      'x-api-key': cfg.apiKey,
      'content-type': 'application/json',
      'Idempotency-Key': key
    },
    body: JSON.stringify(body)
  })
  const receipt = await res.json()
  // confirmed: false — even with the key, callers must verify persistence with a
  // follow-up GET (confirmWrite) before treating the write as durable.
  return { ...receipt, idempotencyKey: key, confirmed: false }
}

// Follow-up read that tells you whether a write actually persisted.
// e.g. const r = await write('/orders', o); await confirmWrite('/orders/' + r.id)
async function confirmWrite(path) {
  const cfg = loadConfig()
  const res = await fetch(cfg.apiBase + path, {
    headers: { 'x-api-key': cfg.apiKey }
  })
  return res.ok
}

module.exports = { write, confirmWrite }
