/**
 * MCP 2025-11-25 protocol schema — Effect-TS port.
 *
 * Full spec coverage using @effect/rpc + effect/Schema.
 * Copied from scaffold as-is.
 *
 * @since 1.0.0
 */
import * as Rpc from "@effect/rpc/Rpc"
import type * as RpcClient from "@effect/rpc/RpcClient"
import type { RpcClientError } from "@effect/rpc/RpcClientError"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as RpcMiddleware from "@effect/rpc/RpcMiddleware"
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

// =============================================================================
// Common
// =============================================================================

/**
 * A uniquely identifying ID for a request in JSON-RPC.
 *
 * @since 1.0.0
 * @category Common
 */
export const RequestId: Schema.Union<[
  typeof Schema.String,
  typeof Schema.Number
]> = Schema.Union(Schema.String, Schema.Number)

/**
 * A uniquely identifying ID for a request in JSON-RPC.
 *
 * @since 1.0.0
 * @category Common
 */
export type RequestId = typeof RequestId.Type

/**
 * A progress token, used to associate progress notifications with the original
 * request.
 *
 * @since 1.0.0
 * @category Common
 */
export const ProgressToken: Schema.Union<[
  typeof Schema.String,
  typeof Schema.Number
]> = Schema.Union(Schema.String, Schema.Number)

/**
 * A progress token, used to associate progress notifications with the original
 * request.
 *
 * @since 1.0.0
 * @category Common
 */
export type ProgressToken = typeof ProgressToken.Type

/**
 * @since 1.0.0
 * @category Common
 */
export class RequestMeta extends Schema.Struct({
  _meta: Schema.optional(Schema.Struct({
    progressToken: Schema.optional(ProgressToken)
  }))
}) {}

/**
 * @since 1.0.0
 * @category Common
 */
export class ResultMeta extends Schema.Struct({
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
}) {}

/**
 * @since 1.0.0
 * @category Common
 */
export class NotificationMeta extends Schema.Struct({
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
}) {}

/**
 * An opaque token used to represent a cursor for pagination.
 *
 * @since 1.0.0
 * @category Common
 */
export const Cursor: typeof Schema.String = Schema.String

/**
 * @since 1.0.0
 * @category Common
 */
export type Cursor = typeof Cursor.Type

/**
 * @since 1.0.0
 * @category Common
 */
export class PaginatedRequestMeta extends Schema.Struct({
  ...RequestMeta.fields,
  cursor: Schema.optional(Cursor)
}) {}

/**
 * @since 1.0.0
 * @category Common
 */
export class PaginatedResultMeta extends Schema.Struct({
  ...ResultMeta.fields,
  nextCursor: Schema.optional(Cursor)
}) {}

/**
 * The sender or recipient of messages and data in a conversation.
 * @since 1.0.0
 * @category Common
 */
export const Role: Schema.Literal<["user", "assistant"]> = Schema.Literal("user", "assistant")

/**
 * @since 1.0.0
 * @category Common
 */
export type Role = typeof Role.Type

/**
 * Optional annotations for the client.
 *
 * @since 1.0.0
 * @category Common
 */
export class Annotations extends Schema.Struct({
  audience: Schema.optional(Schema.Array(Role)),
  lastModified: Schema.optional(Schema.String),
  priority: Schema.optional(Schema.Number.pipe(Schema.between(0, 1)))
}) {}

/**
 * An optionally-sized icon that can be displayed in a user interface.
 *
 * @since 1.0.0
 * @category Common
 */
export class Icon extends Schema.Struct({
  src: Schema.String,
  mimeType: Schema.optional(Schema.String),
  sizes: Schema.optional(Schema.Array(Schema.String)),
  theme: Schema.optional(Schema.Literal("light", "dark"))
}) {}

/**
 * Describes the name and version of an MCP implementation.
 *
 * @since 1.0.0
 * @category Common
 */
export class Implementation extends Schema.Struct({
  name: Schema.String,
  title: Schema.optional(Schema.String),
  version: Schema.String,
  description: Schema.optional(Schema.String),
  icons: Schema.optional(Schema.Array(Icon)),
  websiteUrl: Schema.optional(Schema.String)
}) {}

/**
 * Capabilities a client may support.
 *
 * @since 1.0.0
 * @category Common
 */
export class ClientCapabilities extends Schema.Class<ClientCapabilities>(
  "@effect/ai/McpSchema/ClientCapabilities"
)({
  experimental: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Struct({})
  })),
  roots: Schema.optional(Schema.Struct({
    listChanged: Schema.optional(Schema.Boolean)
  })),
  sampling: Schema.optional(Schema.Struct({
    tools: Schema.optional(Schema.Struct({})),
    context: Schema.optional(Schema.Struct({}))
  })),
  elicitation: Schema.optional(Schema.Struct({})),
  tasks: Schema.optional(Schema.Struct({
    list: Schema.optional(Schema.Struct({})),
    cancel: Schema.optional(Schema.Struct({})),
    requests: Schema.optional(Schema.Struct({
      sampling: Schema.optional(Schema.Struct({
        createMessage: Schema.optional(Schema.Struct({}))
      })),
      elicitation: Schema.optional(Schema.Struct({
        create: Schema.optional(Schema.Struct({}))
      }))
    }))
  }))
}) {}

