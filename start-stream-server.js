/**
 * Startup script for the Audius streaming MCP server
 * 
 * This script can be used to start the streaming server independently,
 * but normally the streaming server is started automatically when the 
 * main MCP server starts.
 */

// Try to load from either the compiled dist directory or directly from src
async function startServer() {
  console.log('Starting Audius Streaming Server...');
  console.log('Note: This server is normally started automatically with the main MCP server.');
  
  try {
    const { startStreamServer } = await import('./build/src/stream-server.js');
    console.log('Starting stream server from compiled code (build/src)');
    await startStreamServer();
  } catch (err1) {
    try {
      console.log('Compiled code not found, trying to load from source directory');
      const { startStreamServer } = await import('./src/stream-server.ts');
      await startStreamServer();
    } catch (err2) {
      console.error('Failed to start stream server:');
      console.error('Error from build:', err1);
      console.error('Error from src:', err2);
      process.exit(1);
    }
  }
}

startServer();