/**
 * Behavioral tests for the stateless OAuth broker (capability roadmap Phase 2).
 *
 * Drives the full brokered flow against a stubbed upstream "Audius":
 * register → authorize (302 to upstream) → callback (code exchange) →
 * token (PKCE verification) — plus crypto guarantees.
 */
import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { once } from "node:events"
import { deriveKey, seal, unseal, s256Challenge, randomToken } from "../dist/auth/Crypto.js"
import { makeOAuthBroker } from "../dist/auth/OAuthBroker.js"

// ---------------------------------------------------------------------------
// Crypto unit tests
// ---------------------------------------------------------------------------

const key = deriveKey("test-secret")

test("seal/unseal round-trips data under the right purpose", () => {
  const token = seal(key, "demo", { a: 1, b: "two" })
  assert.deepEqual(unseal(key, "demo", token), { a: 1, b: "two" })
})

test("unseal rejects wrong purpose, wrong key, tampering, and expiry", () => {
  const token = seal(key, "demo", { a: 1 }, 60)
  assert.equal(unseal(key, "other", token), null)
  assert.equal(unseal(deriveKey("different-secret"), "demo", token), null)
  const tampered = token.slice(0, -4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA")
  assert.equal(unseal(key, "demo", tampered), null)
  const expired = seal(key, "demo", { a: 1 }, -5)
  assert.equal(unseal(key, "demo", expired), null)
})

// ---------------------------------------------------------------------------
// Full-flow integration test with a stubbed upstream
// ---------------------------------------------------------------------------

const UPSTREAM_TOKENS = {
  access_token: "audius-access-token-abc",
  token_type: "Bearer",
  expires_in: 3600,
  refresh_token: "audius-refresh-token-xyz",
  refresh_expires_in: 2592000,
  scope: "write"
}

async function startStubUpstream() {
  const requests = []
  const server = http.createServer(async (req, res) => {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}
    requests.push({ path: req.url, body })
    if (req.url === "/oauth/token" && body.grant_type === "authorization_code") {
      res.writeHead(body.code === "upstream-code-123" ? 200 : 400, { "Content-Type": "application/json" })
      res.end(JSON.stringify(body.code === "upstream-code-123" ? UPSTREAM_TOKENS : { error: "invalid_grant" }))
      return
    }
    if (req.url === "/oauth/token" && body.grant_type === "refresh_token") {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ ...UPSTREAM_TOKENS, access_token: "rotated-access", refresh_token: "rotated-refresh" }))
      return
    }
    res.writeHead(404)
    res.end("{}")
  })
  server.listen(0)
  await once(server, "listening")
  return { server, port: server.address().port, requests }
}

async function startBrokerServer(upstreamPort) {
  const broker = makeOAuthBroker({
    secret: "broker-test-secret",
    audiusApiKey: "my-audius-api-key",
    upstreamBase: `http://127.0.0.1:${upstreamPort}`,
    defaultScope: "write"
  })
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`)
    const handled = await broker.handle(req, res, url)
    if (!handled) {
      res.writeHead(404)
      res.end()
    }
  })
  server.listen(0)
  await once(server, "listening")
  return { server, base: `http://127.0.0.1:${server.address().port}` }
}

