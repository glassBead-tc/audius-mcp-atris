/**
 * QuickJS WASM sandbox for executing LLM-generated code.
 *
 * Provides isolated JavaScript execution with:
 * - audius.request() host function bridged to AudiusClient
 * - console.log capture
 * - Memory and execution time limits
 * - Fresh context per execution (no state leakage)
 */
import { Context, Effect, Layer } from "effect"
import { newAsyncContext } from "quickjs-emscripten"
import { AudiusClient } from "../api/AudiusClient.js"
import { TypeGenerator } from "./TypeGenerator.js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SandboxResult {
  readonly output: string[]
  readonly returnValue: unknown
  readonly error?: string
}

const DEFAULT_TIMEOUT_MS = 30_000
const MEMORY_LIMIT_BYTES = 64 * 1024 * 1024 // 64MB

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class Sandbox extends Context.Tag("Sandbox")<
  Sandbox,
  {
    readonly execute: (
      code: string,
      timeoutMs?: number
    ) => Effect.Effect<SandboxResult, Error>
  }
>() {}

export const SandboxLive: Layer.Layer<Sandbox, never, AudiusClient | TypeGenerator> = Layer.effect(
  Sandbox,
  Effect.gen(function* () {
    const audiusClient = yield* AudiusClient
    const typeGen = yield* TypeGenerator

    const execute = (
      code: string,
      timeoutMs?: number
    ): Effect.Effect<SandboxResult, Error> =>
      Effect.gen(function* () {
        const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS
        const output: string[] = []

        const ctx = yield* Effect.tryPromise({
          try: () => newAsyncContext(),
          catch: (e) => new Error(`Failed to create QuickJS context: ${e}`)
        })

        try {
          // Set memory limit
          ctx.runtime.setMemoryLimit(MEMORY_LIMIT_BYTES)

          // Set interrupt handler for timeout
          const startTime = Date.now()
          ctx.runtime.setInterruptHandler(() => {
            return Date.now() - startTime > timeout
          })

          // Inject console.log
          const consoleHandle = ctx.newObject()
          const logFn = ctx.newFunction("log", (...args) => {
            const parts = args.map((arg) => {
              const dumped = ctx.dump(arg)
              return typeof dumped === "string" ? dumped : JSON.stringify(dumped)
            })
            output.push(parts.join(" "))
          })
          ctx.setProp(consoleHandle, "log", logFn)
          ctx.setProp(ctx.global, "console", consoleHandle)
          logFn.dispose()
          consoleHandle.dispose()

          // Inject audius.request as async host function
          const audiusHandle = ctx.newObject()
          const requestFn = ctx.newAsyncifiedFunction("request", async (...args) => {
            try {
              const method = ctx.dump(args[0]) as string
              const path = ctx.dump(args[1]) as string
              const options = args[2] ? ctx.dump(args[2]) as Record<string, unknown> : undefined

              // Call the real Audius API
              const result = await Effect.runPromise(
                audiusClient.request(method, path, options as any)
              )

              // Return result as a QuickJS value
              const jsonStr = JSON.stringify(result)
              return ctx.newString(jsonStr)
            } catch (e) {
              // Surface errors back to the sandbox as a JSON error object
              const errorMsg = e instanceof Error ? e.message : String(e)
              return ctx.newString(JSON.stringify({ error: errorMsg }))
            }
          })
          ctx.setProp(audiusHandle, "request", requestFn)
          ctx.setProp(ctx.global, "audius", audiusHandle)
          requestFn.dispose()
          audiusHandle.dispose()

          // Inject user code as a global string to avoid template literal injection
          const userCodeHandle = ctx.newString(code)
          ctx.setProp(ctx.global, "__userCode__", userCodeHandle)
          userCodeHandle.dispose()

          // Inject type declarations as a global string to avoid backtick injection
          // from OpenAPI spec summaries (declarations are LLM context, not executable)
          const declsHandle = ctx.newString(typeGen.declarations)
          ctx.setProp(ctx.global, "__apiDecls__", declsHandle)
          declsHandle.dispose()

          // Wrap user code in an async IIFE that parses JSON results
          // User code is read from __userCode__ via eval to avoid template literal injection
          // Type declarations available via __apiDecls__ global (LLM reference only)
          const wrappedCode = `
            // Wrap audius.request to auto-parse JSON
            const _origRequest = audius.request;
            audius.request = async function(method, path, options) {
              const jsonStr = await _origRequest(method, path, options);
              return JSON.parse(jsonStr);
            };

            // Execute user code (injected safely via global string)
            (async () => {
              const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
              const fn = new AsyncFunction("audius", "console", __userCode__);
              return await fn(audius, console);
            })()
          `

          const resultHandle = yield* Effect.tryPromise({
            try: () => ctx.evalCodeAsync(wrappedCode, "user-code.js"),
            catch: (e) => new Error(`Code evaluation failed: ${e}`)
          })

          if ("error" in resultHandle && resultHandle.error) {
            const errorVal = ctx.dump(resultHandle.error!)
            resultHandle.error!.dispose()
            return {
              output,
              returnValue: undefined,
              error: typeof errorVal === "object" && errorVal !== null
                ? (errorVal as Record<string, unknown>)["message"] as string ?? JSON.stringify(errorVal)
                : String(errorVal)
            }
          }

          // Execute any pending async jobs
          const pendingResult = ctx.runtime.executePendingJobs()
          if ("error" in pendingResult && pendingResult.error) {
            const errorVal = ctx.dump(pendingResult.error)
            pendingResult.error.dispose()
            resultHandle.value.dispose()
            return {
              output,
              returnValue: undefined,
              error: typeof errorVal === "object" && errorVal !== null
                ? (errorVal as Record<string, unknown>)["message"] as string ?? JSON.stringify(errorVal)
                : String(errorVal)
            }
          }

          const returnValue = ctx.dump(resultHandle.value)
          resultHandle.value.dispose()

          return { output, returnValue }
        } finally {
          ctx.dispose()
        }
      })

    return { execute }
  })
)
