# Changelog

All notable changes to the audius-mcp-atris package will be documented in this file.

## [1.1.3] - 2025-04-13

### Changed
- Version bump for release sweep: all version references updated to 1.1.3 for consistency.
- Final audit: confirmed docs, ignore files, and config patterns are correct.
- Major documentation overhaul: README, LLM-GUIDE, CLAUDE.md, and .env.example improved for clarity, security, and developer/LLM experience.
- Tool summary table, security best practices, and explicit config/CLI docs added.
- Smithery config and example config aligned with documentation.
- .npmignore and .gitignore simplified and hardened.
- Test plan and examples updated for new features and workflows.
- Audio streaming server integration and startup process improved.
- All MCP/Smithery/NPM deployment instructions validated and clarified.

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