test("full brokered OAuth flow: register → authorize → callback → token", async (t) => {
  const upstream = await startStubUpstream()
  const brokerSrv = await startBrokerServer(upstream.port)
  t.after(() => {
    upstream.server.close()
    brokerSrv.server.close()
  })
  const base = brokerSrv.base

  // 0. Metadata is served
  const prm = await (await fetch(`${base}/.well-known/oauth-protected-resource`)).json()
  assert.equal(prm.resource, `${base}/mcp`)
  const asm = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json()
  assert.equal(asm.token_endpoint, `${base}/oauth/token`)
  assert.deepEqual(asm.code_challenge_methods_supported, ["S256"])

  // 1. Dynamic client registration
  const regResp = await fetch(`${base}/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redirect_uris: ["http://localhost:9999/cb"], client_name: "test-client" })
  })
  assert.equal(regResp.status, 201)
  const { client_id } = await regResp.json()
  assert.ok(client_id.length > 20)

  // 2. Authorize → 302 to upstream Audius with brokered PKCE
  const verifier = randomToken(48)
  const authUrl = new URL(`${base}/oauth/authorize`)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("client_id", client_id)
  authUrl.searchParams.set("redirect_uri", "http://localhost:9999/cb")
  authUrl.searchParams.set("state", "client-state-42")
  authUrl.searchParams.set("code_challenge", s256Challenge(verifier))
  authUrl.searchParams.set("code_challenge_method", "S256")
  authUrl.searchParams.set("scope", "write")
  const authResp = await fetch(authUrl, { redirect: "manual" })
  assert.equal(authResp.status, 302)
  const upstreamAuthorize = new URL(authResp.headers.get("location"))
  assert.equal(upstreamAuthorize.pathname, "/oauth/authorize")
  assert.equal(upstreamAuthorize.searchParams.get("api_key"), "my-audius-api-key")
  assert.equal(upstreamAuthorize.searchParams.get("scope"), "write")
  assert.equal(upstreamAuthorize.searchParams.get("response_mode"), "query")
  assert.equal(upstreamAuthorize.searchParams.get("code_challenge_method"), "S256")
  const upstreamState = upstreamAuthorize.searchParams.get("state")
  assert.ok(upstreamState.length > 20)

  // 3. Audius redirects back to our callback → we exchange upstream and
  //    redirect to the client with OUR sealed code
  const cbResp = await fetch(
    `${base}/oauth/callback?code=upstream-code-123&state=${encodeURIComponent(upstreamState)}`,
    { redirect: "manual" }
  )
  assert.equal(cbResp.status, 302)
  const clientRedirect = new URL(cbResp.headers.get("location"))
  assert.equal(clientRedirect.origin + clientRedirect.pathname, "http://localhost:9999/cb")
  assert.equal(clientRedirect.searchParams.get("state"), "client-state-42")
  const ourCode = clientRedirect.searchParams.get("code")
  assert.ok(ourCode.length > 20)
  // The upstream exchange used the broker's own verifier
  const exchange = upstream.requests.find((r) => r.body.grant_type === "authorization_code")
  assert.equal(exchange.body.client_id, "my-audius-api-key")
  assert.equal(s256Challenge(exchange.body.code_verifier), upstreamAuthorize.searchParams.get("code_challenge"))

  // 4a. Token exchange with the WRONG verifier fails PKCE
  const badResp = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "authorization_code", code: ourCode, code_verifier: "wrong-verifier-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", client_id })
  })
  assert.equal(badResp.status, 400)
  assert.equal((await badResp.json()).error, "invalid_grant")

  // 4b. Correct verifier returns the raw Audius token pair
  const tokenResp = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: ourCode,
      code_verifier: verifier,
      client_id,
      redirect_uri: "http://localhost:9999/cb"
    }).toString()
  })
  assert.equal(tokenResp.status, 200)
  const tokens = await tokenResp.json()
  assert.equal(tokens.access_token, "audius-access-token-abc")
  assert.equal(tokens.refresh_token, "audius-refresh-token-xyz")
  assert.equal(tokens.expires_in, 3600)

  // 5. Refresh grant proxies rotation upstream
  const refreshResp = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "refresh_token", refresh_token: "audius-refresh-token-xyz" })
  })
  assert.equal(refreshResp.status, 200)
  const rotated = await refreshResp.json()
  assert.equal(rotated.access_token, "rotated-access")
  assert.equal(rotated.refresh_token, "rotated-refresh")
})

test("authorize rejects unregistered redirect_uri and unknown client", async (t) => {
  const upstream = await startStubUpstream()
  const brokerSrv = await startBrokerServer(upstream.port)
  t.after(() => {
    upstream.server.close()
    brokerSrv.server.close()
  })
  const base = brokerSrv.base

  const reg = await (await fetch(`${base}/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redirect_uris: ["http://localhost:9999/cb"] })
  })).json()

  const evil = new URL(`${base}/oauth/authorize`)
  evil.searchParams.set("response_type", "code")
  evil.searchParams.set("client_id", reg.client_id)
  evil.searchParams.set("redirect_uri", "https://evil.example.com/steal")
  evil.searchParams.set("code_challenge", s256Challenge("v"))
  const evilResp = await fetch(evil, { redirect: "manual" })
  assert.equal(evilResp.status, 400)

  const unknown = new URL(`${base}/oauth/authorize`)
  unknown.searchParams.set("response_type", "code")
  unknown.searchParams.set("client_id", "not-a-real-client-id")
  unknown.searchParams.set("redirect_uri", "http://localhost:9999/cb")
  const unknownResp = await fetch(unknown, { redirect: "manual" })
  assert.equal(unknownResp.status, 400)
  assert.equal((await unknownResp.json()).error, "invalid_client")
})

test("registration rejects non-loopback http redirect URIs", async (t) => {
  const upstream = await startStubUpstream()
  const brokerSrv = await startBrokerServer(upstream.port)
  t.after(() => {
    upstream.server.close()
    brokerSrv.server.close()
  })
  const resp = await fetch(`${brokerSrv.base}/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redirect_uris: ["http://evil.example.com/cb"] })
  })
  assert.equal(resp.status, 400)
  assert.equal((await resp.json()).error, "invalid_redirect_uri")
})