/**
 * Capabilities that a server may support.
 *
 * @since 1.0.0
 * @category Common
 */
export class ServerCapabilities extends Schema.Struct({
  experimental: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Struct({})
  })),
  logging: Schema.optional(Schema.Struct({})),
  completions: Schema.optional(Schema.Struct({})),
  prompts: Schema.optional(Schema.Struct({
    listChanged: Schema.optional(Schema.Boolean)
  })),
  resources: Schema.optional(Schema.Struct({
    subscribe: Schema.optional(Schema.Boolean),
    listChanged: Schema.optional(Schema.Boolean)
  })),
  tools: Schema.optional(Schema.Struct({
    listChanged: Schema.optional(Schema.Boolean)
  })),
  tasks: Schema.optional(Schema.Struct({
    list: Schema.optional(Schema.Struct({})),
    cancel: Schema.optional(Schema.Struct({})),
    requests: Schema.optional(Schema.Struct({
      tools: Schema.optional(Schema.Struct({
        call: Schema.optional(Schema.Struct({}))
      }))
    }))
  }))
}) {}

/**
 * Metadata for augmenting a request with task execution.
 *
 * @since 1.0.0
 * @category Common
 */
export class TaskMetadata extends Schema.Struct({
  ttl: Schema.optional(Schema.Number)
}) {}

// =============================================================================
// Errors
// =============================================================================

/**
 * @since 1.0.0
 * @category Errors
 */
export class McpError extends Schema.Class<McpError>(
  "@effect/ai/McpSchema/McpError"
)({
  code: Schema.Number,
  message: Schema.String,
  data: Schema.optional(Schema.Unknown)
}) {}

/** @since 1.0.0 @category Errors */
export const INVALID_REQUEST_ERROR_CODE = -32600 as const
/** @since 1.0.0 @category Errors */
export const METHOD_NOT_FOUND_ERROR_CODE = -32601 as const
/** @since 1.0.0 @category Errors */
export const INVALID_PARAMS_ERROR_CODE = -32602 as const
/** @since 1.0.0 @category Errors */
export const INTERNAL_ERROR_CODE = -32603 as const
/** @since 1.0.0 @category Errors */
export const PARSE_ERROR_CODE = -32700 as const

/** @since 1.0.0 @category Errors */
export class ParseError extends Schema.TaggedError<ParseError>()("ParseError", {
  ...McpError.fields,
  code: Schema.tag(PARSE_ERROR_CODE)
}) {}

/** @since 1.0.0 @category Errors */
export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()("InvalidRequest", {
  ...McpError.fields,
  code: Schema.tag(INVALID_REQUEST_ERROR_CODE)
}) {}

/** @since 1.0.0 @category Errors */
export class MethodNotFound extends Schema.TaggedError<MethodNotFound>()("MethodNotFound", {
  ...McpError.fields,
  code: Schema.tag(METHOD_NOT_FOUND_ERROR_CODE)
}) {}

/** @since 1.0.0 @category Errors */
export class InvalidParams extends Schema.TaggedError<InvalidParams>()("InvalidParams", {
  ...McpError.fields,
  code: Schema.tag(INVALID_PARAMS_ERROR_CODE)
}) {}

/** @since 1.0.0 @category Errors */
export class InternalError extends Schema.TaggedError<InternalError>()("InternalError", {
  ...McpError.fields,
  code: Schema.tag(INTERNAL_ERROR_CODE)
}) {
  static readonly notImplemented = new InternalError({ message: "Not implemented" })
}

// =============================================================================
// Ping
// =============================================================================

/** @since 1.0.0 @category Ping */
export class Ping extends Rpc.make("ping", {
  success: Schema.Struct({}),
  error: McpError,
  payload: Schema.UndefinedOr(RequestMeta)
}) {}

// =============================================================================
// Initialization
// =============================================================================

/** @since 1.0.0 @category Initialization */
export class InitializeResult extends Schema.Class<InitializeResult>(
  "@effect/ai/McpSchema/InitializeResult"
)({
  ...ResultMeta.fields,
  protocolVersion: Schema.String,
  capabilities: ServerCapabilities,
  serverInfo: Implementation,
  instructions: Schema.optional(Schema.String)
}) {}

/** @since 1.0.0 @category Initialization */
export class Initialize extends Rpc.make("initialize", {
  success: InitializeResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    protocolVersion: Schema.String,
    capabilities: ClientCapabilities,
    clientInfo: Implementation
  }
}) {}

