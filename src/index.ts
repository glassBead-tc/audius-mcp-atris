#!/usr/bin/env node
/**
 * Audius MCP Server — Code Mode entry point.
 *
 * Composes all Effect layers and starts the Streamable HTTP server.
 *
 * Environment variables:
 * - AUDIUS_API_KEY: API key for Audius REST API
 * - PORT: HTTP server port (default: 3000)
 */
import { Effect, Layer, Logger, LogLevel, Runtime } from "effect"
import { AppConfig, AppConfigLive } from "./AppConfig.js"
import { SpecLoaderLive } from "./api/SpecLoader.js"
import { SpecIndex, SpecIndexLive } from "./api/SpecIndex.js"
import { AudiusClientLive } from "./api/AudiusClient.js"
import { TypeGeneratorLive } from "./sandbox/TypeGenerator.js"
import { Sandbox, SandboxLive } from "./sandbox/Sandbox.js"
import { createHandler } from "./mcp/McpServer.js"
import { startServer } from "./mcp/McpServerTransport.js"

// ---------------------------------------------------------------------------
// Layer composition
// ---------------------------------------------------------------------------

// SpecLoader is a shared dependency — build it once
const SpecLoaderLayer = SpecLoaderLive

// SpecIndex depends on SpecLoader
const SpecIndexLayer = SpecIndexLive.pipe(
  Layer.provide(SpecLoaderLayer)
)

// TypeGenerator depends on SpecLoader
const TypeGeneratorLayer = TypeGeneratorLive.pipe(
  Layer.provide(SpecLoaderLayer)
)

// AudiusClient depends on AppConfig
const AudiusClientLayer = AudiusClientLive.pipe(
  Layer.provide(AppConfigLive)
)

// Sandbox depends on AudiusClient + TypeGenerator
const SandboxLayer = SandboxLive.pipe(
  Layer.provide(Layer.merge(AudiusClientLayer, TypeGeneratorLayer))
)

// Full application layer — provides AppConfig, SpecIndex, Sandbox
const AppLayer = Layer.mergeAll(
  AppConfigLive,
  SpecIndexLayer,
  SandboxLayer
)

// ---------------------------------------------------------------------------
// Main program
// ---------------------------------------------------------------------------

const program = Effect.gen(function* () {
  const config = yield* AppConfig

  // Create the Effect-based handler
  const effectHandler = createHandler()

  // Build a runtime with all services provided, so we can run Effects
  // from within the async HTTP handler
  const runtime = yield* Effect.runtime<SpecIndex | Sandbox>()

  // Bridge Effect handler → async handler for the transport
  const asyncHandler = async (decoded: unknown): Promise<unknown> => {
    return Runtime.runPromise(runtime)(effectHandler(decoded))
  }

  // Start HTTP server
  const server = yield* startServer({
    port: config.port,
    handler: asyncHandler
  })

  yield* Effect.logInfo(`Audius MCP Server (Code Mode) listening on port ${config.port}`)
  yield* Effect.logInfo("Transport: Streamable HTTP at POST /mcp")
  yield* Effect.logInfo("Tools: search, execute")

  // Keep running until interrupted
  yield* Effect.async<never, never>(() => {
    const shutdown = () => {
      server.close()
      process.exit(0)
    }
    process.on("SIGINT", shutdown)
    process.on("SIGTERM", shutdown)
  })
})

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

Effect.runPromise(
  program.pipe(
    Effect.provide(AppLayer),
    Logger.withMinimumLogLevel(LogLevel.Info)
  )
).catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
