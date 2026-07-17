/**
 * Open Audio Protocol ConnectRPC client — READ-ONLY.
 *
 * go-openaudio nodes serve every proto service over plain HTTP+JSON
 * (ConnectRPC): POST /<pkg>.v1.<Service>/<Method> with a JSON body.
 * This client fronts the public mainnet RPC node and refuses anything
 * that isn't a read (no SendTransaction/ForwardTransaction/UploadFiles,
 * no server-streaming methods).
 *
 * Verified live 2026-07-17 against rpc.audius.co: GetStatus, GetNodeInfo,
 * GetBlock/GetBlocks/GetTransaction (full ManageEntity tx contents),
 * EthService staking-registry reads, storage/system pings.
 */
import { Context, Effect, Layer } from "effect"
import { parseJsonPreservingLargeInts } from "./Json.js"

const RPC_BASE = process.env["AUDIUS_RPC_BASE"] ?? "https://rpc.audius.co"

/**
 * Read allowlist: known services, method must start with Get, Is, or Ping.
 * This excludes writes (SendTransaction, Register, UploadFiles) and
 * server-streaming methods (StreamBlocks, StreamTrack, Subscribe), which
 * would either mutate the chain or hang a unary JSON POST.
 */
const READ_PATH = /^\/(core|storage|etl|eth|system)\.v1\.[A-Za-z]+Service\/(Get|Is|Ping)[A-Za-z]*$/

export class ProtocolClient extends Context.Tag("ProtocolClient")<
  ProtocolClient,
  {
    readonly request: (path: string, body?: unknown) => Effect.Effect<unknown, Error>
  }
>() {}

export const ProtocolClientLive: Layer.Layer<ProtocolClient> = Layer.succeed(
  ProtocolClient,
  {
    request: (path: string, body?: unknown): Effect.Effect<unknown, Error> =>
      Effect.gen(function* () {
        if (typeof path !== "string" || !READ_PATH.test(path)) {
          return yield* Effect.fail(new Error(
            `Invalid protocol path: ${JSON.stringify(path)}. Expected a read method like ` +
            `"/core.v1.CoreService/GetStatus" — services: core/storage/etl/eth/system (.v1), ` +
            `methods starting with Get/Is/Ping. Writes and streaming methods are not exposed.`
          ))
        }

        const response = yield* Effect.tryPromise({
          try: () =>
            fetch(`${RPC_BASE}${path}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body ?? {})
            }),
          catch: (e) => new Error(`OAP RPC request failed: ${e}`)
        })

        const text = yield* Effect.tryPromise({
          try: () => response.text(),
          catch: (e) => new Error(`Failed to read OAP RPC response: ${e}`)
        })

        if (!response.ok) {
          // ConnectRPC errors are JSON {code, message} — pass through as text.
          return yield* Effect.fail(new Error(`OAP RPC ${response.status}: ${text}`))
        }

        // Block heights / tx counts arrive as strings already (proto int64),
        // but reuse the large-int-safe parser for anything that doesn't.
        return yield* Effect.try({
          try: () => parseJsonPreservingLargeInts(text),
          catch: (e) => new Error(`Failed to parse OAP RPC response: ${e}`)
        })
      })
  }
)
