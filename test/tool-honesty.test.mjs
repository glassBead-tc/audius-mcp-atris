/**
 * Behavioral tests for tool honesty (capability roadmap P1-3/P1-4, AX-13/14/15).
 *
 * - subgraph: unconfigured ⇒ fails fast with the reason, no network call
 * - play: resolution success is tool success even when nothing can open locally
 * - execute: annotations admit that mutations are possible
 */
import test from "node:test"
import assert from "node:assert/strict"
import { Effect, Layer } from "effect"
import { AppConfig } from "../dist/AppConfig.js"
import { AudiusClient } from "../dist/api/AudiusClient.js"
import { handleSubgraph } from "../dist/tools/SubgraphTool.js"
import { handlePlay } from "../dist/tools/PlayTool.js"
import { executeToolDefinition } from "../dist/tools/ExecuteTool.js"

const testConfig = (overrides = {}) =>
  Layer.succeed(AppConfig, {
    apiKey: "",
    port: 3000,
    graphApiKey: undefined,
    responseTokenBudget: 20000,
    ...overrides
  })

test("subgraph without GRAPH_API_KEY fails fast and names the missing config", async () => {
  const result = await Effect.runPromise(
    handleSubgraph({ query: "{ audiusNetworks(first: 1) { totalSupply } }" }).pipe(
      Effect.provide(testConfig())
    )
  )
  assert.equal(result.isError, true)
  assert.match(result.content[0].text, /GRAPH_API_KEY/)
})

test("play succeeds with resolved URLs even when no opener exists on the host", async () => {
  const stubClient = Layer.succeed(AudiusClient, {
    request: () =>
      Effect.succeed({
        data: [
          {
            title: "What You Want",
            permalink: "/mynameiscards/what-you-want",
            user: { name: "TRICK CHENEY." }
          }
        ]
      })
  })

  const result = await Effect.runPromise(
    handlePlay({ query: "What You Want TRICK CHENEY" }).pipe(Effect.provide(stubClient))
  )

  assert.notEqual(result.isError, true)
  const payload = JSON.parse(result.content[0].text)
  assert.equal(payload.status, "resolved")
  assert.equal(payload.track.url, "https://audius.co/mynameiscards/what-you-want")
  assert.equal(typeof payload.opened, "boolean")
  assert.ok(payload.note.length > 0)
})

test("execute advertises destructiveHint: true (AX-15)", () => {
  assert.equal(executeToolDefinition.annotations.destructiveHint, true)
  assert.equal(executeToolDefinition.annotations.readOnlyHint, false)
})
