/**
 * Behavioral tests for the Phase 3 write path.
 *
 * Asserts the auth-shape rules AudiusClient applies per request:
 * - writes are app-signed (HTTP Basic, password = api secret) + user_id
 *   injected, but ONLY when a session login (userId) is present
 * - reads keep the user bearer
 * - DELETE without { confirm: true } is refused before any HTTP happens
 * - options.auth: "bearer" forces the user token on writes
 *
 * Uses AUDIUS_API_BASE to point the client at a local stub API.
 */
import test from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { once } from "node:events"
import { Effect, Layer } from "effect"

// Stub API must be up and env set BEFORE the client module loads BASE_URL.
const requests = []
const stub = http.createServer((req, res) => {
  requests.push({
    method: req.method,
    url: req.url,
    auth: req.headers["authorization"] ?? null,
    apiKey: req.headers["x-api-key"] ?? null
  })
  res.writeHead(200, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ data: { ok: true } }))
})
stub.listen(0)
await once(stub, "listening")
process.env.AUDIUS_API_BASE = `http://127.0.0.1:${stub.address().port}`

const { AudiusClient, AudiusClientLive } = await import("../dist/api/AudiusClient.js")
const { AppConfig } = await import("../dist/AppConfig.js")

const configLayer = (overrides = {}) =>
  Layer.succeed(AppConfig, {
    apiKey: "test-api-key",
    apiSecret: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    port: 3000,
    responseTokenBudget: 20000,
    ...overrides
  })

const call = (method, path, options, authContext, overrides) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* AudiusClient
      return yield* Effect.either(client.request(method, path, options, authContext))
    }).pipe(Effect.provide(AudiusClientLive.pipe(Layer.provide(configLayer(overrides)))))
  )

const lastRequest = () => requests[requests.length - 1]

test.after(() => stub.close())

test("writes with a session login are app-signed and get user_id injected", async () => {
  const before = requests.length
  const r = await call("POST", "/tracks/abc/favorites", undefined, { bearerToken: "user-tok", userId: "E2AjR" })
  assert.equal(r._tag, "Right")
  const req = lastRequest()
  assert.equal(requests.length, before + 1)
  assert.match(req.auth, /^Basic /)
  const decoded = Buffer.from(req.auth.slice(6), "base64").toString()
  assert.match(decoded, /^app:deadbeef/)
  assert.match(req.url, /user_id=E2AjR/)
  assert.equal(req.apiKey, "test-api-key")
})

test("writes WITHOUT a session login fall back to the bearer (no app signing)", async () => {
  await call("POST", "/tracks/abc/favorites", undefined, { bearerToken: "user-tok" })
  const req = lastRequest()
  assert.equal(req.auth, "Bearer user-tok")
  assert.doesNotMatch(req.url, /user_id=/)
})

test("writes without apiSecret configured fall back to the bearer", async () => {
  await call("POST", "/tracks/abc/favorites", undefined, { bearerToken: "user-tok", userId: "E2AjR" }, { apiSecret: undefined })
  assert.equal(lastRequest().auth, "Bearer user-tok")
})

test("reads keep the user bearer even with a session login", async () => {
  await call("GET", "/me", undefined, { bearerToken: "user-tok", userId: "E2AjR" })
  assert.equal(lastRequest().auth, "Bearer user-tok")
})

test("explicit user_id in query is not overridden", async () => {
  await call("POST", "/tracks/abc/favorites", { query: { user_id: "other" } }, { bearerToken: "t", userId: "E2AjR" })
  assert.match(lastRequest().url, /user_id=other/)
  assert.doesNotMatch(lastRequest().url, /user_id=E2AjR/)
})

test("options.auth 'bearer' forces the user token on writes", async () => {
  await call("POST", "/developer-apps/0xabc/access-keys", { auth: "bearer" }, { bearerToken: "user-tok", userId: "E2AjR" })
  assert.equal(lastRequest().auth, "Bearer user-tok")
})

test("DELETE without confirm is refused before any HTTP request", async () => {
  const before = requests.length
  const r = await call("DELETE", "/tracks/abc/favorites", undefined, { bearerToken: "t", userId: "E2AjR" })
  assert.equal(r._tag, "Left")
  assert.match(r.left.message, /confirm: true/)
  assert.equal(requests.length, before, "no HTTP request should have been made")
})

test("DELETE with confirm proceeds app-signed", async () => {
  const r = await call("DELETE", "/tracks/abc/favorites", { confirm: true }, { bearerToken: "t", userId: "E2AjR" })
  assert.equal(r._tag, "Right")
  assert.match(lastRequest().auth, /^Basic /)
  assert.equal(lastRequest().method, "DELETE")
})
