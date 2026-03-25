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
import { Effect, Fiber, Layer, Logger, LogLevel, Runtime } from "effect"
import { AppConfig, AppConfigLive } from "./AppConfig.js"
import { SpecLoaderLive } from "./api/SpecLoader.js"
import { SpecIndex, SpecIndexLive } from "./api/SpecIndex.js"
import { AudiusClient, AudiusClientLive } from "./api/AudiusClient.js"
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

// Full application layer — provides AppConfig, SpecIndex, Sandbox, AudiusClient
const AppLayer = Layer.mergeAll(
  AppConfigLive,
  SpecIndexLayer,
  SandboxLayer,
  AudiusClientLayer
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
  const runtime = yield* Effect.runtime<AppConfig | SpecIndex | Sandbox | AudiusClient>()

  // Bridge Effect handler → async handler for the transport
  const asyncHandler = async (decoded: unknown): Promise<unknown> => {
    return Runtime.runPromise(runtime)(effectHandler(decoded))
  }

  // Start HTTP server (acquireRelease handles cleanup on interruption)
  yield* startServer({
    port: config.port,
    handler: asyncHandler
  })

  yield* Effect.logInfo(`Audius MCP Server (Code Mode) listening on port ${config.port}`)
  yield* Effect.logInfo("Transport: Streamable HTTP at POST /mcp")
  yield* Effect.logInfo("Tools: search, execute, play, subgraph")

  // Keep running until interrupted (SIGINT/SIGTERM trigger Effect interruption)
  yield* Effect.never
})

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const runnable = program.pipe(
  Effect.scoped,
  Effect.provide(AppLayer),
  Logger.withMinimumLogLevel(LogLevel.Info)
)

const fiber = Effect.runFork(runnable)

// Graceful shutdown: interrupt the fiber on SIGINT/SIGTERM,
// which triggers acquireRelease to close the HTTP server
const shutdown = () => {
  Effect.runFork(Fiber.interrupt(fiber))
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
