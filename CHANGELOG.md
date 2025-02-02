# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.4] - 2025-02-02

### Fixed
- Fixed authentication issues with Audius SDK:
  - Updated environment variable from AUDIUS_AUTH_SECRET to AUDIUS_API_SECRET
  - Removed custom discovery node configuration to use SDK's built-in node selection
  - Fixed streaming authentication for public tracks
  - Fixed discovery node selection and health checks

## [1.1.0] - 2025-02-02

### Added
- Claude Desktop streaming support
  - Added range request support for seeking
  - Return both proxy and direct URLs in get-track-stream
  - Added STREAMING_PORT environment variable for configurable port
  - Added ALLOWED_ORIGINS environment variable for CORS configuration

### Enhanced
- Improved streaming server reliability:
  - Added proper lifecycle management with graceful shutdown
  - Implemented connection tracking and cleanup
  - Added port conflict resolution with automatic retry
  - Configured rate limiting (60 requests/minute)
  - Added cleanup timeout for hanging connections
  - Changed default streaming port to 3333 to avoid conflicts
  - Improved range request handling with better validation
  - Added proper error handling for malformed range headers
  - Fixed CORS headers consistency
  - Added Content-Range validation
  - Enhanced backpressure handling and stream monitoring
  - Improved error handling and logging

## [1.0.10] - Previous Version

Initial tracked version
