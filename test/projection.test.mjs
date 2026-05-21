/**
 * Behavioral tests for the default projection layer (AX-02 / AX-24).
 */
import test from "node:test"
import assert from "node:assert/strict"
import { project } from "../dist/api/Projection.js"

test("project strips heavy keys by default", () => {
  const r = project(
    { data: [{ title: "x", artwork: { big: "..." }, stream: { url: "..." }, play_count: 5 }] },
    {}
  )
  assert.equal(r.projected, true)
  const item = r.value.data[0]
  assert.equal(item.title, "x")
  assert.equal(item.play_count, 5)
  assert.equal(item.artwork, undefined)
  assert.equal(item.stream, undefined)
  assert.ok(typeof r.note === "string" && r.note.includes("raw"))
})

test("project leaves a clean payload untouched", () => {
  const r = project({ data: [{ title: "x", play_count: 5 }] }, {})
  assert.equal(r.projected, false)
})

test("project { raw: true } opts out entirely", () => {
  const r = project({ data: [{ title: "x", artwork: {} }] }, { raw: true })
  assert.equal(r.projected, false)
  assert.ok("artwork" in r.value.data[0])
})

test("project { detail: 'full' } opts out entirely", () => {
  const r = project({ data: [{ title: "x", stream: {} }] }, { detail: "full" })
  assert.equal(r.projected, false)
})

test("project { fields } picks dot-paths element-wise across arrays", () => {
  const r = project(
    { data: [{ title: "a", x: 1 }, { title: "b", x: 2 }] },
    { fields: ["data.title"] }
  )
  assert.equal(r.projected, true)
  assert.deepEqual(r.value, { data: [{ title: "a" }, { title: "b" }] })
})