/** @since 1.0.0 @category Initialization */
export class InitializedNotification extends Rpc.make("notifications/initialized", {
  payload: Schema.UndefinedOr(NotificationMeta)
}) {}

// =============================================================================
// Cancellation
// =============================================================================

/** @since 1.0.0 @category Cancellation */
export class CancelledNotification extends Rpc.make("notifications/cancelled", {
  payload: {
    ...NotificationMeta.fields,
    requestId: RequestId,
    reason: Schema.optional(Schema.String)
  }
}) {}

// =============================================================================
// Progress
// =============================================================================

/** @since 1.0.0 @category Progress */
export class ProgressNotification extends Rpc.make("notifications/progress", {
  payload: {
    ...NotificationMeta.fields,
    progressToken: ProgressToken,
    progress: Schema.optional(Schema.Number),
    total: Schema.optional(Schema.Number),
    message: Schema.optional(Schema.String)
  }
}) {}

// =============================================================================
// Resources
// =============================================================================

/** @since 1.0.0 @category Resources */
export class Resource extends Schema.Class<Resource>(
  "@effect/ai/McpSchema/Resource"
)({
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  uri: Schema.String,
  name: Schema.String,
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  mimeType: Schema.optional(Schema.String),
  annotations: Schema.optional(Annotations),
  icons: Schema.optional(Schema.Array(Icon)),
  size: Schema.optional(Schema.Number)
}) {}

/** @since 1.0.0 @category Resources */
export class ResourceTemplate extends Schema.Class<ResourceTemplate>(
  "@effect/ai/McpSchema/ResourceTemplate"
)({
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  uriTemplate: Schema.String,
  name: Schema.String,
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  mimeType: Schema.optional(Schema.String),
  annotations: Schema.optional(Annotations),
  icons: Schema.optional(Schema.Array(Icon))
}) {}

/** @since 1.0.0 @category Resources */
export class ResourceContents extends Schema.Struct({
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  uri: Schema.String,
  mimeType: Schema.optional(Schema.String)
}) {}

/** @since 1.0.0 @category Resources */
export class TextResourceContents extends Schema.Struct({
  ...ResourceContents.fields,
  text: Schema.String
}) {}

/** @since 1.0.0 @category Resources */
export class BlobResourceContents extends Schema.Struct({
  ...ResourceContents.fields,
  blob: Schema.Uint8ArrayFromBase64
}) {}

/** @since 1.0.0 @category Resources */
export class ListResourcesResult extends Schema.Class<ListResourcesResult>(
  "@effect/ai/McpSchema/ListResourcesResult"
)({
  ...PaginatedResultMeta.fields,
  resources: Schema.Array(Resource)
}) {}

/** @since 1.0.0 @category Resources */
export class ListResources extends Rpc.make("resources/list", {
  success: ListResourcesResult,
  error: McpError,
  payload: Schema.UndefinedOr(PaginatedRequestMeta)
}) {}

/** @since 1.0.0 @category Resources */
export class ListResourceTemplatesResult extends Schema.Class<ListResourceTemplatesResult>(
  "@effect/ai/McpSchema/ListResourceTemplatesResult"
)({
  ...PaginatedResultMeta.fields,
  resourceTemplates: Schema.Array(ResourceTemplate)
}) {}

/** @since 1.0.0 @category Resources */
export class ListResourceTemplates extends Rpc.make("resources/templates/list", {
  success: ListResourceTemplatesResult,
  error: McpError,
  payload: Schema.UndefinedOr(PaginatedRequestMeta)
}) {}

/** @since 1.0.0 @category Resources */
export class ReadResourceResult extends Schema.Struct({
  ...ResultMeta.fields,
  contents: Schema.Array(Schema.Union(TextResourceContents, BlobResourceContents))
}) {}

/** @since 1.0.0 @category Resources */
export class ReadResource extends Rpc.make("resources/read", {
  success: ReadResourceResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    uri: Schema.String
  }
}) {}

/** @since 1.0.0 @category Resources */
export class ResourceListChangedNotification extends Rpc.make("notifications/resources/list_changed", {
  payload: Schema.UndefinedOr(NotificationMeta)
}) {}

/** @since 1.0.0 @category Resources */
export class Subscribe extends Rpc.make("resources/subscribe", {
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    uri: Schema.String
  }
}) {}

/** @since 1.0.0 @category Resources */
export class Unsubscribe extends Rpc.make("resources/unsubscribe", {
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    uri: Schema.String
  }
}) {}

/** @since 1.0.0 @category Resources */
export class ResourceUpdatedNotification extends Rpc.make("notifications/resources/updated", {
  payload: {
    ...NotificationMeta.fields,
    uri: Schema.String
  }
}) {}

