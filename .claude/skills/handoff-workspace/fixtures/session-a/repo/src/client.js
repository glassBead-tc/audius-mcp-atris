// Fooify API client. NOTE: writes need idempotency keys or they are silently dropped.
const { loadConfig } = require('./config')
async function write(path, body) {
  const cfg = loadConfig()
  const res = await fetch(cfg.apiBase + path, {
    method: 'POST',
    headers: { 'x-api-key': cfg.apiKey, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()   // 200 does NOT mean persisted (no idempotency key sent yet)
}
module.exports = { write }
