# Audius MCP Toolsets Implementation

This document describes the toolsets pattern implemented for the Audius MCP project, inspired by the GitHub MCP Server design pattern.

## Overview

The toolsets pattern organizes tools into logical groups, provides control over which tools are enabled, and adds the ability to restrict tools to read-only operations. This architecture improves:

1. **Organization** - Tools are grouped by functionality 
2. **Security** - Clear separation between read and write operations
3. **Control** - Granular enabling/disabling of toolsets
4. **Parameter Validation** - Consistent error handling and validation

## Core Components

### 1. Toolset

A `Toolset` represents a logical grouping of related tools (e.g., tracks, users, playlists). Each toolset:
- Has a name and description
- Can be enabled/disabled
- Can be set to read-only mode
- Contains separate collections for read and write tools

```typescript
// Example of a toolset
const trackTools = new Toolset('tracks', 'Audius Track-related tools');
  
trackTools.addReadTools(
  createServerTool('get-track', getTrackSchema, getTrack, true, 'Get track details by ID'),
  createServerTool('search-tracks', searchTracksSchema, searchTracks, true, 'Search for tracks by query')
);
```

### 2. ToolsetGroup

A `ToolsetGroup` manages multiple toolsets and provides methods to:
- Add toolsets
- Enable/disable toolsets
- Set read-only mode for all toolsets
- Register tools with the MCP server

```typescript
// Creating a toolset group
const toolsetGroup = new ToolsetGroup(readOnly);
toolsetGroup.addToolset(trackTools);
toolsetGroup.addToolset(userTools);
toolsetGroup.enableToolsets(['tracks', 'users']);
```

### 3. Parameter Validation Helpers

Parameter validation helpers provide consistent error handling and type checking for tool parameters:

```typescript
// Example parameter validation
const trackId = requiredParam<string>(args, 'trackId', 'string');
const limit = optionalNumberParam(args, 'limit', 10);
```

## Implementation Files

- **src/toolsets/core.ts**: Core toolset implementation
- **src/toolsets/index.ts**: Toolset definitions and registration
- **src/toolsets/params.ts**: Parameter validation helpers

## Usage

### Server Creation

The server now supports options for toolset control:

```typescript
const server = createServer({
  enabledToolsets: ['tracks', 'users', 'search'],
  readOnly: true
});
```

### Command Line Options

The server accepts command line options for toolset control:

```
node dist/index.js --read-only --toolsets=tracks,users,search
```

### Tool Implementation

Tool implementations can use the parameter validation helpers:

```typescript
export const getTrack = async (args: Record<string, any>) => {
  try {
    const trackId = requiredParam<string>(args, 'trackId', 'string');
    
    const audiusClient = AudiusClient.getInstance();
    const track = await audiusClient.getTrack(trackId);
    
    // ... rest of the implementation
  } catch (error) {
    // ... error handling
  }
};
```

## Benefits

1. **Modularity**: New toolsets can be added without modifying existing code
2. **Safer Operations**: Read-only mode for restricted environments
3. **Consistent Error Handling**: Parameter validation is standardized
4. **Selective Enabling**: Only enable the tools you need for specific use cases
5. **Better Organization**: Logical grouping makes the codebase more maintainable

## Future Enhancements

1. **Toolset Dependencies**: Allow toolsets to depend on other toolsets
2. **Dynamic Toolsets**: Support runtime enabling/disabling of toolsets
3. **Customized Messages**: Improved error messages specific to each tool
4. **Permission Levels**: More granular control beyond just read/write
5. **Telemetry**: Track tool usage and errors by toolset