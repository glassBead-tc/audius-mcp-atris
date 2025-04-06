# Changelog

All notable changes to the audius-mcp-atris package will be documented in this file.

## [1.1.1] - 2025-04-06

### Fixed
- Improved stream server integration with main MCP server
- TypeScript fixes for Express app access

## [1.1.0] - 2025-04-06

### Added
- Audio streaming functionality:
  - Dedicated streaming server on port 7070
  - New `stream-track` tool for MCP clients
  - Direct HTTP streaming endpoint for audio content
  - Streaming server is automatically started with the main MCP server

### Changed
- Simplified startup process to launch both servers together
- Updated documentation to reflect new audio streaming capabilities

## [1.0.1] - 2025-04-05

### Added
- Social engagement features
- Purchase and tipping functionality
- Deployed npm package to registry

## [1.0.0] - 2025-04-04

### Added
- Initial release
- Basic MCP server implementation
- Track, user, and playlist tools
- Resource access for Audius content
- Natural language prompts for music discovery and analysis