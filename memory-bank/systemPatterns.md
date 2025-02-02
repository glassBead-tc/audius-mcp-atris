# System Patterns

## Architecture Overview
The system follows a modular architecture with clear separation of concerns:

### Core Components
1. MCP Server Layer
   - Handles MCP protocol communication
   - Manages tool and resource registration
   - Processes requests and responses

2. Audius Integration Layer
   - Manages Audius SDK initialization
   - Handles authentication and session management
   - Wraps SDK functionality in MCP-compatible interfaces

3. Error Handling Layer
   - Standardized error handling patterns
   - Error translation between Audius and MCP formats
   - Consistent error reporting

## Key Technical Decisions

### 1. File Organization
- `src/index.ts` - Main MCP server setup and configuration
- `src/auth.ts` - Authentication handling
- `src/utils.ts` - Shared utilities
- `src/error-handling.ts` - Error management
- `src/trending.ts` - Trending content management with pagination

### 2. Authentication Pattern
- Server-Side Authentication:
  - Uses API key/secret authentication via environment variables
  - SDK initialized with AUDIUS_API_KEY and AUDIUS_AUTH_SECRET
  - No OAuth needed as this is a backend service
  
- Client Authentication:
  - Server acts as a proxy, exposing Audius functionality through MCP tools
  - Clients must provide their own authentication when using the server
  - OAuth implementation is left to clients as needed

- Wallet Management:
  - Separated from authentication concerns
  - Handled by WalletManager class in auth.ts
  - Focuses on wallet operations and connections

### 3. Tool Implementation Pattern
Each MCP tool should:
- Have clear input/output schemas
- Include proper error handling
- Provide meaningful descriptions
- Follow consistent naming conventions

### 4. Resource Implementation Pattern
Resources should:
- Use clear URI patterns
- Include proper MIME types
- Provide meaningful metadata
- Follow consistent naming conventions

### 5. Pagination Pattern
When SDK endpoints don't support direct pagination:
1. Create a dedicated manager class (e.g., TrendingManager)
2. Fetch full dataset from SDK
3. Implement client-side pagination:
   - Accept limit and offset parameters
   - Default to reasonable chunk size (e.g., 10)
   - Slice results based on pagination parameters
   - Return metadata (total, count, offset, limit)
4. Handle errors appropriately
5. Document pagination implementation in manager class

## Caching Architecture
1. Cache Manager Pattern
   - Singleton pattern for global cache access
   - Modular design supporting multiple cache types
   - Built-in monitoring and statistics
   - Automatic cleanup and TTL support

2. Stream URL Caching
   - LRU (Least Recently Used) implementation
   - Configurable cache size and TTL
   - Automatic expiration handling
   - Cache hit/miss tracking
   - Memory-efficient storage

3. Cache Implementation Details
   - Generic cache interface for extensibility
   - Type-safe implementations
   - Built-in statistics gathering
   - Automatic resource cleanup

## Code Style Guidelines
1. Use TypeScript for type safety
2. Follow async/await patterns
3. Implement proper error handling
4. Use meaningful variable and function names
5. Include JSDoc comments for public interfaces
