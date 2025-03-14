#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

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
  // Create an MCP client
  const client = new Client(transport);
  
  console.log('Starting transport...');
  // The StdioClientTransport needs to be started
  await transport.start();
  
  console.log('Connecting to server...');
  
  try {
    console.log('Connected successfully!');
    
    // List available tools
    console.log('Getting list of tools...');
    const toolsResponse = await client.request({
      method: 'list_tools',
      params: {}
    });
    console.log('Available tools:', JSON.stringify(toolsResponse, null, 2));
    
    // Test search-tracks tool
    console.log('\nTesting search-tracks tool...');
    try {
      const searchResult = await client.request({
        method: 'call_tool',
        params: {
          name: 'search-tracks',
          arguments: {
            query: 'test',
            limit: 3
          }
        }
      });
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