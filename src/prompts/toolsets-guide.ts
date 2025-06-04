import { PromptResult } from '@modelcontextprotocol/sdk/types.js';
import { initToolsets } from '../toolsets/index.js';

/**
 * Handle the toolsets-guide prompt - explains available toolsets and how to use them
 */
export async function handleToolsetsGuidePrompt(): Promise<PromptResult> {
  // Get all toolsets for documentation
  const toolsetGroup = initToolsets(['all'], false);
  const toolsets = toolsetGroup.getAllToolsets();
  
  let guide = `# Audius MCP Server Toolsets Guide

This server organizes its functionality into toolsets - logical groups of related tools. You can use specific toolsets based on your needs.

## Available Toolsets

`;

  // Document each toolset
  for (const [name, toolset] of toolsets) {
    const readTools = toolset.getReadTools();
    const writeTools = toolset.getWriteTools();
    const totalTools = readTools.size + writeTools.size;
    
    guide += `### ${name}
**Description**: ${toolset.description}
**Total Tools**: ${totalTools} (${readTools.size} read, ${writeTools.size} write)

`;

    if (readTools.size > 0) {
      guide += `**Read Operations**:\n`;
      for (const [toolName, tool] of readTools) {
        guide += `- \`${toolName}\`: ${tool.description}\n`;
      }
      guide += '\n';
    }

    if (writeTools.size > 0) {
      guide += `**Write Operations**:\n`;
      for (const [toolName, tool] of writeTools) {
        guide += `- \`${toolName}\`: ${tool.description}\n`;
      }
      guide += '\n';
    }
  }

  guide += `## Usage Tips

1. **Read-Only Mode**: If the server is in read-only mode, only read operations will be available.

2. **Toolset Selection**: The server administrator can enable specific toolsets. If you don't see a tool you expect, it may be disabled.

3. **Tool Naming**: Tools follow a consistent naming pattern:
   - Read operations: \`get-*\`, \`search-*\`, \`is-*\`
   - Write operations: \`create-*\`, \`update-*\`, \`delete-*\`, \`send-*\`

4. **Common Patterns**:
   - Use \`search-*\` tools to find content by query
   - Use \`get-*\` tools to fetch specific items by ID
   - Use \`get-bulk-*\` tools to fetch multiple items at once
   - Use \`get-trending-*\` tools to discover popular content

5. **Entity IDs**: Most tools require entity IDs (track ID, user ID, playlist ID). You can:
   - Use search tools to find IDs
   - Use the \`resolve\` tool to convert Audius URLs to IDs
   - Get IDs from previous tool responses

## Examples

**Finding and playing a track**:
1. Use \`search-tracks\` to find tracks by name/artist
2. Use \`get-track\` with the ID to get full details
3. Use \`get-track-stream-url\` to get a playable URL

**Exploring an artist**:
1. Use \`search-users\` to find the artist
2. Use \`get-user-tracks\` to see their music
3. Use \`get-user-albums\` to see their albums
4. Use \`user-followers\` to see their fanbase

**Creating content** (if write access enabled):
1. Use \`upload-track\` to add new music
2. Use \`create-playlist\` to organize tracks
3. Use \`follow-user\` to connect with artists`;

  return {
    text: guide,
    metadata: {
      toolsetsCount: toolsets.size,
      totalToolsCount: Array.from(toolsets.values()).reduce(
        (sum, ts) => sum + ts.getReadTools().size + ts.getWriteTools().size, 
        0
      )
    }
  };
}