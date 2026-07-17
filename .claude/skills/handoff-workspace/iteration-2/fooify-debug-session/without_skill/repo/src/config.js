const fs = require('fs')
function loadConfig() {
  const env = { ...process.env }
  if (fs.existsSync('.env')) {
    for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
      const [k, v] = line.split('=')
      if (k && v !== undefined) env[k] = v
    }
  }
  return { apiBase: env.API_BASE || 'https://api.fooify.dev/v2', apiKey: env.FOOIFY_KEY }
}
module.exports = { loadConfig }
