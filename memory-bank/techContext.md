# Technical Context

## Technologies Used

### Core Technologies
- TypeScript/Node.js - Primary development language and runtime
- MCP SDK - For building the Model Context Protocol server
- Audius SDK - For interacting with the Audius platform

### Development Tools
- npm - Package management
- tsconfig.json - TypeScript configuration
- Docker - Containerization support

## Development Setup
The project uses a standard TypeScript/Node.js setup with the following structure:
- `/src` - Source code directory
- `/build` - Compiled JavaScript output
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `Dockerfile` - Container configuration

## Technical Constraints
1. Must follow MCP server protocol specifications
2. Must handle Audius SDK authentication properly
3. Must maintain proper error handling and type safety
4. Must operate within context window limitations when processing Audius SDK files

## Dependencies
Core dependencies include:
- @audius/sdk - Audius platform SDK
- @modelcontextprotocol/sdk - MCP server development kit

## Environment Configuration
- Uses .env.local for local environment variables
- Requires proper Audius API configuration
