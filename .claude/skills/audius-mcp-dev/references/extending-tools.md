# Extending Tools

## Table of Contents
1. [Adding a New Tool](#adding-a-new-tool)
2. [Complete Tool Example](#complete-tool-example)
3. [Tool Definition Schema](#tool-definition-schema)
4. [Handler Pattern](#handler-pattern)
5. [Registering in McpServer](#registering-in-mcpserver)
6. [Wiring Dependencies](#wiring-dependencies)
7. [Modifying Existing Tools](#modifying-existing-tools)

## Adding a New Tool

Three files to touch:

1. `src/tools/YourTool.ts` — definition + handler
2. `src/mcp/McpServer.ts` — register in tools/list and tools/call
3. `src/index.ts` — wire any new service dependencies

## Complete Tool Example

Here's a full example of adding a `recommend` tool that suggests tracks:

```typescript
// src/tools/RecommendTool.ts
import { Effect } from "effect"
import { Sandbox } from "../sandbox/Sandbox.js"
import { SpecIndex } from "../api/SpecIndex.js"
import { CallToolResult, TextContent, ToolAnnotations, Tool } from "../mcp/McpSchema.js"

export const recommendToolDefinition = Tool.make({
  name: "recommend",
  title: "Get Track Recommendations",
  description:
    "Get music recommendations based on a track, genre, or mood. " +
    "Combines search and execution to find and analyze related tracks.",
  inputSchema: {
    type: "object",
    properties: {
      seed: {
        type: "string",
        description: "Track ID, genre, or mood to base recommendations on"
      },
      limit: {
        type: "number",
        description: "Number of recommendations (default: 10)"
      }
    },
    required: ["seed"]
  },
  annotations: ToolAnnotations.make({
    title: "Get Track Recommendations",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  })
})

export const handleRecommend = (
  args: Record<string, unknown>
): Effect.Effect<typeof CallToolResult.Type, never, Sandbox | SpecIndex> =>
  Effect.gen(function* () {
    const sandbox = yield* Sandbox
    const seed = args["seed"] as string
    const limit = (args["limit"] as number) ?? 10

    if (!seed) {
      return CallToolResult.make({
        content: [TextContent.make({
          type: "text" as const,
          text: "Error: 'seed' argument is required."
        })],
        isError: true
      })
    }

    // Generate and execute recommendation code
    const code = `
      const trending = await audius.request('GET', '/tracks/trending', {
        query: { limit: ${limit} }
      });
      return trending;
    `

    const result = yield* Effect.catchAll(
      sandbox.execute(code),
      (error) => Effect.succeed({
        output: [] as string[],
        returnValue: undefined as unknown,
        error: error.message
      })
    )

    if (result.error) {
      return CallToolResult.make({
        content: [TextContent.make({
          type: "text" as const,
          text: `Error: ${result.error}`
        })],
        isError: true
      })
    }

    return CallToolResult.make({
      content: [TextContent.make({
        type: "text" as const,
        text: JSON.stringify(result.returnValue, null, 2)
      })]
    })
  })
```

## Tool Definition Schema

Tool definitions use `Tool.make()` from `McpSchema.ts`:

```typescript
Tool.make({
  name: "tool_name",           // Unique identifier
  title: "Human Title",        // Display name
  description: "...",          // LLM-facing description (crucial for Code Mode)
  inputSchema: {               // JSON Schema for arguments
    type: "object",
    properties: { ... },
    required: [...]
  },
  annotations: ToolAnnotations.make({
    title: "...",
    readOnlyHint: boolean,     // Does it only read data?
    destructiveHint: boolean,  // Can it destroy data?
    idempotentHint: boolean,   // Same input → same result?
    openWorldHint: boolean     // Does it access external systems?
  })
})
```

The `description` field is what the LLM sees to decide when and how to use the tool. For Code Mode tools, include:
- Available functions/objects in the sandbox
- TypeScript type signatures
- Example usage patterns
- What the tool returns

## Handler Pattern

Handlers are functions that take args and return `Effect.Effect<CallToolResult, never, RequiredServices>`:

```typescript
export const handleMyTool = (
  args: Record<string, unknown>
): Effect.Effect<typeof CallToolResult.Type, never, ServiceA | ServiceB> =>
  Effect.gen(function* () {
    const serviceA = yield* ServiceA
    const serviceB = yield* ServiceB

    // Validate args
    const input = args["input"] as string
    if (!input) {
      return CallToolResult.make({
        content: [TextContent.make({ type: "text" as const, text: "Error: ..." })],
        isError: true
      })
    }

    // Do work
    const result = yield* serviceA.doSomething(input)

    // Return success
    return CallToolResult.make({
      content: [TextContent.make({
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      })]
    })
  })
```

Key points:
- The error channel is `never` — tool errors go in `content` with `isError: true`
- Use `Effect.catchAll` to catch service errors and convert to tool-level errors
- The `R` type parameter (services) flows through to McpServer.ts and index.ts

## Registering in McpServer

In `src/mcp/McpServer.ts`:

```typescript
// Import
import { myToolDefinition, handleMyTool } from "../tools/MyTool.js"

// Add to tools/list (in the createHandler switch)
case "tools/list":
  return Effect.succeed(makeResponse(id, {
    tools: [
      stripMake(searchToolDefinition),
      stripMake(executeToolDefinition),
      stripMake(myToolDefinition)  // ← add here
    ]
  }))

// Add to handleToolCall switch
case "my_tool":
  return Effect.map(
    handleMyTool(args),
    (result) => makeResponse(id, result)
  )
```

Also update the `McpEffectHandler` type if you added new service dependencies:
```typescript
export type McpEffectHandler = (decoded: unknown) =>
  Effect.Effect<unknown, never, SpecIndex | Sandbox | NewService>
```

## Wiring Dependencies

In `src/index.ts`, if your tool needs a new service:

```typescript
// Create the layer
const NewServiceLayer = NewServiceLive.pipe(
  Layer.provide(SomeDependencyLayer)
)

// Add to AppLayer
const AppLayer = Layer.mergeAll(
  AppConfigLive,
  SpecIndexLayer,
  SandboxLayer,
  NewServiceLayer  // ← add here
)

// Update the runtime type
const runtime = yield* Effect.runtime<SpecIndex | Sandbox | NewService>()
```

## Modifying Existing Tools

### Changing the search tool's filters
Edit `SearchFilters` in `src/api/SpecIndex.ts` and the `inputSchema` in `src/tools/SearchTool.ts`.

### Changing what the execute tool can do in the sandbox
Edit `src/sandbox/Sandbox.ts` — the `execute` function builds the QuickJS context with injected globals. Add new host functions by following the `audius.request` pattern.

### Changing the tool descriptions
The descriptions in `SearchTool.ts` and `ExecuteTool.ts` are what LLMs see. The `INSTRUCTIONS` in `McpServer.ts` provide higher-level workflow guidance sent during initialization.
