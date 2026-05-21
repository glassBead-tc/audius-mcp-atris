/**
 * Behavioral tests for the ResponseGuard output cap (AX-01a / AX-24).
 *
 * These assert the keystone agent-experience guarantee: no tool result can
 * leave the server above the configured token budget. Run via `pnpm test`
 * (which builds first, then `node --test test/`).
 */
import test from "node:test"
import assert from "node:assert/strict"
import { estimateTokens, capText } from "../dist/mcp/ResponseGuard.js"

test("estimateTokens approximates a token count from char length", () => {
  assert.equal(estimateTokens(""), 0)
  assert.ok(estimateTokens("a".repeat(3500)) >= 900)
  assert.ok(estimateTokens("a".repeat(3500)) <= 1100)
})

test("capText passes small payloads through unchanged", () => {
  const small = JSON.stringify({ hello: "world", items: [1, 2, 3] })
  const r = capText(small, 20000)
  assert.equal(r.truncated, false)
  assert.equal(r.text, small)
})

test("capText withholds oversized payloads behind a truncation envelope", () => {
  const huge = "x".repeat(2_000_000)
  const r = capText(huge, 20000)
  assert.equal(r.truncated, true)

  const env = JSON.parse(r.text)
  assert.equal(env.truncated, true)
  assert.equal(env.errorType, "PAYLOAD_CAPPED")
  assert.equal(env.originalChars, 2_000_000)
  assert.equal(env.thresholdTokens, 20000)
  assert.ok(typeof env.head === "string" && env.head.length > 0)
  assert.ok(typeof env.tail === "string" && env.tail.length > 0)
  assert.ok(Array.isArray(env.nextActions) && env.nextActions.length > 0)
})

test("the truncation envelope is itself well under the budget", () => {
  // A 5 MB payload must not produce an envelope that re-triggers the cap.
  const huge = "x".repeat(5_000_000)
  const r = capText(huge, 20000)
  assert.equal(r.truncated, true)
  assert.ok(
    estimateTokens(r.text) < 20000,
    `envelope was ~${estimateTokens(r.text)} tokens, must be < 20000`
  )
})

test("capText respects a custom (smaller) token budget", () => {
  const medium = "y".repeat(50_000) // ~14k tokens
  assert.equal(capText(medium, 20000).truncated, false)
  assert.equal(capText(medium, 5000).truncated, true)
})
