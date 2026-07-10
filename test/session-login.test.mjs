/**
 * Behavioral tests for the session-login path (login tool workaround for
 * MCP clients that never attach bearer tokens — claude-code#46140).
 *
 * Covers the token store (deposit/claim/refresh/logout) and the broker's
 * session-mode callback depositing tokens via onSessionTokens.
 */
import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { once } from "node:events"
import { makeTokenStore, toStoredTokens } from "../dist/auth/UserAuth.js"
import { makeOAuthBroker } from "../dist/auth/OAuthBroker.js"

async function startStubUpstream() {
  const requests = []
  const server = http.createServer(async (req, res) => {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}
    requests.push({ path: req.url, body })
    if (req.url === "/oauth/token" && body.grant_type === "authorization_code") {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ access_token: "session-access-1", token_type: "Bearer", expires_in: 3600, refresh_token: "session-refresh-1", scope: "write" }))
      return
    }
    if (req.url === "/oauth/token" && body.grant_type === "refresh_token") {
      const ok = body.refresh_token === "session-refresh-1"
      res.writeHead(ok ? 200 : 400, { "Content-Type": "application/json" })
      res.end(JSON.stringify(ok
        ? { access_token: "session-access-2", token_type: "Bearer", expires_in: 3600, refresh_token: "session-refresh-2" }
        : { error: "invalid_grant" }))
      return
    }
    res.writeHead(200)
    res.end("{}")
  })
  server.listen(0)
  await once(server, "listening")
  return { server, base: `http://127.0.0.1:${server.address().port}`, requests }
}

test("token store: deposit → claim → bearer, unknown ids, logout", async (t) => {
  const upstream = await startStubUpstream()
  t.after(() => upstream.server.close())
  const store = makeTokenStore({ upstreamBase: upstream.base, clientId: "key" })

  assert.equal(store.claim("nope"), "unknown")
  assert.equal(store.isActive(), false)
  assert.equal(await store.bearer(), undefined)

  store.deposit("login-1", { access_token: "tok-a", expires_in: 3600, refresh_token: "r-a" })
  assert.equal(store.claim("login-1"), "claimed")
  assert.equal(store.isActive(), true)
  assert.equal(await store.bearer(), "tok-a")
  // claiming an unknown id while a login is active reports pending, not unknown
  assert.equal(store.claim("login-1"), "pending")

  assert.equal(await store.logout(), true)
  assert.equal(store.isActive(), false)
})

test("token store auto-refreshes near expiry and drops dead logins", async (t) => {
  const upstream = await startStubUpstream()
  t.after(() => upstream.server.close())
  const store = makeTokenStore({ upstreamBase: upstream.base, clientId: "key" })

  // Token that is already inside the refresh window
  store.deposit("login-2", { access_token: "stale", expires_in: 30, refresh_token: "session-refresh-1" })
  store.claim("login-2")
  assert.equal(await store.bearer(), "session-access-2")

  // Next refresh uses the ROTATED refresh token — but our stub only accepts
  // the original once, so simulate expiry again and watch it fail cleanly.
  store.deposit("login-3", { access_token: "stale2", expires_in: 30, refresh_token: "already-consumed" })
  store.claim("login-3")
  assert.equal(await store.bearer(), undefined)
  assert.equal(store.isActive(), false)
})

test("toStoredTokens computes expiry and tolerates missing fields", () => {
  const before = Date.now()
  const t1 = toStoredTokens({ access_token: "x", expires_in: 100 })
  assert.ok(t1.expiresAt >= before + 99_000 && t1.expiresAt <= Date.now() + 101_000)
  const t2 = toStoredTokens({ access_token: "y" })
  assert.ok(t2.expiresAt > Date.now() + 3_500_000) // default 1h
  assert.equal(t2.refreshToken, undefined)
})

test("broker session-mode: startSessionLogin → callback deposits tokens", async (t) => {
  const upstream = await startStubUpstream()
  t.after(() => upstream.server.close())

  const deposited = []
  const broker = makeOAuthBroker({
    secret: "session-test-secret",
    audiusApiKey: "api-key-1",
    upstreamBase: upstream.base,
    defaultScope: "write",
    onSessionTokens: (loginId, tokens) => deposited.push({ loginId, tokens })
  })

  const brokerSrv = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`)
    if (!(await broker.handle(req, res, url))) {
      res.writeHead(404)
      res.end()
    }
  })
  brokerSrv.listen(0)
  await once(brokerSrv, "listening")
  t.after(() => brokerSrv.close())
  const base = `http://127.0.0.1:${brokerSrv.address().port}`

  // Start a session login — consent URL points at upstream with our state
  const { loginId, url } = broker.startSessionLogin(base)
  const consent = new URL(url)
  assert.equal(consent.searchParams.get("scope"), "write")
  assert.equal(consent.searchParams.get("redirect_uri"), `${base}/oauth/callback`)
  const state = consent.searchParams.get("state")

  // Simulate Audius redirecting back with a code
  const cb = await fetch(`${base}/oauth/callback?code=any-code&state=${encodeURIComponent(state)}`)
  assert.equal(cb.status, 200)
  const html = await cb.text()
  assert.match(html, /Logged in with Audius/)

  assert.equal(deposited.length, 1)
  assert.equal(deposited[0].loginId, loginId)
  assert.equal(deposited[0].tokens.access_token, "session-access-1")

  // Upstream error path renders a failure page, deposits nothing
  const { url: url2 } = broker.startSessionLogin(base)
  const state2 = new URL(url2).searchParams.get("state")
  const cbErr = await fetch(`${base}/oauth/callback?error=access_denied&state=${encodeURIComponent(state2)}`)
  assert.equal(cbErr.status, 400)
  assert.match(await cbErr.text(), /Login failed/)
  assert.equal(deposited.length, 1)
})
