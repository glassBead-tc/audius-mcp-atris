/**
 * Behavioral tests for the bearer-identity cache (MCP-native OAuth write path).
 *
 * The broker hands MCP clients the raw Audius access token; McpServer resolves
 * a verified user id from it (GET /me) so app-signed writes engage. These
 * tests cover the caching contract: positive/negative TTLs, in-flight
 * dedup of concurrent verifications, eviction, and throw-safety.
 */
import test from "node:test"
import assert from "node:assert/strict"
import { makeBearerIdentity } from "../dist/auth/BearerIdentity.js"

const countingVerify = (result) => {
  const fn = async () => {
    fn.calls += 1
    return typeof result === "function" ? result() : result
  }
  fn.calls = 0
  return fn
}

test("successful verification is cached until ttl expires", async () => {
  let clock = 0
  const identity = makeBearerIdentity({ ttlMs: 1000, now: () => clock })
  const verify = countingVerify("E2AjR")

  assert.equal(await identity.resolve("tok", verify), "E2AjR")
  assert.equal(await identity.resolve("tok", verify), "E2AjR")
  assert.equal(verify.calls, 1, "second resolve within ttl must hit the cache")

  clock = 1001
  assert.equal(await identity.resolve("tok", verify), "E2AjR")
  assert.equal(verify.calls, 2, "resolve after ttl must re-verify")
})

test("failed verification is negative-cached with its own shorter ttl", async () => {
  let clock = 0
  const identity = makeBearerIdentity({ ttlMs: 10_000, negativeTtlMs: 100, now: () => clock })
  const verify = countingVerify(undefined)

  assert.equal(await identity.resolve("bad", verify), undefined)
  assert.equal(await identity.resolve("bad", verify), undefined)
  assert.equal(verify.calls, 1, "failure within negative ttl must not re-verify")

  clock = 101
  assert.equal(await identity.resolve("bad", verify), undefined)
  assert.equal(verify.calls, 2, "failure after negative ttl must re-verify")
})

test("concurrent resolves of the same token share one verification", async () => {
  const identity = makeBearerIdentity()
  let release
  const gate = new Promise((r) => { release = r })
  const verify = countingVerify(() => gate.then(() => "E2AjR"))

  const a = identity.resolve("tok", verify)
  const b = identity.resolve("tok", verify)
  release()
  assert.deepEqual(await Promise.all([a, b]), ["E2AjR", "E2AjR"])
  assert.equal(verify.calls, 1)
})

test("a throwing verify resolves to undefined and is negative-cached", async () => {
  const identity = makeBearerIdentity()
  const verify = async () => {
    verify.calls = (verify.calls ?? 0) + 1
    throw new Error("network down")
  }
  assert.equal(await identity.resolve("tok", verify), undefined)
  assert.equal(await identity.resolve("tok", verify), undefined)
  assert.equal(verify.calls, 1)
})

test("distinct tokens are cached independently and oldest is evicted at capacity", async () => {
  const identity = makeBearerIdentity({ maxEntries: 2 })
  const ids = { a: "user-a", b: "user-b", c: "user-c" }
  const verify = countingVerify(undefined)
  const verifyFor = (token) => async () => { verify.calls += 1; return ids[token] }

  assert.equal(await identity.resolve("a", verifyFor("a")), "user-a")
  assert.equal(await identity.resolve("b", verifyFor("b")), "user-b")
  assert.equal(await identity.resolve("c", verifyFor("c")), "user-c")
  assert.equal(verify.calls, 3)

  // "a" was evicted (capacity 2), "c" is still cached.
  assert.equal(await identity.resolve("c", verifyFor("c")), "user-c")
  assert.equal(verify.calls, 3, "'c' must still be cached")
  assert.equal(await identity.resolve("a", verifyFor("a")), "user-a")
  assert.equal(verify.calls, 4, "'a' must have been evicted")
})
