import { McpError, ErrorCode, ServerResult } from "@modelcontextprotocol/sdk/types.js";
import { optimizeResponse, CommonFilters } from "../utils/response-optimizer.js";
import { ManagerFactory } from "../managers/manager-factory.js";
import { sdk } from '@audius/sdk';
import { BaseManager } from "../managers/base-manager.js";
import { AudiusTrack, AudiusTrackResponse } from "../types/api-responses.js";
import { isTestTrackId, getTestTrack, getAllTestTracks, TestTrack } from "../config/test-tracks.js";
import * as path from 'path';
import * as fs from 'fs';
import {
  GetTrackSchema,
  GetTrackStreamSchema,
  GetTrackCommentsSchema,
  SearchTracksSchema,
  FavoriteTrackSchema,
  UnfavoriteTrackSchema,
  GetTrackPriceSchema,
  PurchaseTrackSchema,
  VerifyPurchaseSchema,
  TrackStats
} from "../schemas/track-schemas.js";

export class TrackHandlers extends BaseManager {
  private managerFactory: ManagerFactory;

  constructor(audiusSdk: ReturnType<typeof sdk>, managerFactory: ManagerFactory) {
    super(audiusSdk);
    this.managerFactory = managerFactory;
  }

  private isTestMode = true; // TODO: Make this configurable

  private convertTestTrackToAudiusFormat(track: TestTrack): AudiusTrack {
    return {
      id: track.id,
      title: track.title,
      user: {
        id: "test-artist",
        name: track.artist,
        handle: track.artist.toLowerCase().replace(/\s+/g, '-'),
      },
      play_count: 0,
      repost_count: 0,
      save_count: 0
    };
  }

  async getTrack(args: unknown): Promise<ServerResult> {
    const { trackId } = GetTrackSchema.parse(args);
    
    if (this.isTestMode && isTestTrackId(trackId)) {
      const testTrack = getTestTrack(trackId);
      if (!testTrack) {
        throw new McpError(ErrorCode.InvalidRequest, `Test track not found: ${trackId}`);
      }
      const response = {
        data: this.convertTestTrackToAudiusFormat(testTrack)
      };
      return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
    }

    const response = await this.executeWithTimeout(
      `track:${trackId}`,
      () => this.audiusSdk.tracks.getTrack({ trackId }),
      {
        timeout: 10000,
        useCache: true,
        cacheTtl: 300000 // 5 minutes
      }
    );

    const optimizedResponse = response.data ? optimizeResponse(response.data as object, {
      filter: CommonFilters.track.basic
    }) : null;
    
    return { content: [{ type: "text", text: JSON.stringify(optimizedResponse || response, null, 2) }] };
  }

  async getTrackStream(args: unknown): Promise<ServerResult> {
    const { trackId } = GetTrackStreamSchema.parse(args);
    
    if (this.isTestMode && isTestTrackId(trackId)) {
      const testTrack = getTestTrack(trackId);
      if (!testTrack) {
        throw new McpError(ErrorCode.InvalidRequest, `Test track not found: ${trackId}`);
      }
      return { 
        content: [{ 
          type: "text", 
          text: `Opening "${testTrack.title}" by ${testTrack.artist}" in your browser's audio player...`
        }],
        command: `open ${testTrack.url}`
      };
    }

    const streamingManager = this.managerFactory.getStreamingManager();
    const trackDetails = await this.executeWithTimeout(
      `track:${trackId}`,
      () => this.audiusSdk.tracks.getTrack({ trackId }),
      { timeout: 10000 }
    );
    
    // Start streaming server if not already running
    if (!streamingManager.isRunning()) {
      await streamingManager.start();
    }
    
    return { 
      content: [{ 
        type: "text", 
        text: `Opening "${trackDetails.data?.title}" by ${trackDetails.data?.user?.name}" in your browser's audio player...`
      }],
      command: `open http://localhost:${streamingManager.getPort()}/play/${trackId}`
    };
  }

  async getTestTracks(): Promise<ServerResult> {
    if (!this.isTestMode) {
      throw new McpError(ErrorCode.InvalidRequest, "Test mode is not enabled");
    }

    const tracks = getAllTestTracks().map(track => this.convertTestTrackToAudiusFormat(track));
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ data: tracks }, null, 2)
      }]
    };
  }

  serveTestAudio(trackId: string): string {
    if (!this.isTestMode || !isTestTrackId(trackId)) {
      throw new McpError(ErrorCode.InvalidRequest, "Invalid test track request");
    }

    const testTrack = getTestTrack(trackId);
    if (!testTrack) {
      throw new McpError(ErrorCode.InvalidRequest, `Test track not found: ${trackId}`);
    }

    const audioPath = path.join(process.cwd(), 'test-audio', path.basename(testTrack.url));
    if (!fs.existsSync(audioPath)) {
      throw new McpError(ErrorCode.InternalError, `Test audio file not found: ${audioPath}`);
    }

    return audioPath;
  }

  async getTrackComments(args: unknown): Promise<ServerResult> {
    const { trackId, limit, offset } = GetTrackCommentsSchema.parse(args);
    
    const response = await this.executeWithTimeout(
      `track:${trackId}:comments`,
      () => this.audiusSdk.tracks.trackComments({ trackId, limit, offset }),
      {
        timeout: 10000,
        useCache: true,
        cacheTtl: 60000 // 1 minute
      }
    );

    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }

  async searchTracks(args: unknown): Promise<ServerResult> {
    const { query } = SearchTracksSchema.parse(args);
    
    const response = await this.executeWithTimeout(
      `tracks:search:${query}`,
      () => this.audiusSdk.tracks.searchTracks({ query }),
      {
        timeout: 15000,
        useCache: true,
        cacheTtl: 300000 // 5 minutes
      }
    );

    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }

  async favoriteTrack(args: unknown): Promise<ServerResult> {
    const { userId, trackId } = FavoriteTrackSchema.parse(args);
    
    const response = await this.executeWithTimeout(
      `track:${trackId}:favorite`,
      () => this.audiusSdk.tracks.favoriteTrack({ userId, trackId }),
      { 
        timeout: 10000,
        useCache: false
      }
    );

    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }

  async unfavoriteTrack(args: unknown): Promise<ServerResult> {
    const { userId, trackId } = UnfavoriteTrackSchema.parse(args);
    
    const response = await this.executeWithTimeout(
      `track:${trackId}:unfavorite`,
      () => this.audiusSdk.tracks.unfavoriteTrack({ userId, trackId }),
      { 
        timeout: 10000,
        useCache: false
      }
    );

    return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
  }

  async getTrackStats(trackId: string): Promise<TrackStats> {
    const track = await this.executeWithTimeout<AudiusTrackResponse>(
      `track:${trackId}:stats`,
      () => this.audiusSdk.tracks.getTrack({ trackId }) as Promise<AudiusTrackResponse>,
      {
        timeout: 10000,
        useCache: true,
        cacheTtl: 300000 // 5 minutes
      }
    );

    if (!track || !track.data) {
      throw new McpError(ErrorCode.InvalidRequest, `Track not found: ${trackId}`);
    }

    return {
      title: track.data.title || '',
      artist: track.data.user?.handle || '',
      playCount: track.data.play_count || 0,
      repostCount: track.data.repost_count || 0,
      favoriteCount: track.data.save_count || 0,
      timestamp: new Date().toISOString()
    };
  }
}
