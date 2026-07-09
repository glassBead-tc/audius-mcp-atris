/**
 * Behavioral tests for big-integer-safe JSON parsing (capability roadmap P1-1).
 *
 * Wei-scale amounts (tips, transactions, coins) must survive as strings —
 * plain JSON.parse corrupts integers past 2^53 into garbage floats.
 */
import test from "node:test"
import assert from "node:assert/strict"
import { quoteLargeIntegers, parseJsonPreservingLargeInts } from "../dist/api/Json.js"

test("wei-scale integers are preserved as strings", () => {
  const parsed = parseJsonPreservingLargeInts(
    '{"amount": 2262000000000000000000, "id": 42}'
  )
  assert.equal(parsed.amount, "2262000000000000000000")
  assert.equal(parsed.id, 42)
})

test("negative large integers are preserved", () => {
  const parsed = parseJsonPreservingLargeInts('{"delta": -8742554432415203328}')
  assert.equal(parsed.delta, "-8742554432415203328")
})

test("safe integers, floats, and exponent forms pass through as numbers", () => {
  const parsed = parseJsonPreservingLargeInts(
    '{"plays": 315, "bpm": 128.5, "sci": 1.5e18, "big_float": 12345678901234567.5}'
  )
  assert.equal(parsed.plays, 315)
  assert.equal(parsed.bpm, 128.5)
  assert.equal(parsed.sci, 1.5e18)
  assert.equal(parsed.big_float, 12345678901234567.5)
})

test("digits inside strings are never touched", () => {
  const raw = '{"note": "id 12345678901234567890 in text", "handle": "user-99999999999999999"}'
  const parsed = parseJsonPreservingLargeInts(raw)
  assert.equal(parsed.note, "id 12345678901234567890 in text")
  assert.equal(parsed.handle, "user-99999999999999999")
})

test("escaped quotes inside strings do not break string tracking", () => {
  const raw = '{"quote": "she said \\"9999999999999999999\\"", "amount": 9999999999999999999}'
  const parsed = parseJsonPreservingLargeInts(raw)
  assert.equal(parsed.quote, 'she said "9999999999999999999"')
  assert.equal(parsed.amount, "9999999999999999999")
})

test("large integers inside arrays are preserved", () => {
  const parsed = parseJsonPreservingLargeInts(
    '[7766279631452241920, 1, "x", 99999999999999999999]'
  )
  assert.deepEqual(parsed, ["7766279631452241920", 1, "x", "99999999999999999999"])
})

test("quoteLargeIntegers leaves already-valid JSON structurally intact", () => {
  const raw = JSON.stringify({
    data: [{ title: "What You Want", plays: 195, user: { name: "TRICK CHENEY." } }]
  })
  assert.equal(quoteLargeIntegers(raw), raw)
})
