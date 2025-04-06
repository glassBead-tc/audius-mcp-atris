import http from 'http'
import express from 'express'
import { URL } from 'url'
import { Readable } from 'stream'
import { AudiusClient } from './sdk-client.js'
import { fetchAudiusTrackStream } from './utils/fetchAudiusTrackStream.js'

/**
 * Class definition for MCP-compatible streaming tool
 */
class StreamTrackTool {
  static schema = {
    type: 'object',
    properties: {
      trackId: {
        type: 'string',
        description: 'Audius track ID to stream'
      },
      userId: {
        type: 'string',
        description: 'Optional user ID'
      },
      preview: {
        type: 'boolean',
        description: 'If true, stream a preview clip'
      },
      skipPlayCount: {
        type: 'boolean',
        description: 'If true, do not increment play count'
      }
    },
    required: ['trackId'],
    description: 'Streams raw audio bytes for a given Audius track ID. Provides an audio/mpeg stream URL.'
  }

  /**
   * Handle stream track tool execution
   */
  static async execute(args: {
    trackId: string,
    userId?: string,
    preview?: boolean,
    skipPlayCount?: boolean
  }) {
    try {
      // Generate a streamable URL
      const streamUrl = `${process.env.MCP_BASE_URL || 'http://localhost:7070'}/stream/${args.trackId}`;
      
      // Add any query parameters
      const urlObj = new URL(streamUrl);
      if (args.userId) urlObj.searchParams.set('userId', args.userId);
      if (args.preview) urlObj.searchParams.set('preview', 'true');
      if (args.skipPlayCount) urlObj.searchParams.set('skipPlayCount', 'true');
      
      const finalStreamUrl = urlObj.toString();
      
      // Return the stream URL in a format compatible with audio players
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            streamUrl: finalStreamUrl,
            contentType: 'audio/mpeg',
            trackId: args.trackId
          })
        }]
      };
    } catch (error: any) {
      console.error('Error in stream-track tool:', error);
      return {
        content: [{
          type: 'text',
          text: `Error creating stream URL: ${error.message || 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
}

/**
 * Create and configure a dedicated streaming server
 */
async function startStreamServer() {
  const audiusSdk = await AudiusClient.getInstance();
  
  // Create an Express app
  const app = express();
  
  // Set up streaming endpoint
  app.get('/stream/:trackId', async (req, res) => {
    try {
      const trackId = req.params.trackId;
      console.log(`Streaming request for track ${trackId}`);
      
      // Parse optional query parameters
      const userId = req.query.userId?.toString();
      const preview = req.query.preview === 'true';
      const skipPlayCount = req.query.skipPlayCount === 'true';
      
      // Get the stream from Audius
      const stream = await fetchAudiusTrackStream(audiusSdk, trackId, {
        userId,
        preview,
        skipPlayCount
      });
      
      // Set appropriate headers
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Transfer-Encoding': 'chunked'
      });
      
      // Handle different stream types
      if (
        stream &&
        typeof stream === 'object' &&
        'pipe' in stream &&
        typeof (stream as any).pipe === 'function'
      ) {
        // Node.js style ReadableStream
        const nodeStream = stream as NodeJS.ReadableStream
        nodeStream.pipe(res)
        nodeStream.on('error', (err: any) => {
          console.error('Stream error:', err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.end('Internal server error')
          } else {
            res.destroy(err)
          }
        })
      } else if (stream && typeof (Readable as any).fromWeb === 'function') {
        // Web streams API ReadableStream
        const nodeStream = Readable.fromWeb(stream as any)
        nodeStream.pipe(res)
        nodeStream.on('error', (err: any) => {
          console.error('Stream error:', err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.end('Internal server error')
          } else {
            res.destroy(err)
          }
        })
      } else {
        res.statusCode = 500
        res.end('Unsupported stream type')
      }
    } catch (err: any) {
      console.error('Error streaming track:', err);
      
      if (
        err.message &&
        (err.message.includes('not found') || err.message.includes('404'))
      ) {
        res.statusCode = 404
        res.end('Track not found')
      } else {
        console.error('Error fetching stream:', err)
        res.statusCode = 500
        res.end('Internal server error')
      }
    }
  });

  // Add healthcheck endpoint
  app.get('/healthcheck', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'audius-streaming-mcp' });
  });
  
  // Add tool endpoint
  app.post('/tool/stream-track', express.json(), async (req, res) => {
    try {
      const result = await StreamTrackTool.execute(req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Error executing stream-track tool:', error);
      res.status(500).json({
        content: [{
          type: 'text',
          text: `Error: ${error.message || 'Unknown error'}`
        }],
        isError: true
      });
    }
  });
  
  // Set up standalone HTTP server for streaming
  const httpServer = http.createServer(app);
  
  const port = process.env.STREAM_SERVER_PORT
    ? parseInt(process.env.STREAM_SERVER_PORT, 10)
    : 7070;

  // Start the server
  httpServer.listen(port, () => {
    console.log(`Audius Stream Server listening on port ${port}`);
    console.log(`Stream URL format: http://localhost:${port}/stream/:trackId`);
    console.log(`API endpoints:`);
    console.log(`  - /healthcheck - Server health status`);
    console.log(`  - /tool/stream-track - Streaming tool API`);
  });
  
  return httpServer;
}

// Start the streaming server when this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startStreamServer().catch((err) => {
    console.error('Failed to start stream server:', err);
    process.exit(1);
  });
}

export { startStreamServer, StreamTrackTool };