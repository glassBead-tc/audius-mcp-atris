import { McpError, ErrorCode, ServerResult } from "@modelcontextprotocol/sdk/types.js";
import { optimizeResponse, CommonFilters } from "../utils/response-optimizer.js";
import { ManagerFactory } from "../managers/manager-factory.js";
import { sdk } from '@audius/sdk';
import { BaseManager } from "../managers/base-manager.js";
import { AudiusTrack, AudiusTrackResponse } from "../types/api-responses.js";
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

  async getTrack(args: unknown): Promise<ServerResult> {
    const { trackId } = GetTrackSchema.parse(args);
    
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
