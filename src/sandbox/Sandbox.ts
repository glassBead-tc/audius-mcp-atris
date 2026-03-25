/**
 * QuickJS WASM sandbox for executing LLM-generated code.
 *
 * Provides isolated JavaScript execution with:
 * - audius.request() host function bridged to AudiusClient
 * - console.log capture
 * - Memory and execution time limits
 * - Fresh context per execution (no state leakage)
 *
 * Uses QuickJSDeferredPromise (not newAsyncifiedFunction) so that
 * user code can call audius.request() multiple times in sequence.
 * Emscripten's asyncify can only unwind the WASM stack once, so
 * newAsyncifiedFunction breaks on the second await. Instead, we:
 * 1. Use newFunction to return a deferred promise handle per call
 * 2. Resolve each promise from the host when the API call completes
 * 3. Pump executePendingJobs() after each resolution to advance the VM
 */
import { Context, Effect, Layer } from "effect"
import { getQuickJS } from "quickjs-emscripten"
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

export const SandboxLive: Layer.Layer<Sandbox, Error, AudiusClient | TypeGenerator> = Layer.effect(
  Sandbox,
  Effect.gen(function* () {
    const audiusClient = yield* AudiusClient
    const typeGen = yield* TypeGenerator

    // Load the sync QuickJS module once (not async/asyncify variant).
    // getQuickJS returns the default sync WASM module.
    const QuickJS = yield* Effect.tryPromise({
      try: () => getQuickJS(),
      catch: (e) => new Error(`Failed to load QuickJS module: ${e}`)
    })

    const execute = (
      code: string,
      timeoutMs?: number
    ): Effect.Effect<SandboxResult, Error> =>
      Effect.tryPromise({
        try: async () => {
          const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS
          const output: string[] = []

          const ctx = QuickJS.newContext()

          try {
            // Set memory limit
            ctx.runtime.setMemoryLimit(MEMORY_LIMIT_BYTES)

            // Set interrupt handler for timeout
            const startTime = Date.now()
            ctx.runtime.setInterruptHandler(() => {
              return Date.now() - startTime > timeout
            })

            // Track pending promises so we can pump the event loop
            const pendingPromises: Array<Promise<void>> = []

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

            // Inject audius.request using deferred promises.
            // Each call creates a QuickJSDeferredPromise, kicks off the
            // host-side API call, and returns the promise handle to the VM.
            // When the API call resolves, we settle the deferred and pump
            // executePendingJobs to advance the VM's promise chain.
            const audiusHandle = ctx.newObject()
            const requestFn = ctx.newFunction("request", (...args) => {
              const method = ctx.dump(args[0]) as string
              const path = ctx.dump(args[1]) as string
              const options = args[2] ? ctx.dump(args[2]) as Record<string, unknown> : undefined

              const deferred = ctx.newPromise()

              // Kick off the host-side API call asynchronously
              const hostPromise = Effect.runPromise(
                audiusClient.request(method, path, options as any)
              ).then(
                (result) => {
                  const jsonStr = JSON.stringify(result)
                  const strHandle = ctx.newString(jsonStr)
                  deferred.resolve(strHandle)
                  strHandle.dispose()
                  // Pump the VM event loop so the .then() handlers run
                  ctx.runtime.executePendingJobs()
                },
                (e) => {
                  const errorMsg = e instanceof Error ? e.message : String(e)
                  const jsonStr = JSON.stringify({ error: errorMsg })
                  const strHandle = ctx.newString(jsonStr)
                  deferred.resolve(strHandle)
                  strHandle.dispose()
                  ctx.runtime.executePendingJobs()
                }
              )

              pendingPromises.push(hostPromise)

              return deferred.handle
            })
            ctx.setProp(audiusHandle, "request", requestFn)
            ctx.setProp(ctx.global, "audius", audiusHandle)
            requestFn.dispose()
            audiusHandle.dispose()

            // Inject user code as a global string to avoid template literal injection
            const userCodeHandle = ctx.newString(code)
            ctx.setProp(ctx.global, "__userCode__", userCodeHandle)
            userCodeHandle.dispose()

            // Inject type declarations as a global string
            const declsHandle = ctx.newString(typeGen.declarations)
            ctx.setProp(ctx.global, "__apiDecls__", declsHandle)
            declsHandle.dispose()

            // Wrap user code: parse JSON from request results, execute via
            // AsyncFunction constructor, store result in globals so we can
            // read it after all promises settle.
            const wrappedCode = `
              var _origRequest = audius.request;
              audius.request = function(method, path, options) {
                return _origRequest(method, path, options)
                  .then(function(jsonStr) { return JSON.parse(jsonStr); });
              };

              var __result__ = undefined;
              var __execError__ = undefined;

              (function() {
                var AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
                var fn = new AsyncFunction("audius", "console", __userCode__);
                fn(audius, console).then(
                  function(v) { __result__ = v; },
                  function(e) { __execError__ = e instanceof Error ? e.message : String(e); }
                );
              })()
            `

            const evalResult = ctx.evalCode(wrappedCode, "user-code.js")

            if ("error" in evalResult && evalResult.error) {
              const errorVal = ctx.dump(evalResult.error)
              evalResult.error.dispose()
              return {
                output,
                returnValue: undefined,
                error: typeof errorVal === "object" && errorVal !== null
                  ? (errorVal as Record<string, unknown>)["message"] as string ?? JSON.stringify(errorVal)
                  : String(errorVal)
              }
            }
            evalResult.value.dispose()

            // Run initial pending jobs (starts the async IIFE)
            ctx.runtime.executePendingJobs()

            // Wait for all host-side API calls to complete.
            // Each one pumps executePendingJobs when it resolves,
            // which may trigger more API calls (chained awaits),
            // adding more entries to pendingPromises.
            // We loop until no new promises appear.
            let processed = 0
            while (processed < pendingPromises.length) {
              await pendingPromises[processed]
              processed++
            }

            // Final pump to settle any remaining .then() chains
            ctx.runtime.executePendingJobs()

            // Read result from globals
            const execErrorHandle = ctx.getProp(ctx.global, "__execError__")
            const execError = ctx.dump(execErrorHandle)
            execErrorHandle.dispose()

            if (execError !== undefined && execError !== null) {
              return {
                output,
                returnValue: undefined,
                error: String(execError)
              }
            }

            const resultHandle = ctx.getProp(ctx.global, "__result__")
            const returnValue = ctx.dump(resultHandle)
            resultHandle.dispose()

            return { output, returnValue }
          } finally {
            ctx.dispose()
          }
        },
        catch: (e) => new Error(`Sandbox execution failed: ${e}`)
      })

    return { execute }
  })
)
