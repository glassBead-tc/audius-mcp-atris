// Regression test: values in .env must override injected environment variables.
// Guards against the 2026-07-17 incident where a CI-injected API_BASE silently
// pointed local dev at prod-mirror, shadowing the value in .env.
// Run: npm test  (node --test; note "node --test test/" with a trailing slash fails on Node 24)
const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

test('.env wins over injected env vars', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'melody-config-'))
  const prevCwd = process.cwd()
  const prevApiBase = process.env.API_BASE
  try {
    fs.writeFileSync(path.join(tmp, '.env'), 'API_BASE=https://staging.fooify.dev/v2\nFOOIFY_KEY=k\n')
    process.env.API_BASE = 'https://prod-mirror.fooify.dev/v2' // simulates CI injection
    process.chdir(tmp)
    delete require.cache[require.resolve('../src/config')]
    const { loadConfig } = require('../src/config')
    assert.strictEqual(loadConfig().apiBase, 'https://staging.fooify.dev/v2')
  } finally {
    process.chdir(prevCwd)
    if (prevApiBase === undefined) delete process.env.API_BASE
    else process.env.API_BASE = prevApiBase
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('injected env is used when .env has no entry', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'melody-config-'))
  const prevCwd = process.cwd()
  const prevApiBase = process.env.API_BASE
  try {
    fs.writeFileSync(path.join(tmp, '.env'), 'FOOIFY_KEY=k\n')
    process.env.API_BASE = 'https://injected.fooify.dev/v2'
    process.chdir(tmp)
    delete require.cache[require.resolve('../src/config')]
    const { loadConfig } = require('../src/config')
    assert.strictEqual(loadConfig().apiBase, 'https://injected.fooify.dev/v2')
  } finally {
    process.chdir(prevCwd)
    if (prevApiBase === undefined) delete process.env.API_BASE
    else process.env.API_BASE = prevApiBase
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})