// =============================================================================
// Prompts
// =============================================================================

/** @since 1.0.0 @category Prompts */
export class PromptArgument extends Schema.Struct({
  name: Schema.String,
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  required: Schema.optional(Schema.Boolean)
}) {}

/** @since 1.0.0 @category Prompts */
export class Prompt extends Schema.Class<Prompt>(
  "@effect/ai/McpSchema/Prompt"
)({
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  name: Schema.String,
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  arguments: Schema.optional(Schema.Array(PromptArgument)),
  icons: Schema.optional(Schema.Array(Icon))
}) {}

/** @since 1.0.0 @category Prompts */
export class TextContent extends Schema.Struct({
  type: Schema.tag("text"),
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  text: Schema.String,
  annotations: Schema.optional(Annotations)
}) {}

/** @since 1.0.0 @category Prompts */
export class ImageContent extends Schema.Struct({
  type: Schema.tag("image"),
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  data: Schema.Uint8ArrayFromBase64,
  mimeType: Schema.String,
  annotations: Schema.optional(Annotations)
}) {}

/** @since 1.0.0 @category Prompts */
export class AudioContent extends Schema.Struct({
  type: Schema.tag("audio"),
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  data: Schema.Uint8ArrayFromBase64,
  mimeType: Schema.String,
  annotations: Schema.optional(Annotations)
}) {}

/** @since 1.0.0 @category Prompts */
export class EmbeddedResource extends Schema.Struct({
  type: Schema.tag("resource"),
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  resource: Schema.Union(TextResourceContents, BlobResourceContents),
  annotations: Schema.optional(Annotations)
}) {}

/** @since 1.0.0 @category Prompts */
export class ResourceLink extends Schema.Struct({
  ...Resource.fields,
  type: Schema.tag("resource_link")
}) {}

/** @since 1.0.0 @category Sampling */
export class ToolUseContent extends Schema.Struct({
  type: Schema.tag("tool_use"),
  id: Schema.String,
  name: Schema.String,
  input: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
}) {}

/** @since 1.0.0 @category Sampling */
export class ToolResultContent extends Schema.Struct({
  type: Schema.tag("tool_result"),
  toolUseId: Schema.String,
  content: Schema.Array(
    Schema.Union(TextContent, ImageContent, AudioContent, EmbeddedResource, ResourceLink)
  ),
  structuredContent: Schema.optional(Schema.Unknown),
  isError: Schema.optional(Schema.Boolean),
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
}) {}

/** @since 1.0.0 @category Prompts */
export class ContentBlock extends Schema.Union(
  TextContent,
  ImageContent,
  AudioContent,
  EmbeddedResource,
  ResourceLink
) {}

/** @since 1.0.0 @category Sampling */
export class SamplingMessageContentBlock extends Schema.Union(
  TextContent,
  ImageContent,
  AudioContent,
  ToolUseContent,
  ToolResultContent
) {}

/** @since 1.0.0 @category Prompts */
export class PromptMessage extends Schema.Struct({
  role: Role,
  content: ContentBlock
}) {}

/** @since 1.0.0 @category Prompts */
export class ListPromptsResult extends Schema.Class<ListPromptsResult>(
  "@effect/ai/McpSchema/ListPromptsResult"
)({
  ...PaginatedResultMeta.fields,
  prompts: Schema.Array(Prompt)
}) {}

/** @since 1.0.0 @category Prompts */
export class ListPrompts extends Rpc.make("prompts/list", {
  success: ListPromptsResult,
  error: McpError,
  payload: Schema.UndefinedOr(PaginatedRequestMeta)
}) {}

/** @since 1.0.0 @category Prompts */
export class GetPromptResult extends Schema.Class<GetPromptResult>(
  "@effect/ai/McpSchema/GetPromptResult"
)({
  ...ResultMeta.fields,
  messages: Schema.Array(PromptMessage),
  description: Schema.optional(Schema.String)
}) {}

/** @since 1.0.0 @category Prompts */
export class GetPrompt extends Rpc.make("prompts/get", {
  success: GetPromptResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    name: Schema.String,
    title: Schema.optional(Schema.String),
    arguments: Schema.optional(Schema.Record({
      key: Schema.String,
      value: Schema.String
    }))
  }
}) {}

/** @since 1.0.0 @category Prompts */
export class PromptListChangedNotification extends Rpc.make("notifications/prompts/list_changed", {
  payload: Schema.UndefinedOr(NotificationMeta)
}) {}

// =============================================================================
// Tools
// =============================================================================

/** @since 1.0.0 @category Tools */
export class ToolAnnotations extends Schema.Class<ToolAnnotations>(
  "@effect/ai/McpSchema/ToolAnnotations"
)({
  title: Schema.optional(Schema.String),
  readOnlyHint: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  destructiveHint: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  idempotentHint: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  openWorldHint: Schema.optionalWith(Schema.Boolean, { default: () => true })
}) {}

