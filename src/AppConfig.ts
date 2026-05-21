/**
 * Application configuration via Effect Config.
 *
 * Reads from environment variables:
 * - AUDIUS_API_KEY: API key for Audius REST API
 * - PORT: HTTP server port (default: 3000)
 * - GRAPH_API_KEY: API key for The Graph (optional; gates the subgraph tool)
 * - RESPONSE_TOKEN_BUDGET: max tokens any single tool result may emit (default: 20000)
 */
import { Context, Effect, Layer } from "effect"

export interface AppConfigShape {
  readonly apiKey: string
  readonly port: number
  readonly graphApiKey?: string
  /**
   * Maximum size, in estimated tokens, of any single tool result.
   * Results larger than this are replaced with a truncation envelope by
   * the ResponseGuard chokepoint (AX-01a). Token-denominated so the knob
   * means what operators actually reason about.
   */
  readonly responseTokenBudget: number
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
    const budgetParsed = parseInt(process.env["RESPONSE_TOKEN_BUDGET"] ?? "20000", 10)
    const responseTokenBudget = Number.isFinite(budgetParsed) && budgetParsed > 0
      ? budgetParsed
      : 20000
    return { apiKey, port, graphApiKey, responseTokenBudget }
  })
)
