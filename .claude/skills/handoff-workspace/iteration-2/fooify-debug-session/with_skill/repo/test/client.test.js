// Regression test: every Fooify write must carry an Idempotency-Key header.
// Fooify 200s keyless POSTs and then silently never persists them (2026-07-17).
const assert = require('assert')

const captured = []
global.fetch = async (url, opts = {}) => {
  captured.push({ url, opts })
  return { ok: true, json: async () => ({ id: 'r1', receipt: 'stub' }) }
}

const { write, writeConfirmed } = require('../src/client')

;(async () => {
  await write('/recurring-orders', { sku: 'x' })
  const headers1 = captured[0].opts.headers
  assert.ok(headers1['idempotency-key'], 'write() must always send an Idempotency-Key')
  assert.ok(headers1['idempotency-key'].length >= 16, 'key must be non-trivial')
  console.log('ok - write() always sends an Idempotency-Key')

  await write('/recurring-orders', { sku: 'x' }, { idempotencyKey: 'caller-key-123' })
  assert.strictEqual(captured[1].opts.headers['idempotency-key'], 'caller-key-123')
  console.log('ok - caller-supplied key is honored')

  const out = await writeConfirmed('/recurring-orders', { sku: 'x' }, r => `/recurring-orders/${r.id}`)
  assert.strictEqual(captured[3].url.endsWith('/recurring-orders/r1'), true, 'confirm GET hits record path')
  assert.strictEqual(out.confirmed, true)
  console.log('ok - writeConfirmed() follows up with a GET and reports confirmed')
})().catch(e => { console.error(e); process.exit(1) })
