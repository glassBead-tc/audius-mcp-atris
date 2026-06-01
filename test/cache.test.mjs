/**
 * Behavioral tests for the hot-read TTL cache (AX-23 / AX-24).
 */
import test from "node:test"
import assert from "node:assert/strict"
import { TtlCache } from "../dist/api/Cache.js"

test("TtlCache stores and returns a value within the TTL", () => {
  const c = new TtlCache(1000)
  c.set("k", { v: 1 })
  assert.deepEqual(c.get("k"), { v: 1 })
})

test("TtlCache misses for unknown keys", () => {
  const c = new TtlCache(1000)
  assert.equal(c.get("nope"), undefined)
})

test("TtlCache expires entries past the TTL", async () => {
  const c = new TtlCache(10)
  c.set("k", 1)
  await new Promise((r) => setTimeout(r, 30))
  assert.equal(c.get("k"), undefined)
})

test("TtlCache evicts the oldest entry when over capacity", () => {
  const c = new TtlCache(10_000, 2)
  c.set("a", 1)
  c.set("b", 2)
  c.set("c", 3)
  assert.equal(c.get("a"), undefined, "oldest entry should be evicted")
  assert.equal(c.get("c"), 3)
})
