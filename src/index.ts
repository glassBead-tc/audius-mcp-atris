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

// Load ./.env for local development — and let it WIN over inherited shell
// variables. Codespaces inject user secrets (e.g. a stale AUDIUS_API_KEY)
// into every terminal, which silently beat the operator's explicit .env and
// once pointed this server at the wrong developer app. Cloud Run is
// unaffected: it has no .env file, so its injected config stands.
import { readFileSync as readEnvFile } from "node:fs"
import { parseEnv } from "node:util"
try {
  const parsed = parseEnv(readEnvFile(".env", "utf8"))
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === "string") process.env[k] = v
  }
} catch {
  // no .env file — deployment environments inject variables directly
}

import { SpecLoaderLive } from "./api/SpecLoader.js"
import { SpecIndex, SpecIndexLive } from "./api/SpecIndex.js"
import { AudiusClient, AudiusClientLive } from "./api/AudiusClient.js"
import { TypeGeneratorLive } from "./sandbox/TypeGenerator.js"
import { Sandbox, SandboxLive } from "./sandbox/Sandbox.js"
import { createHandler } from "./mcp/McpServer.js"
import { startServer } from "./mcp/McpServerTransport.js"
import { makeOAuthBroker } from "./auth/OAuthBroker.js"
import { UserAuth, UserAuthService, makeTokenStore } from "./auth/UserAuth.js"

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

// UserAuth (Phase 2): OAuth broker + session login store, enabled by MCP_AUTH_SECRET
const UserAuthLive = Layer.effect(
  UserAuth,
  Effect.gen(function* () {
    const config = yield* AppConfig
    if (!config.mcpAuthSecret) {
      const disabled: UserAuthService = {
        enabled: false,
        startLogin: () => null,
        claimLogin: () => "unknown",
        isActive: () => false,
        bearer: () => Promise.resolve(undefined),
        userId: () => undefined,
        setUserId: () => undefined,
        logout: () => Promise.resolve(false)
      }
      return disabled
    }

    const store = makeTokenStore({
      upstreamBase: "https://api.audius.co/v1",
      clientId: config.apiKey
    })
    const broker = makeOAuthBroker({
      secret: config.mcpAuthSecret,
      audiusApiKey: config.apiKey,
      publicUrl: config.publicUrl,
      defaultScope: "write",
      onSessionTokens: (loginId, tokens) => store.deposit(loginId, tokens as never)
    })
    // Session logins need a concrete base URL for the Audius redirect_uri;
    // it must exactly match a redirect URI registered on the Audius dev app.
    const base = config.publicUrl ?? `http://127.0.0.1:${config.port}`

    const service: UserAuthService = {
      enabled: true,
      startLogin: () => broker.startSessionLogin(base),
      claimLogin: store.claim,
      isActive: store.isActive,
      bearer: store.bearer,
      userId: store.userId,
      setUserId: store.setUserId,
      logout: store.logout,
      authRouter: broker.handle
    }
    return service
  })
).pipe(Layer.provide(AppConfigLive))

// Full application layer — provides AppConfig, SpecIndex, Sandbox, AudiusClient, UserAuth
const AppLayer = Layer.mergeAll(
  AppConfigLive,
  SpecIndexLayer,
  SandboxLayer,
  AudiusClientLayer,
  UserAuthLive
)

// ---------------------------------------------------------------------------
// Main program
// ---------------------------------------------------------------------------

const program = Effect.gen(function* () {
  const config = yield* AppConfig
  const userAuth = yield* UserAuth

  // Create the Effect-based handler
  const effectHandler = createHandler()

  // Build a runtime with all services provided, so we can run Effects
  // from within the async HTTP handler
  const runtime = yield* Effect.runtime<AppConfig | SpecIndex | Sandbox | AudiusClient | UserAuth>()

  // Bridge Effect handler → async handler for the transport
  const asyncHandler = async (decoded: unknown, bearerToken?: string): Promise<unknown> => {
    return Runtime.runPromise(runtime)(effectHandler(decoded, bearerToken))
  }

  // Start HTTP server (acquireRelease handles cleanup on interruption)
  yield* startServer({
    port: config.port,
    handler: asyncHandler,
    authRouter: userAuth.authRouter
  })

  yield* Effect.logInfo(`Audius MCP Server (Code Mode) listening on port ${config.port}`)
  yield* Effect.logInfo("Transport: Streamable HTTP at POST /mcp")
  yield* Effect.logInfo(
    `Tools: search, execute, play${config.graphApiKey ? ", subgraph" : " (subgraph disabled — GRAPH_API_KEY not set)"}`
  )
  yield* Effect.logInfo(
    userAuth.enabled
      ? `OAuth: Log in with Audius enabled — login tool + broker at /oauth/* (scope: write, base: ${config.publicUrl ?? `http://127.0.0.1:${config.port}`})`
      : "OAuth: disabled (MCP_AUTH_SECRET not set) — bearer pass-through only"
  )

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
