// Regression test: .env values must WIN over inherited shell/CI environment.
// On 2026-07-17 a CI-injected API_BASE silently overrode .env and pointed
// local dev at prod-mirror. loadConfig() must prefer .env.
const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const { loadConfig } = require('../src/config')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'melody-config-test-'))
fs.writeFileSync(path.join(dir, '.env'), 'API_BASE=https://from-dotenv.example\n')

const prevCwd = process.cwd()
const prevApiBase = process.env.API_BASE
process.env.API_BASE = 'https://from-inherited-shell.example'
process.chdir(dir)
try {
  const cfg = loadConfig()
  assert.strictEqual(
    cfg.apiBase,
    'https://from-dotenv.example',
    `.env must override inherited env, got ${cfg.apiBase}`
  )
  console.log('ok - .env overrides inherited environment')

  // And the inherited env is still used when .env has no value for the key.
  fs.writeFileSync(path.join(dir, '.env'), 'OTHER=1\n')
  const cfg2 = loadConfig()
  assert.strictEqual(
    cfg2.apiBase,
    'https://from-inherited-shell.example',
    `inherited env must be used when .env lacks the key, got ${cfg2.apiBase}`
  )
  console.log('ok - inherited env used when .env lacks the key')
} finally {
  process.chdir(prevCwd)
  if (prevApiBase === undefined) delete process.env.API_BASE
  else process.env.API_BASE = prevApiBase
}
