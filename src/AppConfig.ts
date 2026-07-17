/**
 * Application configuration via Effect Config.
 *
 * Reads from environment variables:
 * - AUDIUS_API_KEY: API key for Audius REST API
 * - PORT: HTTP server port (default: 3000)
 * - RESPONSE_TOKEN_BUDGET: max tokens any single tool result may emit (default: 20000)
 */
import { Context, Effect, Layer } from "effect"

export interface AppConfigShape {
  readonly apiKey: string
  /**
   * Developer app API secret (the app's private key). When set and a session
   * login is active, the server signs write requests with it (HTTP Basic) —
   * the only third-party write shape the Audius indexer currently honors for
   * apps without a server-registered secret. Never exposed to the sandbox.
   */
  readonly apiSecret?: string
  readonly port: number
  /**
   * Symmetric secret for the stateless OAuth broker (Phase 2). When set, the
   * server exposes MCP-spec OAuth endpoints that broker "Log in with Audius";
   * when absent, auth is limited to bearer pass-through.
   */
  readonly mcpAuthSecret?: string
  /**
   * Public base URL of this deployment (e.g. https://xyz.run.app), used in
   * OAuth metadata and the Audius redirect_uri. Derived from request headers
   * when unset.
   */
  readonly publicUrl?: string
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
    const apiSecret = process.env["AUDIUS_API_SECRET"] || undefined
    const portParsed = parseInt(process.env["PORT"] ?? "3000", 10)
    const port = Number.isFinite(portParsed) ? portParsed : 3000
    const mcpAuthSecret = process.env["MCP_AUTH_SECRET"] || undefined
    const publicUrl = process.env["MCP_PUBLIC_URL"] || undefined
    const budgetParsed = parseInt(process.env["RESPONSE_TOKEN_BUDGET"] ?? "20000", 10)
    const responseTokenBudget = Number.isFinite(budgetParsed) && budgetParsed > 0
      ? budgetParsed
      : 20000
    return { apiKey, apiSecret, port, mcpAuthSecret, publicUrl, responseTokenBudget }
  })
)