/** @since 1.0.0 @category Tools */
export class ToolExecution extends Schema.Struct({
  taskSupport: Schema.optional(
    Schema.Literal("forbidden", "optional", "required")
  )
}) {}

/** @since 1.0.0 @category Tools */
export class Tool extends Schema.Class<Tool>(
  "@effect/ai/McpSchema/Tool"
)({
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  name: Schema.String,
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  inputSchema: Schema.Unknown,
  outputSchema: Schema.optional(Schema.Unknown),
  execution: Schema.optional(ToolExecution),
  icons: Schema.optional(Schema.Array(Icon)),
  annotations: Schema.optional(ToolAnnotations)
}) {}

/** @since 1.0.0 @category Tools */
export class ListToolsResult extends Schema.Class<ListToolsResult>(
  "@effect/ai/McpSchema/ListToolsResult"
)({
  ...PaginatedResultMeta.fields,
  tools: Schema.Array(Tool)
}) {}

/** @since 1.0.0 @category Tools */
export class ListTools extends Rpc.make("tools/list", {
  success: ListToolsResult,
  error: McpError,
  payload: Schema.UndefinedOr(PaginatedRequestMeta)
}) {}

/** @since 1.0.0 @category Tools */
export class CallToolResult extends Schema.Class<CallToolResult>("@effect/ai/McpSchema/CallToolResult")({
  ...ResultMeta.fields,
  content: Schema.Array(ContentBlock),
  structuredContent: Schema.optional(Schema.Unknown),
  isError: Schema.optional(Schema.Boolean)
}) {}

/** @since 1.0.0 @category Tools */
export class CallTool extends Rpc.make("tools/call", {
  success: CallToolResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    name: Schema.String,
    arguments: Schema.Record({
      key: Schema.String,
      value: Schema.Unknown
    }),
    task: Schema.optional(TaskMetadata)
  }
}) {}

/** @since 1.0.0 @category Tools */
export class ToolListChangedNotification extends Rpc.make("notifications/tools/list_changed", {
  payload: Schema.UndefinedOr(NotificationMeta)
}) {}

// =============================================================================
// Logging
// =============================================================================

/** @since 1.0.0 @category Logging */
export const LoggingLevel: Schema.Literal<[
  "debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"
]> = Schema.Literal(
  "debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"
)

/** @since 1.0.0 @category Logging */
export type LoggingLevel = typeof LoggingLevel.Type

/** @since 1.0.0 @category Logging */
export class SetLevel extends Rpc.make("logging/setLevel", {
  payload: {
    ...RequestMeta.fields,
    level: LoggingLevel
  },
  error: McpError
}) {}

/** @since 1.0.0 @category Logging */
export class LoggingMessageNotification extends Rpc.make("notifications/message", {
  payload: Schema.Struct({
    ...NotificationMeta.fields,
    level: LoggingLevel,
    logger: Schema.optional(Schema.String),
    data: Schema.Unknown
  })
}) {}

// =============================================================================
// Sampling
// =============================================================================

/** @since 1.0.0 @category Sampling */
export class SamplingMessage extends Schema.Struct({
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  role: Role,
  content: Schema.Union(
    TextContent,
    ImageContent,
    AudioContent,
    ToolUseContent,
    ToolResultContent,
    Schema.Array(SamplingMessageContentBlock)
  )
}) {}

/** @since 1.0.0 @category Sampling */
export class ModelHint extends Schema.Struct({
  name: Schema.optional(Schema.String)
}) {}

/** @since 1.0.0 @category Sampling */
export class ModelPreferences extends Schema.Class<ModelPreferences>(
  "@effect/ai/McpSchema/ModelPreferences"
)({
  hints: Schema.optional(Schema.Array(ModelHint)),
  costPriority: Schema.optional(Schema.Number.pipe(Schema.between(0, 1))),
  speedPriority: Schema.optional(Schema.Number.pipe(Schema.between(0, 1))),
  intelligencePriority: Schema.optional(Schema.Number.pipe(Schema.between(0, 1)))
}) {}

/** @since 1.0.0 @category Sampling */
export class ToolChoice extends Schema.Struct({
  mode: Schema.Literal("auto", "required", "none")
}) {}

/** @since 1.0.0 @category Sampling */
export class CreateMessageResult extends Schema.Class<CreateMessageResult>(
  "@effect/ai/McpSchema/CreateMessageResult"
)({
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  content: Schema.Union(
    TextContent,
    ImageContent,
    AudioContent,
    ToolUseContent,
    ToolResultContent,
    Schema.Array(SamplingMessageContentBlock)
  ),
  model: Schema.String,
  role: Role,
  stopReason: Schema.optional(Schema.String)
}) {}

