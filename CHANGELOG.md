# Changelog

## 2.3.0 (2025-06-04)

### Major Changes
- **Smithery SDK Integration**: Migrated HTTP transport to use Smithery SDK for improved functionality
- **Breaking**: Node.js 18+ now required (previously 16+) for ES modules support

### New Features
- **Stateful Sessions**: HTTP transport now supports session management with configurable limits
- **Runtime Configuration**: Dynamic configuration via Zod schema validation
- **Transport Modes**: Support for both stateful (default) and stateless HTTP modes
- **Enhanced Security**: Built-in request validation and type safety via Smithery SDK
- **Configuration Validation**: All configuration now validated with descriptive error messages

### Improvements
- Better error handling with validated configuration schemas
- Improved TypeScript types with proper exports
- Modular architecture with separate transport implementations
- Registry pattern for component registration (tools, resources, prompts)
- Automatic transport detection based on environment

### Technical Changes
- Created `src/transports/` directory for transport implementations
- Created `src/registry/` for component registration logic
- Created `src/schemas/` for Zod configuration schemas
- Added `smithery-wrapper.ts` to handle ES module compatibility
- Fixed ES module/CommonJS interoperability issues with okay-error dependency
- Added patch-package to handle third-party module issues
- Updated build process to handle ES modules correctly

### Migration Notes
- STDIO transport remains unchanged - no action needed for Claude Desktop users
- HTTP users should set `MCP_TRANSPORT=http` instead of relying on PORT
- See MIGRATION-GUIDE.md for detailed upgrade instructions

## 2.2.0 (2025-05-29)

### New Features - Medium Priority Missing Endpoints
- Added track media operations in Tracks toolset
  - `get-track-download` - Get download information and URLs for tracks
  - `get-track-inspect` - Get technical inspection details (sample rate, bit rate, file size, etc.)
  - `get-track-stems` - Get available stems/components for tracks
- Added user relationship discovery in Users toolset
  - `get-track-purchasers` - Get users who purchased a specific track
  - `get-track-remixers` - Get users who remixed a specific track
  - `get-related-users` - Get users related to a given user based on listening patterns
  - `get-user-tags` - Get tags associated with a user
- Added enhanced discovery features in Search toolset
  - `get-recommendations` - Get personalized recommendations (tracks, users, playlists) for a user
  - `get-user-history` - Get user activity history (plays, likes, reposts, follows)
  - `get-trending-by-genre` - Get trending content filtered by genre and time range

### Improvements
- Enhanced API coverage from ~90% to ~95% of Audius Protocol endpoints
- Better formatted responses with emojis and structured information
- Comprehensive error handling for missing tracks, users, and data
- Direct API calls for endpoints not available in the official SDK
- Parallel processing for bulk operations with individual error tracking

### Technical
- Created new discovery.ts tool file for recommendation and history features
- All new endpoints use proper TypeScript typing and error handling
- Maintained consistent response formatting across all new tools
- Updated toolset registrations for all new functionality

## 2.1.0 (2025-05-29)

### New Features
- Added Albums toolset with complete album functionality
  - `get-album-details` - Get album information
  - `get-album-tracks` - Get tracks in an album
  - `get-user-albums` - Get albums for a specific user
- Added Core toolset with fundamental Audius features
  - `resolve` - Resolve Audius URLs to entities (tracks, users, playlists, albums)
  - `get-sdk-version` - Get SDK and server version information
- Added OAuth toolset for authentication flows
  - `initiate-oauth` - Start OAuth authorization flow with Audius
  - `verify-token` - Verify JWT tokens from OAuth
  - `exchange-code` - Exchange authorization codes for tokens (with implementation guidance)
- Added track streaming support
  - `get-track-stream-url` - Get streaming URL for tracks
- Created missing types definition file (`src/types/index.ts`)

### Improvements
- Albums are properly handled as playlists with `is_album=true`
- Better resource responses with mixed content types
- Consistent error handling across new tools
- OAuth implementation includes CSRF protection with state tokens
- Multiple API host fallback for token verification

### Technical
- Fixed TypeScript compilation issues
- Added proper RequestHandlerExtra type definition
- Improved SDK client usage pattern
- OAuth state management with automatic cleanup

## 2.0.1 (2025-04-29)

### New Features
- Added toolsets pattern for better organization and control
- Implemented parameter validation helpers for consistent error handling
- Added ability to enable/disable specific toolsets
- Added support for read-only mode for sensitive environments
- Created documentation for toolsets pattern (TOOLSETS.md)

### Improvements
- Fixed TypeScript type errors in toolset implementation
- Updated server version displays to match package version
- Better structured codebase with logical tool groupings
- Improved error handling with standardized parameter validation

## 2.0.0 (2025-04-28)

### Breaking Changes
- Removed HTTP server transport completely
- Now using STDIO transport exclusively for all capabilities

### Changes
- Removed HTTP-related dependencies
- Simplified deployment model
- Added proper bin entry for CLI usage
- Improved test script with sequential lint, build, and test
- Updated documentation to clarify STDIO-only support

### Rationale
This major version update focuses on streamlining the MCP implementation by:
- Simplifying the codebase to use only STDIO transport
- Enabling better compatibility with services like Smithery (which handle HTTP transport)
- Reducing dependencies and complexity
- Making maintenance easier with a focused approach

## 1.0.0 (Initial Release)

### Features
- Support for both STDIO and HTTP transport methods
- Complete Audius Music platform integration
- Extensive tool set for track, user, and playlist management
- Comprehensive search capabilities
- Social features (follows, favorites, comments)
- Monetization tools for premium content
- Analytics and metrics collection
- Resource templates for structured data access
- Natural language prompt capabilities

## 2.0.0 (Date Unknown)

### Breaking Changes
- **Removed HTTP server implementation**: Simplified to STDIO transport only
- Removed HTTP-related dependencies (@types/body-parser, @types/express)

### Technical Changes
- Removed http-server.ts to focus exclusively on STDIO transport
- Updated index.ts with clarifying comments about STDIO transport usage
- The server now relies solely on STDIO transport for all capabilities

### Rationale
Using STDIO as the exclusive transport method:
- Simplifies the codebase and reduces dependencies
- Improves compatibility with MCP service providers like Smithery
- Makes maintenance easier by focusing on a single transport method
- All existing capabilities (tools, resources, prompts) remain fully functional