/**
 * Subgraph tool — query the Audius subgraph on The Graph.
 *
 * Provides access to on-chain protocol data: staking, delegation,
 * governance proposals, service nodes, $AUDIO token events.
 *
 * This complements the REST API (which covers content: tracks, users,
 * playlists) with protocol-level data from Ethereum mainnet contracts.
 */
import { Effect } from "effect"
import { AppConfig } from "../AppConfig.js"
import { CallToolResult, TextContent, ToolAnnotations, Tool } from "../mcp/McpSchema.js"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUBGRAPH_ID = "F8TjrYuTLohz64J8uuDke9htSR1aY9TGCuEjJVVjUJaD"

/** Public endpoint (rate-limited, no API key needed) */
const PUBLIC_ENDPOINT = `https://gateway.thegraph.com/api/subgraphs/id/${SUBGRAPH_ID}`

/** Authenticated endpoint template (higher rate limits) */
const authedEndpoint = (apiKey: string) =>
  `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${SUBGRAPH_ID}`

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const subgraphToolDefinition = Tool.make({
  name: "subgraph",
  title: "Query Audius Subgraph",
  description:
    "Query the Audius protocol subgraph on The Graph for on-chain data: " +
    "staking, delegation, governance proposals, service nodes, $AUDIO token " +
    "events, and network statistics. Takes a GraphQL query string.\n\n" +
    "Available entities: AudiusNetwork, User (staking/delegation), ServiceNode, " +
    "ServiceType, Delegate, Proposal, Vote, ClaimEvent, ClaimRound, SlashEvent, " +
    "IncreasedStakeEvent, DecreaseStakeEvent, RegisterProviderServicerEvent.\n\n" +
    "Example queries:\n" +
    '- { audiusNetworks(first: 1) { totalTokensStaked totalTokensDelegated totalSupply } }\n' +
    '- { user(id: "0x...") { stakeAmount delegationReceivedAmount balance } }\n' +
    '- { proposals(first: 5, orderBy: submissionBlockNumber, orderDirection: desc) { name outcome voteMagnitudeYes voteMagnitudeNo } }\n' +
    '- { serviceNodes(where: { isRegistered: true }) { endpoint type { id } owner { id } } }',
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "GraphQL query string"
      },
      variables: {
        type: "object",
        description: "Optional GraphQL variables"
      }
    },
    required: ["query"]
  },
  annotations: ToolAnnotations.make({
    title: "Query Audius Subgraph",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  })
})

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handleSubgraph = (
  args: Record<string, unknown>
): Effect.Effect<typeof CallToolResult.Type, never, AppConfig> =>
  Effect.gen(function* () {
    const config = yield* AppConfig

    const query = args["query"] as string
    const variables = args["variables"] as Record<string, unknown> | undefined

    if (!query || typeof query !== "string") {
      return CallToolResult.make({
        content: [TextContent.make({
          type: "text" as const,
          text: "Error: 'query' argument is required and must be a GraphQL query string."
        })],
        isError: true
      })
    }

    // Use authenticated endpoint if a Graph API key is available
    const endpoint = config.graphApiKey ? authedEndpoint(config.graphApiKey) : PUBLIC_ENDPOINT

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables })
        }),
      catch: (e) => new Error(`Subgraph request failed: ${e}`)
    }).pipe(Effect.catchAll((error) =>
      Effect.succeed({ error: error.message } as unknown)
    ))

    // Handle fetch errors
    if (response && typeof response === "object" && "error" in (response as Record<string, unknown>)) {
      return CallToolResult.make({
        content: [TextContent.make({
          type: "text" as const,
          text: `Error: ${(response as Record<string, unknown>)["error"]}`
        })],
        isError: true
      })
    }

    const httpResponse = response as Response

    if (!httpResponse.ok) {
      const errorText = yield* Effect.tryPromise({
        try: () => httpResponse.text(),
        catch: () => new Error("Failed to read error response")
      }).pipe(Effect.catchAll(() => Effect.succeed("Unknown error")))

      return CallToolResult.make({
        content: [TextContent.make({
          type: "text" as const,
          text: `Subgraph error (HTTP ${httpResponse.status}): ${errorText}`
        })],
        isError: true
      })
    }

    const json = yield* Effect.tryPromise({
      try: () => httpResponse.json() as Promise<Record<string, unknown>>,
      catch: (e) => new Error(`Failed to parse response: ${e}`)
    }).pipe(Effect.catchAll((error) =>
      Effect.succeed({ errors: [{ message: error.message }] } as Record<string, unknown>)
    ))

    // Handle GraphQL errors
    const errors = json["errors"] as Array<{ message: string }> | undefined
    if (errors && errors.length > 0) {
      const errorMessages = errors.map((e) => e.message).join("; ")
      return CallToolResult.make({
        content: [TextContent.make({
          type: "text" as const,
          text: `GraphQL error: ${errorMessages}`
        })],
        isError: true
      })
    }

    return CallToolResult.make({
      content: [TextContent.make({
        type: "text" as const,
        text: JSON.stringify(json["data"] ?? json, null, 2)
      })]
    })
  })
