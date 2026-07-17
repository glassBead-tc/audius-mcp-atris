const { loadConfig } = require('./config')
async function write(path, body) {
  const cfg = loadConfig()
  const res = await fetch(cfg.apiBase + path, {
    method: 'POST',
    headers: { 'x-api-key': cfg.apiKey, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}
module.exports = { write }
