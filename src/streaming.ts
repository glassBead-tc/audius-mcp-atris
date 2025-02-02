import { sdk } from '@audius/sdk';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';

/**
 * Manages audio streaming for the Audius MCP server
 */
export class StreamingManager {
  private audiusSdk: ReturnType<typeof sdk>;
  private app: express.Application;

  constructor(audiusSdk: ReturnType<typeof sdk>) {
    this.audiusSdk = audiusSdk;
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes() {
    // SSE endpoint
    this.app.get('/stream/:trackId', async (req: express.Request, res: express.Response) => {
      const { trackId } = req.params;

      try {
        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Get stream URL from Audius
        const streamUrl = await this.audiusSdk.tracks.getTrackStreamUrl({ trackId });
        
        // Fetch the audio stream
        const audioResponse = await fetch(streamUrl);
        if (!audioResponse.ok || !audioResponse.body) {
          throw new Error('Failed to fetch audio stream');
        }

        // Set audio content type
        res.setHeader('Content-Type', 'audio/mpeg');

        // Stream the audio data
        const reader = audioResponse.body.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Write chunk to response
          res.write(value);
        }

        res.end();

      } catch (error) {
        res.status(500).send({
          error: `Failed to start stream: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    });
  }

  /**
   * Start the streaming server
   */
  async start(port: number = 3000) {
    return new Promise<void>((resolve, reject) => {
      try {
        this.app.listen(port, () => {
          console.log(`Streaming server running on port ${port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the streaming server
   */
  async stop() {
    // Cleanup if needed
  }
}
