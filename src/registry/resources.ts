import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AudiusConfig } from '../schemas/config.schema.js';

// Import resource handlers
import { handleTrackResource } from '../resources/tracks.js';
import { handleUserResource } from '../resources/users.js';
import { handlePlaylistResource, handleAlbumResource } from '../resources/playlists.js';

/**
 * Register all resources with the MCP server
 */
export function registerResources(server: McpServer, config: AudiusConfig): void {
  // Track resource
  server.resource(
    'track',
    new ResourceTemplate('audius://track/{id}', { list: undefined }),
    handleTrackResource
  );
  
  // User resource
  server.resource(
    'user',
    new ResourceTemplate('audius://user/{id}', { list: undefined }),
    handleUserResource
  );
  
  // Playlist resource
  server.resource(
    'playlist',
    new ResourceTemplate('audius://playlist/{id}', { list: undefined }),
    handlePlaylistResource
  );
  
  // Album resource
  server.resource(
    'album',
    new ResourceTemplate('audius://album/{id}', { list: undefined }),
    handleAlbumResource
  );
}