/** @since 1.0.0 @category Sampling */
export class CreateMessage extends Rpc.make("sampling/createMessage", {
  success: CreateMessageResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    messages: Schema.Array(SamplingMessage),
    modelPreferences: Schema.optional(ModelPreferences),
    systemPrompt: Schema.optional(Schema.String),
    includeContext: Schema.optional(
      Schema.Literal("none", "thisServer", "allServers")
    ),
    temperature: Schema.optional(Schema.Number),
    maxTokens: Schema.Number,
    stopSequences: Schema.optional(Schema.Array(Schema.String)),
    metadata: Schema.optional(Schema.Unknown),
    tools: Schema.optional(Schema.Array(Tool)),
    toolChoice: Schema.optional(ToolChoice),
    task: Schema.optional(TaskMetadata)
  }
}) {}

// =============================================================================
// Autocomplete
// =============================================================================

/** @since 1.0.0 @category Autocomplete */
export class ResourceReference extends Schema.Struct({
  type: Schema.tag("ref/resource"),
  uri: Schema.String
}) {}

/** @since 1.0.0 @category Autocomplete */
export class PromptReference extends Schema.Struct({
  type: Schema.tag("ref/prompt"),
  name: Schema.String,
  title: Schema.optional(Schema.String)
}) {}

/** @since 1.0.0 @category Autocomplete */
export class CompleteResult extends Schema.Class<CompleteResult>("@effect/ai/McpSchema/CompleteResult")({
  completion: Schema.Struct({
    values: Schema.Array(Schema.String),
    total: Schema.optional(Schema.Number),
    hasMore: Schema.optional(Schema.Boolean)
  })
}) {
  static readonly empty = CompleteResult.make({
    completion: { values: [], total: 0, hasMore: false }
  })
}

/** @since 1.0.0 @category Autocomplete */
export class Complete extends Rpc.make("completion/complete", {
  success: CompleteResult,
  error: McpError,
  payload: Schema.Struct({
    ref: Schema.Union(PromptReference, ResourceReference),
    argument: Schema.Struct({
      name: Schema.String,
      value: Schema.String
    }),
    context: Schema.optionalWith(
      Schema.Struct({
        arguments: Schema.optionalWith(
          Schema.Record({ key: Schema.String, value: Schema.String }),
          { default: () => ({}) }
        )
      }),
      { default: () => ({ arguments: {} }) }
    )
  })
}) {}

// =============================================================================
// Roots
// =============================================================================

/** @since 1.0.0 @category Roots */
export class Root extends Schema.Class<Root>(
  "@effect/ai/McpSchema/Root"
)({
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  uri: Schema.String,
  name: Schema.optional(Schema.String)
}) {}

/** @since 1.0.0 @category Roots */
export class ListRootsResult extends Schema.Class<ListRootsResult>(
  "@effect/ai/McpSchema/ListRootsResult"
)({
  roots: Schema.Array(Root)
}) {}

/** @since 1.0.0 @category Roots */
export class ListRoots extends Rpc.make("roots/list", {
  success: ListRootsResult,
  error: McpError,
  payload: Schema.UndefinedOr(RequestMeta)
}) {}

/** @since 1.0.0 @category Roots */
export class RootsListChangedNotification extends Rpc.make("notifications/roots/list_changed", {
  payload: Schema.UndefinedOr(NotificationMeta)
}) {}

// =============================================================================
// Elicitation
// =============================================================================

/** @since 1.0.0 @category Elicitation */
export class ElicitAcceptResult extends Schema.Class<ElicitAcceptResult>(
  "@effect/ai/McpSchema/ElicitAcceptResult"
)({
  ...ResultMeta.fields,
  action: Schema.Literal("accept"),
  content: Schema.Unknown
}) {}

/** @since 1.0.0 @category Elicitation */
export class ElicitDeclineResult extends Schema.Class<ElicitDeclineResult>(
  "@effect/ai/McpSchema/ElicitDeclineResult"
)({
  ...ResultMeta.fields,
  action: Schema.Literal("cancel", "decline")
}) {}

/** @since 1.0.0 @category Elicitation */
export const ElicitResult = Schema.Union(ElicitAcceptResult, ElicitDeclineResult)

/** @since 1.0.0 @category Elicitation */
export class ElicitFormPayload extends Schema.Struct({
  ...RequestMeta.fields,
  mode: Schema.optional(Schema.Literal("form")),
  message: Schema.String,
  requestedSchema: Schema.Unknown,
  task: Schema.optional(TaskMetadata)
}) {}

/** @since 1.0.0 @category Elicitation */
export class ElicitUrlPayload extends Schema.Struct({
  ...RequestMeta.fields,
  mode: Schema.Literal("url"),
  elicitationId: Schema.String,
  message: Schema.String,
  url: Schema.String,
  task: Schema.optional(TaskMetadata)
}) {}

