# Changelog

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