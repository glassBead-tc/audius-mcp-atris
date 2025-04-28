// Audius MCP HTTP streaming server wrapper
// Provides an Express.js server exposing StreamableHTTP endpoints for the MCP protocol
//
// Usage example (streaming response):
// curl -N -X POST -H "Content-Type: application/json" -d '{"toolName":"search-tracks","params":{"query":"lofi","limit":2}}' http://localhost:3000/stream-tool
//
// This will stream incremental tool output (currently full response at once)
//
// To extend: support incremental streaming for tools that yield/generate partial outputs

import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamable-http.js';
import { InitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createServer } from './server.js';
import { config } from './config.js';

const app = express();
app.use(express.json());

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Function to check if a request is an initialize request
function isInitializeRequest(request: any): request is InitializeRequest {
  return request?.method === 'initialize' && request?.jsonrpc === '2.0';
}

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  // Check for existing session ID
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports[sessionId] = transport;
        console.error(`New session initialized: ${sessionId}`);
      }
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        console.error(`Session closed: ${transport.sessionId}`);
        delete transports[transport.sessionId];
      }
    };
    
    // Create and connect the MCP server
    const server = createServer();
    await server.connect(transport);
    
    console.error(`New MCP server created for session`);
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  // Handle the request
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);

// Basic health check
app.get('/', (req, res) => {
  res.send('Audius MCP Streamable HTTP server is running');
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.error(`Audius MCP Streamable HTTP server listening on port ${port}`);
});

/**
 * Notes:
 * - This implements the MCP Streamable HTTP transport with session management
 * - The server uses a single endpoint (/mcp) that supports POST, GET, and DELETE methods
 * - Session management is handled with the mcp-session-id header
 * - Notifications are delivered via SSE through the GET endpoint
 * - DELETE is used for explicit session termination
 */