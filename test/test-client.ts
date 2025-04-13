#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { z } from 'zod';

// Use the transport without explicitly referring to ClientTransport interface
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, '..', 'build', 'debug.js');

async function main() {
  console.log('Starting test client...');
  
  // Spawn the MCP server process
  const serverProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: process.env,
  });
  
  // Wait for a moment to ensure the server is started
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('Creating client transport...');
  
  // Create a client transport connected to the server process
  // StdioClientTransport expects StdioServerParameters
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: process.env as Record<string, string>,
    // stderr: 'inherit' is the default, so we don't need to specify it
  });
  
  console.log('Creating client...');
  // Create an MCP client with implementation info
  const client = new Client({ name: "test-client", version: "1.0.0" });
  
  console.log('Connecting to server...');
  // Connect the client to the transport
  await client.connect(transport);
  
  console.log('Connecting to server...');
  
  try {
    console.log('Connected successfully!');
    
    // List available tools
    console.log('Getting list of tools...');
    // Define a schema for the list_tools response (array of objects with at least a name property)
    const listToolsSchema = z.array(z.object({
      name: z.string(),
      // Add more fields as needed based on your tool definition
    }).passthrough());

    const toolsResponse = await client.request(
      { method: 'list_tools', params: {} },
      listToolsSchema
    );
    console.log('Available tools:', JSON.stringify(toolsResponse, null, 2));
    
    // Test search-tracks tool
    console.log('\nTesting search-tracks tool...');
    try {
      // Define a generic schema for tool results (can be refined if you know the structure)
      const toolResultSchema = z.any();

      const searchResult = await client.request(
        {
          method: 'call_tool',
          params: {
            name: 'search-tracks',
            arguments: {
              query: 'test',
              limit: 3
            }
          }
        },
        toolResultSchema
      );
      console.log('Search tracks result:', JSON.stringify(searchResult, null, 2));
    } catch (error) {
      console.error('Error testing search-tracks:', error);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('Closing connection...');
    await client.close();
    
    console.log('Terminating server process...');
    serverProcess.kill();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});