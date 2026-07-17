// Fooify API client.
// TRIPWIRE (verified 2026-07-17): Fooify silently discards POSTs that lack an
// Idempotency-Key header — it still returns 200 with a receipt. A 200 is NOT
// proof of persistence; only a follow-up GET showing the record is.
// Policy (user decision 2026-07-17): always send an Idempotency-Key, and treat
// every 200 as unconfirmed until read back.
const crypto = require('crypto')
const { loadConfig } = require('./config')

async function write(path, body, { idempotencyKey } = {}) {
  const cfg = loadConfig()
  const res = await fetch(cfg.apiBase + path, {
    method: 'POST',
    headers: {
      'x-api-key': cfg.apiKey,
      'content-type': 'application/json',
      // Always sent — never make this conditional (see TRIPWIRE above).
      'idempotency-key': idempotencyKey || crypto.randomUUID()
    },
    body: JSON.stringify(body)
  })
  const receipt = await res.json()
  // Fooify 200s are unconfirmed until a follow-up GET shows the record.
  return { ...receipt, confirmed: false }
}
module.exports = { write }
