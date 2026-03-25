/**
 * Application configuration via Effect Config.
 *
 * Reads from environment variables:
 * - AUDIUS_API_KEY: API key for Audius REST API
 * - PORT: HTTP server port (default: 3000)
 */
import { Context, Effect, Layer } from "effect"

export interface AppConfigShape {
  readonly apiKey: string
  readonly port: number
  readonly graphApiKey?: string
}

export class AppConfig extends Context.Tag("AppConfig")<
  AppConfig,
  AppConfigShape
>() {}

export const AppConfigLive: Layer.Layer<AppConfig> = Layer.effect(
  AppConfig,
  Effect.sync(() => {
    const apiKey = process.env["AUDIUS_API_KEY"] ?? ""
    const portParsed = parseInt(process.env["PORT"] ?? "3000", 10)
    const port = Number.isFinite(portParsed) ? portParsed : 3000
    const graphApiKey = process.env["GRAPH_API_KEY"] || undefined
    return { apiKey, port, graphApiKey }
  })
)