/** @since 1.0.0 @category Elicitation */
export class Elicit extends Rpc.make("elicitation/create", {
  success: ElicitResult,
  error: McpError,
  payload: Schema.Union(ElicitFormPayload, ElicitUrlPayload)
}) {}

/** @since 1.0.0 @category Elicitation */
export class ElicitationDeclined
  extends Schema.TaggedError<ElicitationDeclined>("@effect/ai/McpSchema/ElicitationDeclined")("ElicitationDeclined", {
    request: Elicit.payloadSchema,
    cause: Schema.optional(Schema.Defect)
  })
{}

// =============================================================================
// Tasks
// =============================================================================

/** @since 1.0.0 @category Tasks */
export const TaskStatus: Schema.Literal<[
  "working", "input_required", "completed", "failed", "cancelled"
]> = Schema.Literal("working", "input_required", "completed", "failed", "cancelled")

/** @since 1.0.0 @category Tasks */
export type TaskStatus = typeof TaskStatus.Type

/** @since 1.0.0 @category Tasks */
export class Task extends Schema.Class<Task>(
  "@effect/ai/McpSchema/Task"
)({
  taskId: Schema.String,
  status: TaskStatus,
  statusMessage: Schema.optional(Schema.String),
  createdAt: Schema.String,
  lastUpdatedAt: Schema.String,
  ttl: Schema.NullOr(Schema.Number),
  pollInterval: Schema.optional(Schema.Number)
}) {}

/** @since 1.0.0 @category Tasks */
export class CreateTaskResult extends Schema.Class<CreateTaskResult>(
  "@effect/ai/McpSchema/CreateTaskResult"
)({
  ...ResultMeta.fields,
  task: Task
}) {}

/** @since 1.0.0 @category Tasks */
export class RelatedTaskMetadata extends Schema.Struct({
  taskId: Schema.String
}) {}

/** @since 1.0.0 @category Tasks */
export class GetTask extends Rpc.make("tasks/get", {
  success: Task,
  error: McpError,
  payload: { ...RequestMeta.fields, taskId: Schema.String }
}) {}

/** @since 1.0.0 @category Tasks */
export class GetTaskPayload extends Rpc.make("tasks/result", {
  success: Schema.Struct({ ...ResultMeta.fields }),
  error: McpError,
  payload: { ...RequestMeta.fields, taskId: Schema.String }
}) {}

/** @since 1.0.0 @category Tasks */
export class ListTasks extends Rpc.make("tasks/list", {
  success: Schema.Struct({
    ...PaginatedResultMeta.fields,
    tasks: Schema.Array(Task)
  }),
  error: McpError,
  payload: Schema.UndefinedOr(PaginatedRequestMeta)
}) {}

/** @since 1.0.0 @category Tasks */
export class CancelTask extends Rpc.make("tasks/cancel", {
  success: Task,
  error: McpError,
  payload: { ...RequestMeta.fields, taskId: Schema.String }
}) {}

/** @since 1.0.0 @category Tasks */
export class TaskStatusNotification extends Rpc.make(
  "notifications/tasks/status",
  { payload: { ...NotificationMeta.fields, ...Task.fields } }
) {}

// =============================================================================
// McpServerClient
// =============================================================================

/** @since 1.0.0 @category McpServerClient */
export class McpServerClient extends Context.Tag("@effect/ai/McpSchema/McpServerClient")<
  McpServerClient,
  {
    readonly clientId: number
    readonly getClient: Effect.Effect<
      RpcClient.RpcClient<RpcGroup.Rpcs<typeof ServerRequestRpcs>, RpcClientError>,
      never,
      Scope.Scope
    >
  }
>() {}

/** @since 1.0.0 @category McpServerClient */
export class McpServerClientMiddleware
  extends RpcMiddleware.Tag<McpServerClientMiddleware>()("@effect/ai/McpSchema/McpServerClientMiddleware", {
    provides: McpServerClient
  })
{}

// =============================================================================
// Protocol
// =============================================================================

/** @since 1.0.0 @category Protocol */
export type RequestEncoded<Group extends RpcGroup.Any> = RpcGroup.Rpcs<
  Group
> extends infer Rpc ? Rpc extends Rpc.Rpc<
    infer _Tag, infer _Payload, infer _Success, infer _Error, infer _Middleware
  > ? {
      readonly _tag: "Request"
      readonly id: string | number
      readonly method: _Tag
      readonly payload: _Payload["Encoded"]
    }
  : never
  : never

/** @since 1.0.0 @category Protocol */
export type NotificationEncoded<Group extends RpcGroup.Any> = RpcGroup.Rpcs<
  Group
