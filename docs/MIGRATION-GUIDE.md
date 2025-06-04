# Migration Guide: v2.2.0 to v2.3.0

This guide helps you migrate from Atris MCP v2.2.0 to v2.3.0, which introduces the Smithery SDK integration.

## Overview

Version 2.3.0 introduces the Smithery SDK for improved HTTP transport capabilities while maintaining full backward compatibility with STDIO transport. The migration is designed to be seamless for most users.

## Breaking Changes

### Node.js Version Requirement
- **Previous**: Node.js 16+
- **Now**: Node.js 18+ (required for ES modules support)
- **Action**: Update your Node.js version to 18.0.0 or higher

## Non-Breaking Changes

### STDIO Transport (Claude Desktop users)
No changes required! The STDIO transport continues to work exactly as before. Your existing configuration will work without modification.

### HTTP Transport
The HTTP transport has been significantly improved with the Smithery SDK integration:

#### Previous Behavior (v2.2.0)
```bash
# Simple HTTP server with environment-based config
PORT=3000 npm start
```

#### New Behavior (v2.3.0)
```bash
# HTTP server with stateful sessions (default)
MCP_TRANSPORT=http npm start

# HTTP server in stateless mode
MCP_TRANSPORT=http MCP_MODE=stateless npm start
```

## Upgrade Steps

### 1. Update Node.js
Ensure you have Node.js 18 or higher:
```bash
node --version  # Should output v18.0.0 or higher
```

### 2. Update the Package
```bash
npm update audius-mcp-atris
# or
npm install audius-mcp-atris@latest
```

### 3. Update Configuration (HTTP users only)

#### For Smithery Deployment
The `smithery.yaml` configuration now references a Zod schema:

**Old format:**
```yaml
runtime: "typescript"
startCommand:
  type: "http"
  configSchema:
    type: "object"
    properties:
      apiKey:
        type: "string"
      # ... manual schema definition
```

**New format:**
```yaml
runtime: "node"
startCommand:
  type: "http"
  cmd: ["npm", "run", "start:http"]
configSchema:
  $ref: "./src/schemas/config.schema.ts#AudiusConfigSchema"
```

#### For Local HTTP Development
No changes required. The server automatically detects HTTP mode when `MCP_TRANSPORT=http` is set.

### 4. New Configuration Options

The following configuration options are now available:

```typescript
{
  apiKey?: string;          // Audius API key
  apiSecret?: string;       // Audius API secret
  apiHost?: string;         // Custom API host
  environment?: "production" | "staging" | "development";
  appName?: string;         // Custom app name
  readOnly?: boolean;       // Enable read-only mode
  enabledToolsets?: string[]; // Specific toolsets to enable
}
```

## New Features

### 1. Session Management (HTTP)
HTTP mode now supports stateful sessions by default, allowing for better performance and state persistence across requests.

### 2. Runtime Configuration
Configure the server dynamically via:
- Query parameters: `?config.apiKey=xxx&config.readOnly=true`
- Smithery platform configuration
- Environment variables (backward compatible)

### 3. Type-Safe Configuration
All configuration is now validated using Zod schemas, providing better error messages and type safety.

### 4. Improved Error Handling
More descriptive error messages and validation feedback.

## Troubleshooting

### Issue: "Cannot find module" errors
**Solution**: Ensure you've run `npm install` after updating and that you're using Node.js 18+.

### Issue: "okay-error" module errors
**Solution**: This is automatically handled by the package's postinstall script. If you see this error, try:
```bash
npm run postinstall
```

### Issue: HTTP server not starting
**Solution**: Ensure you're using the correct environment variable:
```bash
# Correct
MCP_TRANSPORT=http npm start

# Incorrect (old way)
PORT=3000 npm start  # Still works but deprecated
```

### Issue: Configuration not being applied
**Solution**: Check that your configuration matches the new schema. Invalid configurations will be rejected with clear error messages.

## Rollback Instructions

If you need to rollback to v2.2.0:

```bash
npm install audius-mcp-atris@2.2.0
```

Note: You may need to downgrade Node.js to version 16 if you experience issues.

## Support

For issues or questions:
1. Check the [README](README.md) for updated documentation
2. Open an issue on [GitHub](https://github.com/glassBead/audius-mcp-atris)
3. Review the [example configurations](smithery.yaml) for common setups

## What's Next

Future versions will continue to improve the HTTP transport and may add:
- OAuth authentication support
- WebSocket transport option
- Enhanced metrics and monitoring
- Additional session storage options