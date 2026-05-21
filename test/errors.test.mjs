/**
 * Behavioral tests for the typed error-directive model (AX-09 / AX-24).
 */
import test from "node:test"
import assert from "node:assert/strict"
import { buildErrorDirective, directiveFromError } from "../dist/api/Errors.js"

test("buildErrorDirective maps 401 to AUTH_REQUIRED with a recovery directive", () => {
  const d = buildErrorDirective({ status: 401, message: "nope", path: "/me", method: "GET" })
  assert.equal(d.ok, false)
  assert.equal(d.errorType, "AUTH_REQUIRED")
  assert.equal(d.status, 401)
  assert.ok(Array.isArray(d.nextActions) && d.nextActions.length > 0)
  assert.ok(typeof d.prohibition === "string" && d.prohibition.length > 0)
  assert.equal(d.context.path, "/me")
})

test("buildErrorDirective maps 429 to RATE_LIMITED", () => {
  assert.equal(buildErrorDirective({ status: 429, message: "x" }).errorType, "RATE_LIMITED")
})

test("directiveFromError parses an Audius API error string and unwraps the body", () => {
  const d = directiveFromError(
    new Error('Audius API 404: {"code":404,"error":"invalid trackId"}'),
    "/tracks/x",
    "GET"
  )
  assert.equal(d.errorType, "NOT_FOUND")
  assert.equal(d.status, 404)
  assert.equal(d.message, "invalid trackId")
  assert.equal(d.context.method, "GET")
})

test("directiveFromError classifies timeouts", () => {
  const d = directiveFromError(new Error("request timed out"))
  assert.equal(d.errorType, "TIMEOUT")
})

test("directiveFromError falls back to UPSTREAM_ERROR for unknown shapes", () => {
  const d = directiveFromError(new Error("something odd"))
  assert.equal(d.errorType, "UPSTREAM_ERROR")
})