> extends infer Rpc ? Rpc extends Rpc.Rpc<
    infer _Tag, infer _Payload, infer _Success, infer _Error, infer _Middleware
  > ? {
      readonly _tag: "Notification"
      readonly method: _Tag
      readonly payload: _Payload["Encoded"]
    }
  : never
  : never

/** @since 1.0.0 @category Protocol */
export type SuccessEncoded<Group extends RpcGroup.Any> = RpcGroup.Rpcs<
  Group
> extends infer Rpc ? Rpc extends Rpc.Rpc<
    infer _Tag, infer _Payload, infer _Success, infer _Error, infer _Middleware
  > ? {
      readonly _tag: "Success"
      readonly id: string | number
      readonly result: _Success["Encoded"]
    }
  : never
  : never

/** @since 1.0.0 @category Protocol */
export type FailureEncoded<Group extends RpcGroup.Any> = RpcGroup.Rpcs<
  Group
> extends infer Rpc ? Rpc extends Rpc.Rpc<
    infer _Tag, infer _Payload, infer _Success, infer _Error, infer _Middleware
  > ? {
      readonly _tag: "Failure"
      readonly id: string | number
      readonly error: _Error["Encoded"]
    }
  : never
  : never

/** @since 1.0.0 @category Protocol */
export class ClientRequestRpcs extends RpcGroup.make(
  Ping,
  Initialize,
  Complete,
  SetLevel,
  GetPrompt,
  ListPrompts,
  ListResources,
  ListResourceTemplates,
  ReadResource,
  Subscribe,
  Unsubscribe,
  CallTool,
  ListTools,
  GetTask,
  GetTaskPayload,
  ListTasks,
  CancelTask
).middleware(McpServerClientMiddleware) {}

/** @since 1.0.0 @category Protocol */
export type ClientRequestEncoded = RequestEncoded<typeof ClientRequestRpcs>

/** @since 1.0.0 @category Protocol */
export class ClientNotificationRpcs extends RpcGroup.make(
  CancelledNotification,
  ProgressNotification,
  InitializedNotification,
  RootsListChangedNotification,
  TaskStatusNotification
) {}

/** @since 1.0.0 @category Protocol */
export type ClientNotificationEncoded = NotificationEncoded<typeof ClientNotificationRpcs>

/** @since 1.0.0 @category Protocol */
export class ClientRpcs extends ClientRequestRpcs.merge(ClientNotificationRpcs) {}

/** @since 1.0.0 @category Protocol */
export type ClientSuccessEncoded = SuccessEncoded<typeof ServerRequestRpcs>

/** @since 1.0.0 @category Protocol */
export type ClientFailureEncoded = FailureEncoded<typeof ServerRequestRpcs>

/** @since 1.0.0 @category Protocol */
export class ServerRequestRpcs extends RpcGroup.make(
  Ping,
  CreateMessage,
  ListRoots,
  Elicit,
  GetTask,
  GetTaskPayload,
  ListTasks,
  CancelTask
) {}

/** @since 1.0.0 @category Protocol */
export type ServerRequestEncoded = RequestEncoded<typeof ServerRequestRpcs>

/** @since 1.0.0 @category Protocol */
export class ServerNotificationRpcs extends RpcGroup.make(
  CancelledNotification,
  ProgressNotification,
  LoggingMessageNotification,
  ResourceUpdatedNotification,
  ResourceListChangedNotification,
  ToolListChangedNotification,
  PromptListChangedNotification,
  TaskStatusNotification
) {}

/** @since 1.0.0 @category Protocol */
export type ServerNotificationEncoded = NotificationEncoded<typeof ServerNotificationRpcs>

/** @since 1.0.0 @category Protocol */
export type ServerSuccessEncoded = SuccessEncoded<typeof ClientRequestRpcs>

/** @since 1.0.0 @category Protocol */
export type ServerFailureEncoded = FailureEncoded<typeof ClientRequestRpcs>

/** @since 1.0.0 @category Protocol */
export type ServerResultEncoded = ServerSuccessEncoded | ServerFailureEncoded

/** @since 1.0.0 @category Protocol */
export type FromClientEncoded = ClientRequestEncoded | ClientNotificationEncoded

/** @since 1.0.0 @category Protocol */
export type FromServerEncoded = ServerResultEncoded | ServerNotificationEncoded

/** @since 1.0.0 @category Parameters */
export const ParamAnnotation: unique symbol = Symbol.for("@effect/ai/McpSchema/ParamNameId")

/** @since 1.0.0 @category Parameters */
export interface Param<Id extends string, S extends Schema.Schema.Any>
  extends Schema.Schema<S["Type"], S["Encoded"], S["Context"]>
{
  readonly [ParamAnnotation]: Id
}

/** @since 1.0.0 @category Parameters */
export const param = <const Id extends string, S extends Schema.Schema.Any>(id: Id, schema: S): Param<Id, S> =>
  schema.annotations({
    [ParamAnnotation]: id
  }) as any
