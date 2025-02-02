#!/usr/bin/env node
import { config } from 'dotenv';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
  ServerResult,
} from "@modelcontextprotocol/sdk/types.js";
import { sdk, UserResponse, TrackResponse } from '@audius/sdk';

interface AudiusUser extends UserResponse {
  id: string;
  handle: string;
  name: string;
  followers_count: number;
  track_count: number;
}

interface AudiusTrack extends TrackResponse {
  id: string;
  title: string;
  user: {
    id: string;
    handle: string;
  };
  play_count: number;
  repost_count: number;
  save_count: number;
}
import { z } from "zod";
import { zodToJsonSchema } from 'zod-to-json-schema';
import { WalletManager } from "./auth.js";
import { PurchaseManager } from "./purchase.js";
import { TipManager } from "./tip.js";
import { ChallengeManager } from "./challenges.js";
import { CommentManager } from "./comments.js";
import { ResolveManager, ResolveUrlSchema } from "./resolve.js";
import { UserExtendedManager, GetUserExtendedProfileSchema } from "./user-extended.js";
import { TrackExtendedManager, GetTrackExtendedDataSchema, GetTrackTopListenersSchema, GetTrackCommentsExtendedSchema } from "./track-extended.js";
import { TrendingManager, GetTrendingTracksSchema, GetTrendingPlaylistsSchema, GetTrendingUsersSchema } from "./trending.js";
import { AnalyticsManager, GetGenrePopularitySchema, GetMoodPopularitySchema } from "./analytics.js";
import { AnalyzeTrendingTracksSchema } from "./trending-analytics.js";
import { StreamingManager } from "./streaming.js";
import { AudioPlayerManager } from "./audio-player.js";

// Load environment variables
config({ path: '.env.local' });

const API_KEY = process.env.AUDIUS_API_KEY;
const API_SECRET = process.env.AUDIUS_API_SECRET;

if (!API_KEY) {
  throw new Error('AUDIUS_API_KEY environment variable is required');
}

// Initialize Audius SDK with API key and optional API secret
const audiusSdk = sdk({
  appName: "mcp-audius",
  apiKey: API_KEY,
  ...(API_SECRET && { apiSecret: API_SECRET }),
  environment: "production"
});

// Initialize managers
const walletManager = new WalletManager(audiusSdk);
const purchaseManager = new PurchaseManager(audiusSdk, walletManager);
const tipManager = new TipManager(audiusSdk, walletManager);
const challengeManager = new ChallengeManager(audiusSdk);
const commentManager = new CommentManager(audiusSdk);
const resolveManager = new ResolveManager(audiusSdk);
const userExtendedManager = new UserExtendedManager(audiusSdk);
const trackExtendedManager = new TrackExtendedManager(audiusSdk);
const trendingManager = new TrendingManager(audiusSdk);
const analyticsManager = new AnalyticsManager(audiusSdk);
const streamingManager = new StreamingManager(audiusSdk, walletManager);
const audioPlayerManager = new AudioPlayerManager();

// Common Types
const HashIdSchema = z.string().describe("Audius ID - A unique identifier for an Audius resource");

// Audio Player Schemas
const PlayAudioSchema = z.object({
  data: z.string().describe("Base64 encoded audio data"),
}).describe("Play audio data using system audio");

// User Schemas
const GetUserSchema = z.object({
  userId: HashIdSchema,
}).describe("Get detailed information about a specific Audius user including their profile, stats, and verification status");

const GetUserByHandleSchema = z.object({
  handle: z.string().describe("The user's handle/username without the @ symbol"),
}).describe("Look up an Audius user by their handle (username). Returns the same information as get-user");

const SearchUsersSchema = z.object({
  query: z.string().describe("Search term to find users - can include partial names or handles"),
}).describe("Search for Audius users by name or handle. Returns a list of matching users with basic profile information");

const FollowUserSchema = z.object({
  userId: HashIdSchema.describe("ID of the user who will follow"),
  followeeUserId: HashIdSchema.describe("ID of the user to be followed"),
}).describe("Make one user follow another user. The userId is the follower, followeeUserId is the user being followed");

const UnfollowUserSchema = z.object({
  userId: HashIdSchema.describe("ID of the user who will unfollow"),
  followeeUserId: HashIdSchema.describe("ID of the user to be unfollowed"),
}).describe("Remove a follow relationship between users. The userId is the unfollower, followeeUserId is the user being unfollowed");

const GetUserFollowersSchema = z.object({
  userId: HashIdSchema.describe("ID of the user whose followers you want to retrieve"),
  limit: z.number().optional().describe("Maximum number of followers to return (default: 100)"),
  offset: z.number().optional().describe("Number of followers to skip for pagination"),
}).describe("Get a paginated list of users who follow the specified user. Use limit and offset for pagination");

const GetUserFollowingSchema = z.object({
  userId: HashIdSchema,
  limit: z.number().optional(),
  offset: z.number().optional(),
}).describe("Get users that a user is following");


const GetRelatedArtistsSchema = z.object({
  userId: HashIdSchema,
  limit: z.number().optional(),
  offset: z.number().optional(),
}).describe("Get related artists for a given user");

const GetUserTracksSchema = z.object({
  userId: HashIdSchema,
  limit: z.number().optional(),
  offset: z.number().optional(),
  sort: z.enum(['date', 'plays']).optional(),
  sortMethod: z.enum(['title', 'artist_name', 'release_date', 'last_listen_date', 'added_date', 'plays', 'reposts', 'saves', 'most_listens_by_user']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  filterTracks: z.enum(['all', 'public', 'unlisted']).optional(),
}).describe("Get tracks created by a user");

const GetUserFavoritesSchema = z.object({
  userId: HashIdSchema,
}).describe("Get a user's favorite tracks");

const GetUserRepostsSchema = z.object({
  userId: HashIdSchema,
  limit: z.number().optional(),
  offset: z.number().optional(),
}).describe("Get a user's reposts");

// Track Schemas
const GetTrackSchema = z.object({
  trackId: HashIdSchema,
}).describe("Get track details");

const GetTrackStreamSchema = z.object({
  trackId: HashIdSchema,
}).describe("Get track stream URL and SSE endpoint");

const GetTrackCommentsSchema = z.object({
  trackId: HashIdSchema,
  limit: z.number().optional(),
  offset: z.number().optional(),
}).describe("Get comments on a track");

const SearchTracksSchema = z.object({
  query: z.string(),
}).describe("Search for tracks");


const FavoriteTrackSchema = z.object({
  userId: HashIdSchema,
  trackId: HashIdSchema,
}).describe("Favorite a track");

const UnfavoriteTrackSchema = z.object({
  userId: HashIdSchema,
  trackId: HashIdSchema,
}).describe("Unfavorite a track");

// Challenge Schemas
const GetUndisbursedChallengesSchema = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
  userId: HashIdSchema.optional(),
  completedBlocknumber: z.number().optional(),
  challengeId: z.string().optional(),
}).describe("Get all undisbursed challenges");

const GetUserChallengesSchema = z.object({
  userId: HashIdSchema,
  showHistorical: z.boolean().optional(),
}).describe("Get user challenges");

// Track Purchase Schemas
const GetTrackPriceSchema = z.object({
  trackId: HashIdSchema,
}).describe("Get price information for a track");

const PurchaseTrackSchema = z.object({
  trackId: HashIdSchema,
  buyerId: HashIdSchema,
}).describe("Purchase a track using USDC");

const VerifyPurchaseSchema = z.object({
  trackId: HashIdSchema,
  userId: HashIdSchema,
}).describe("Verify if a user has purchased a track");

// Playlist Schemas
const GetPlaylistSchema = z.object({
  playlistId: HashIdSchema,
}).describe("Get playlist details");

const GetPlaylistTracksSchema = z.object({
  playlistId: HashIdSchema,
}).describe("Get tracks in a playlist");


const SearchPlaylistsSchema = z.object({
  query: z.string(),
}).describe("Search for playlists");

const FavoritePlaylistSchema = z.object({
  userId: HashIdSchema,
  playlistId: HashIdSchema,
}).describe("Favorite a playlist");

const UnfavoritePlaylistSchema = z.object({
  userId: HashIdSchema,
  playlistId: HashIdSchema,
}).describe("Unfavorite a playlist");

// Wallet & Financial Schemas
const ConnectWalletSchema = z.object({
  userId: HashIdSchema,
  walletAddress: z.string(),
  walletType: z.enum(['eth', 'solana']),
}).describe("Connect a wallet to a user's account");

const GetWalletInfoSchema = z.object({
  userId: HashIdSchema,
}).describe("Get connected wallet details for a user");

const GetUserBalanceSchema = z.object({
  userId: HashIdSchema,
  tokenType: z.enum(['wAUDIO', 'USDC']),
}).describe("Get user's token balance");

const InitializeUserBankSchema = z.object({
  userId: HashIdSchema,
  tokenType: z.enum(['wAUDIO', 'USDC']),
}).describe("Initialize a user's bank for token operations");

// Tip Schemas
const SendTipSchema = z.object({
  senderId: HashIdSchema,
  recipientId: HashIdSchema,
  amount: z.string(),
  contentId: HashIdSchema.optional(),
  contentType: z.enum(['track', 'playlist', 'album']).optional(),
}).describe("Send a tip using wAUDIO");

const GetTipHistorySchema = z.object({
  userId: HashIdSchema,
  type: z.enum(['sent', 'received']).optional(),
}).describe("Get tip history for a user");

const AddTipReactionSchema = z.object({
  tipId: z.string(),
  userId: HashIdSchema,
  reaction: z.string(),
}).describe("Add a reaction to a tip");

const GetTipReactionsSchema = z.object({
  tipId: z.string(),
}).describe("Get reactions for a tip");

// Album Schemas
const GetAlbumSchema = z.object({
  albumId: HashIdSchema,
  userId: HashIdSchema.optional(),
}).describe("Get album details");

const GetAlbumTracksSchema = z.object({
  albumId: HashIdSchema,
}).describe("Get album tracks");

const FavoriteAlbumSchema = z.object({
  userId: HashIdSchema,
  albumId: HashIdSchema,
}).describe("Favorite an album");

const UnfavoriteAlbumSchema = z.object({
  userId: HashIdSchema,
  albumId: HashIdSchema,
}).describe("Unfavorite an album");

// Server instance
const server = new Server(
  {
    name: "mcp-audius",
    version: "1.1.6",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Error handling
server.onerror = async (error) => {
  // Stop streaming server on MCP server error
  await streamingManager.stop().catch(() => {});
  process.exit(1);
};

// Register resource handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "audius://stats/global",
      name: "Global Audius Statistics",
      description: "Global platform statistics including total users, tracks, etc.",
      mimeType: "application/json"
    }
  ]
}));

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
  resourceTemplates: [
    {
      uriTemplate: "audius://artists/{handle}/stats",
      name: "Artist Statistics",
      description: "Basic statistics for an artist including follower count, track count, etc.",
      mimeType: "application/json"
    },
    {
      uriTemplate: "audius://tracks/{trackId}/stats",
      name: "Track Statistics",
      description: "Basic statistics for a track including play count, repost count, etc.",
      mimeType: "application/json"
    }
  ]
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Handle global stats
  if (uri === "audius://stats/global") {
    // Get total users by checking trending users with large limit
    const users = await trendingManager.getTrendingUsers({ limit: 1 });
    const tracks = await trendingManager.getTrendingTracks({ limit: 1 });
    const stats = {
      totalUsers: users?.count || 0,
      totalTracks: tracks?.count || 0,
      timestamp: new Date().toISOString()
    };
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(stats, null, 2)
      }]
    };
  }

  // Handle artist stats
  const artistMatch = uri.match(/^audius:\/\/artists\/([^/]+)\/stats$/);
  if (artistMatch) {
    const handle = decodeURIComponent(artistMatch[1]);
    const user = await audiusSdk.users.getUserByHandle({ handle });
    if (!user) {
      throw new McpError(ErrorCode.InvalidRequest, `Artist not found: ${handle}`);
    }
    const userData = user as AudiusUser;
    const stats = {
      handle: userData.handle || '',
      name: userData.name || '',
      followerCount: userData.followers_count || 0,
      trackCount: userData.track_count || 0,
      timestamp: new Date().toISOString()
    };
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(stats, null, 2)
      }]
    };
  }

  // Handle track stats
  const trackMatch = uri.match(/^audius:\/\/tracks\/([^/]+)\/stats$/);
  if (trackMatch) {
    const trackId = trackMatch[1];
    const track = await audiusSdk.tracks.getTrack({ trackId });
    if (!track) {
      throw new McpError(ErrorCode.InvalidRequest, `Track not found: ${trackId}`);
    }
    const trackData = track as AudiusTrack;
    const stats = {
      title: trackData.title || '',
      artist: trackData.user?.handle || '',
      playCount: trackData.play_count || 0,
      repostCount: trackData.repost_count || 0,
      favoriteCount: trackData.save_count || 0,
      timestamp: new Date().toISOString()
    };
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(stats, null, 2)
      }]
    };
  }

  throw new McpError(ErrorCode.InvalidRequest, `Resource not found: ${uri}`);
});

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // User Tools
    {
      name: "get-user",
      description: "Get details about a specific Audius user by their ID",
      inputSchema: zodToJsonSchema(GetUserSchema),
    },
    {
      name: "get-user-by-handle",
      description: "Get details about a specific Audius user by their handle/username",
      inputSchema: zodToJsonSchema(GetUserByHandleSchema),
    },
    {
      name: "search-users",
      description: "Search for Audius users",
      inputSchema: zodToJsonSchema(SearchUsersSchema),
    },
    {
      name: "follow-user",
      description: "Follow an Audius user",
      inputSchema: zodToJsonSchema(FollowUserSchema),
    },
    {
      name: "unfollow-user",
      description: "Unfollow an Audius user",
      inputSchema: zodToJsonSchema(UnfollowUserSchema),
    },
    {
      name: "get-user-followers",
      description: "Get a list of users who follow the specified user",
      inputSchema: zodToJsonSchema(GetUserFollowersSchema),
    },
    {
      name: "get-user-following",
      description: "Get a list of users that the specified user follows",
      inputSchema: zodToJsonSchema(GetUserFollowingSchema),
    },
    {
      name: "get-trending-users",
      description: "Get trending users on Audius platform",
      inputSchema: zodToJsonSchema(GetTrendingUsersSchema),
    },
    {
      name: "get-related-artists",
      description: "Get a list of artists related to the specified user",
      inputSchema: zodToJsonSchema(GetRelatedArtistsSchema),
    },
    {
      name: "get-user-tracks",
      description: "Get tracks created by a specific user",
      inputSchema: zodToJsonSchema(GetUserTracksSchema),
    },
    {
      name: "get-user-favorites",
      description: "Get a user's favorite tracks",
      inputSchema: zodToJsonSchema(GetUserFavoritesSchema),
    },
    {
      name: "get-user-reposts",
      description: "Get a user's reposts",
      inputSchema: zodToJsonSchema(GetUserRepostsSchema),
    },
    // Track Tools
    {
      name: "get-track",
      description: "Get details about a specific track",
      inputSchema: zodToJsonSchema(GetTrackSchema),
    },
    {
      name: "get-track-stream",
      description: "Get track stream URL and SSE endpoint",
      inputSchema: zodToJsonSchema(GetTrackStreamSchema),
    },
    {
      name: "get-track-comments",
      description: "Get all comments on a specific track",
      inputSchema: zodToJsonSchema(GetTrackCommentsSchema),
    },
    {
      name: "search-tracks",
      description: "Search for tracks on Audius",
      inputSchema: zodToJsonSchema(SearchTracksSchema),
    },
    {
      name: "get-trending-tracks",
      description: "Get trending tracks on Audius. Use genre parameter to filter by genre, limit/offset for pagination. Example: { genre: 'Electronic', limit: 20, offset: 0 }",
      inputSchema: zodToJsonSchema(GetTrendingTracksSchema),
    },
    {
      name: "get-underground-trending-tracks",
      description: "Gets the top 100 trending underground tracks on Audius",
      inputSchema: zodToJsonSchema(z.object({}).strict()),
    },
    {
      name: "favorite-track",
      description: "Favorite a track",
      inputSchema: zodToJsonSchema(FavoriteTrackSchema),
    },
    {
      name: "unfavorite-track",
      description: "Unfavorite a track",
      inputSchema: zodToJsonSchema(UnfavoriteTrackSchema),
    },
    // Challenge Tools
    {
      name: "get-undisbursed-challenges",
      description: "Get all undisbursed challenges",
      inputSchema: zodToJsonSchema(GetUndisbursedChallengesSchema),
    },
    {
      name: "get-user-challenges",
      description: "Get user challenges",
      inputSchema: zodToJsonSchema(GetUserChallengesSchema),
    },
    // URL Resolution Tools
    {
      name: "resolve-url",
      description: "Resolve an Audius URL to its corresponding API resource",
      inputSchema: zodToJsonSchema(ResolveUrlSchema),
    },
    // Extended User Tools
    {
      name: "get-user-extended-profile",
      description: "Get user's extended profile data including metrics and track history",
      inputSchema: zodToJsonSchema(GetUserExtendedProfileSchema),
    },
    // Extended Track Tools
    {
      name: "get-track-extended-data",
      description: "Get comprehensive track data including details, comments, and top listeners",
      inputSchema: zodToJsonSchema(GetTrackExtendedDataSchema),
    },
    {
      name: "get-track-top-listeners",
      description: "Get track's top listeners with detailed user info",
      inputSchema: zodToJsonSchema(GetTrackTopListenersSchema),
    },
    {
      name: "get-track-comments-extended",
      description: "Get track's comments with user info",
      inputSchema: zodToJsonSchema(GetTrackCommentsExtendedSchema),
    },
    // Comment Tools
    {
      name: "get-unclaimed-comment-id",
      description: "Get an unclaimed comment ID for creating new comments",
      inputSchema: zodToJsonSchema(z.object({}).strict()),
    },
    {
      name: "get-comment-replies",
      description: "Get replies to a specific comment",
      inputSchema: zodToJsonSchema(z.object({
        commentId: HashIdSchema,
      }).strict()),
    },
    // Track Purchase Tools
    {
      name: "get-track-price",
      description: "Get price information for a track",
      inputSchema: zodToJsonSchema(GetTrackPriceSchema),
    },
    {
      name: "purchase-track",
      description: "Purchase a track using USDC",
      inputSchema: zodToJsonSchema(PurchaseTrackSchema),
    },
    {
      name: "verify-purchase",
      description: "Verify if a user has purchased a track",
      inputSchema: zodToJsonSchema(VerifyPurchaseSchema),
    },
    // Playlist Tools
    {
      name: "get-playlist",
      description: "Get details about a specific playlist",
      inputSchema: zodToJsonSchema(GetPlaylistSchema),
    },
    {
      name: "get-playlist-tracks",
      description: "Get all tracks in a specific playlist",
      inputSchema: zodToJsonSchema(GetPlaylistTracksSchema),
    },
    {
      name: "get-trending-playlists",
      description: "Get trending playlists on Audius. Optionally specify time period (week/month/year) and use limit/offset for pagination. Example: { time: 'week', limit: 10 }",
      inputSchema: zodToJsonSchema(GetTrendingPlaylistsSchema),
    },
    {
      name: "get-trending-users",
      description: "Get trending users on Audius platform. Filter by genre and use limit/offset for pagination. Users are ranked by follower growth and engagement. Example: { genre: 'Hip-Hop', limit: 50 }",
      inputSchema: zodToJsonSchema(GetTrendingUsersSchema),
    },
    {
      name: "favorite-playlist",
      description: "Favorite a playlist",
      inputSchema: zodToJsonSchema(FavoritePlaylistSchema),
    },
    {
      name: "unfavorite-playlist",
      description: "Unfavorite a playlist",
      inputSchema: zodToJsonSchema(UnfavoritePlaylistSchema),
    },
    // Wallet & Financial Tools
    {
      name: "connect-wallet",
      description: "Connect a wallet to a user's account",
      inputSchema: zodToJsonSchema(ConnectWalletSchema),
    },
    {
      name: "get-wallet-info",
      description: "Get connected wallet details for a user",
      inputSchema: zodToJsonSchema(GetWalletInfoSchema),
    },
    {
      name: "get-user-balance",
      description: "Get user's token balance",
      inputSchema: zodToJsonSchema(GetUserBalanceSchema),
    },
    {
      name: "initialize-user-bank",
      description: "Initialize a user's bank for token operations",
      inputSchema: zodToJsonSchema(InitializeUserBankSchema),
    },
    // Tip Tools
    {
      name: "send-tip",
      description: "Send a tip using wAUDIO",
      inputSchema: zodToJsonSchema(SendTipSchema),
    },
    {
      name: "get-tip-history",
      description: "Get tip history for a user",
      inputSchema: zodToJsonSchema(GetTipHistorySchema),
    },
    {
      name: "add-tip-reaction",
      description: "Add a reaction to a tip",
      inputSchema: zodToJsonSchema(AddTipReactionSchema),
    },
    {
      name: "get-tip-reactions",
      description: "Get reactions for a tip",
      inputSchema: zodToJsonSchema(GetTipReactionsSchema),
    },
    // Album Tools
    {
      name: "get-album",
      description: "Get details about a specific album",
      inputSchema: zodToJsonSchema(GetAlbumSchema),
    },
    // RPC Tools
    {
      name: "handle-rpc-request",
      description: "Handle RPC requests that would normally go to local transport",
      inputSchema: zodToJsonSchema(z.object({
        method: z.string(),
        params: z.array(z.unknown())
      })),
    },
    {
      name: "get-album-tracks",
      description: "Get tracks from a specific album",
      inputSchema: zodToJsonSchema(GetAlbumTracksSchema),
    },
    {
      name: "favorite-album",
      description: "Favorite an album",
      inputSchema: zodToJsonSchema(FavoriteAlbumSchema),
    },
    {
      name: "unfavorite-album",
      description: "Unfavorite an album",
      inputSchema: zodToJsonSchema(UnfavoriteAlbumSchema),
    },
    // Analytics Tools
    {
      name: "get-genre-popularity",
      description: "Calculate genre popularity using trending tracks and Pareto distribution. Specify timeRange (day/week/month/year) and optionally request detailed metrics. Example: { timeRange: 'week', includeDetails: true }",
      inputSchema: zodToJsonSchema(GetGenrePopularitySchema),
    },
    {
      name: "get-mood-popularity",
      description: "Calculate mood popularity and emotional trends using trending tracks. Analyze over different time periods with optional detailed metrics. Example: { timeRange: 'month', includeDetails: true }",
      inputSchema: zodToJsonSchema(GetMoodPopularitySchema),
    },
    {
      name: "analyze-trending-tracks",
      description: "Analyze trending tracks with advanced metrics and research-based scoring. Optionally include detailed statistics about tempo and key signatures. Example: { limit: 100, includeStats: true }",
      inputSchema: zodToJsonSchema(AnalyzeTrendingTracksSchema),
    },
    // Audio Player Tools
    {
      name: "play-audio",
      description: "Play audio data using system audio",
      inputSchema: zodToJsonSchema(PlayAudioSchema),
    },
    {
      name: "stop-audio",
      description: "Stop currently playing audio",
      inputSchema: zodToJsonSchema(z.object({}).strict()),
    },
  ],
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request): Promise<ServerResult> => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // User endpoints
      case "get-user": {
        const { userId } = GetUserSchema.parse(args);
        const response = await audiusSdk.users.getUser({ id: userId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-user-by-handle": {
        const { handle } = GetUserByHandleSchema.parse(args);
        const response = await audiusSdk.users.getUserByHandle({ handle });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "search-users": {
        const { query } = SearchUsersSchema.parse(args);
        const response = await audiusSdk.users.searchUsers({ query });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "follow-user": {
        const { userId, followeeUserId } = FollowUserSchema.parse(args);
        const response = await audiusSdk.users.followUser({ userId, followeeUserId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "unfollow-user": {
        const { userId, followeeUserId } = UnfollowUserSchema.parse(args);
        const response = await audiusSdk.users.unfollowUser({ userId, followeeUserId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-user-followers": {
        const { userId, limit, offset } = GetUserFollowersSchema.parse(args);
        const response = await audiusSdk.users.getFollowers({ id: userId, limit, offset });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-user-following": {
        const { userId, limit, offset } = GetUserFollowingSchema.parse(args);
        const response = await audiusSdk.users.getFollowing({ id: userId, limit, offset });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-trending-users": {
        const { genre, limit, offset } = GetTrendingUsersSchema.parse(args);
        const response = await trendingManager.getTrendingUsers({ genre, limit, offset });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-related-artists": {
        const { userId, limit, offset } = GetRelatedArtistsSchema.parse(args);
        const response = await audiusSdk.users.getRelatedUsers({ id: userId, limit, offset });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-user-tracks": {
        const { userId, limit, offset, sort, sortMethod, sortDirection, filterTracks } = GetUserTracksSchema.parse(args);
        const response = await audiusSdk.users.getTracksByUser({ 
          id: userId, 
          limit, 
          offset,
          sort,
          sortMethod,
          sortDirection,
          filterTracks
        });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-user-favorites": {
        const { userId } = GetUserFavoritesSchema.parse(args);
        const response = await audiusSdk.users.getFavorites({ id: userId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-user-reposts": {
        const { userId, limit, offset } = GetUserRepostsSchema.parse(args);
        const response = await audiusSdk.users.getReposts({ id: userId, limit, offset });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      // Track endpoints
      case "get-track": {
        const { trackId } = GetTrackSchema.parse(args);
        const response = await audiusSdk.tracks.getTrack({ trackId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-track-stream": {
        const { trackId } = GetTrackStreamSchema.parse(args);
        const directUrl = await audiusSdk.tracks.getTrackStreamUrl({ trackId });
        const proxyUrl = `http://localhost:${process.env.STREAMING_PORT || '3000'}/stream/${trackId}`;
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              proxyUrl,
              directUrl,
              mimeType: "audio/mpeg"
            }, null, 2)
          }],
          tools: []  // Required by ServerResult type
        };
      }

      case "get-track-comments": {
        const { trackId, limit, offset } = GetTrackCommentsSchema.parse(args);
        const response = await audiusSdk.tracks.trackComments({ trackId, limit, offset });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "search-tracks": {
        const { query } = SearchTracksSchema.parse(args);
        const response = await audiusSdk.tracks.searchTracks({ query });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-trending-tracks": {
        const { genre, limit, offset } = GetTrendingTracksSchema.parse(args);
        const response = await trendingManager.getTrendingTracks({ genre, limit, offset });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-underground-trending-tracks": {
        const response = await audiusSdk.tracks.getUndergroundTrendingTracks();
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "favorite-track": {
        const { userId, trackId } = FavoriteTrackSchema.parse(args);
        const response = await audiusSdk.tracks.favoriteTrack({ userId, trackId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "unfavorite-track": {
        const { userId, trackId } = UnfavoriteTrackSchema.parse(args);
        const response = await audiusSdk.tracks.unfavoriteTrack({ userId, trackId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      // Challenge endpoints
      case "get-undisbursed-challenges": {
        const { offset, limit, userId, completedBlocknumber, challengeId } = GetUndisbursedChallengesSchema.parse(args);
        const response = await challengeManager.getUndisbursedChallenges({
          offset,
          limit,
          userId,
          completedBlocknumber,
          challengeId
        });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-user-challenges": {
        const { userId, showHistorical } = GetUserChallengesSchema.parse(args);
        const response = await challengeManager.getUserChallenges(userId, showHistorical);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      // Track Purchase endpoints
      case "get-track-price": {
        const { trackId } = GetTrackPriceSchema.parse(args);
        const response = await purchaseManager.getTrackPrice(trackId);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "purchase-track": {
        const { trackId, buyerId } = PurchaseTrackSchema.parse(args);
        const response = await purchaseManager.purchaseTrack(trackId, buyerId);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "verify-purchase": {
        const { trackId, userId } = VerifyPurchaseSchema.parse(args);
        const response = await purchaseManager.verifyPurchase(trackId, userId);
        return { content: [{ type: "text", text: JSON.stringify({ verified: response }, null, 2) }] };
      }

      // Playlist endpoints
      case "get-playlist": {
        const { playlistId } = GetPlaylistSchema.parse(args);
        const response = await audiusSdk.playlists.getPlaylist({ playlistId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-playlist-tracks": {
        const { playlistId } = GetPlaylistTracksSchema.parse(args);
        const response = await audiusSdk.playlists.getPlaylistTracks({ playlistId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-trending-playlists": {
        const { time, limit, offset } = GetTrendingPlaylistsSchema.parse(args);
        const response = await trendingManager.getTrendingPlaylists({ time, limit, offset });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "search-playlists": {
        const { query } = SearchPlaylistsSchema.parse(args);
        const response = await audiusSdk.playlists.searchPlaylists({ query });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "favorite-playlist": {
        const { userId, playlistId } = FavoritePlaylistSchema.parse(args);
        const response = await audiusSdk.playlists.favoritePlaylist({ userId, playlistId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "unfavorite-playlist": {
        const { userId, playlistId } = UnfavoritePlaylistSchema.parse(args);
        const response = await audiusSdk.playlists.unfavoritePlaylist({ userId, playlistId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      // Album endpoints
      case "get-album": {
        const { albumId, userId } = GetAlbumSchema.parse(args);
        const response = await audiusSdk.albums.getAlbum({ albumId, userId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-album-tracks": {
        const { albumId } = GetAlbumTracksSchema.parse(args);
        const response = await audiusSdk.albums.getAlbumTracks({ albumId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "favorite-album": {
        const { userId, albumId } = FavoriteAlbumSchema.parse(args);
        const response = await audiusSdk.albums.favoriteAlbum({ userId, albumId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "unfavorite-album": {
        const { userId, albumId } = UnfavoriteAlbumSchema.parse(args);
        const response = await audiusSdk.albums.unfavoriteAlbum({ userId, albumId });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "handle-rpc-request": {
        const { method, params } = z.object({
          method: z.string(),
          params: z.array(z.unknown())
        }).parse(args);
        const response = await walletManager.handleRPCRequest(method, params);
        return { content: [{ type: "text", text: JSON.stringify(response) }] };
      }

      // Wallet endpoints
      case "connect-wallet": {
        const { userId, walletAddress, walletType } = ConnectWalletSchema.parse(args);
        const response = await walletManager.connectWallet(userId, walletAddress, walletType);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-wallet-info": {
        const { userId } = GetWalletInfoSchema.parse(args);
        const response = await walletManager.getWalletInfo(userId);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-user-balance": {
        const { userId, tokenType } = GetUserBalanceSchema.parse(args);
        const response = await walletManager.getUserBalance(userId, tokenType);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "initialize-user-bank": {
        const { userId, tokenType } = InitializeUserBankSchema.parse(args);
        const response = await walletManager.initializeUserBank(userId, tokenType);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      // Tip endpoints
      case "send-tip": {
        const { senderId, recipientId, amount, contentId, contentType } = SendTipSchema.parse(args);
        const response = await tipManager.sendTip(senderId, recipientId, amount, contentId, contentType);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-tip-history": {
        const { userId, type } = GetTipHistorySchema.parse(args);
        const response = await tipManager.getTipHistory(userId, type);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "add-tip-reaction": {
        const { tipId, userId, reaction } = AddTipReactionSchema.parse(args);
        const response = await tipManager.addTipReaction(tipId, userId, reaction);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-tip-reactions": {
        const { tipId } = GetTipReactionsSchema.parse(args);
        const response = await tipManager.getTipReactions(tipId);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      // Comment endpoints
      case "get-unclaimed-comment-id": {
        const response = await commentManager.getUnclaimedCommentId();
        return { content: [{ type: "text", text: JSON.stringify({ commentId: response }, null, 2) }] };
      }

      case "get-comment-replies": {
        const { commentId } = z.object({
          commentId: HashIdSchema,
        }).parse(args);
        const response = await commentManager.getCommentReplies(commentId);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "resolve-url": {
        const { url } = ResolveUrlSchema.parse(args);
        const response = await resolveManager.resolveUrl(url);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-user-extended-profile": {
        const { userId } = GetUserExtendedProfileSchema.parse(args);
        const response = await userExtendedManager.getUserExtendedProfile(userId);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-track-extended-data": {
        const { trackId } = GetTrackExtendedDataSchema.parse(args);
        const response = await trackExtendedManager.getTrackExtendedData(trackId);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-track-top-listeners": {
        const { trackId } = GetTrackTopListenersSchema.parse(args);
        const response = await trackExtendedManager.getTrackTopListeners(trackId);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-track-comments-extended": {
        const { trackId } = GetTrackCommentsExtendedSchema.parse(args);
        const response = await trackExtendedManager.getTrackComments(trackId);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-genre-popularity": {
        const { timeRange, totalPoints, includeDetails } = GetGenrePopularitySchema.parse(args);
        const response = await analyticsManager.getGenrePopularity({ timeRange, totalPoints, includeDetails });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "get-mood-popularity": {
        const { timeRange, totalPoints, includeDetails } = GetMoodPopularitySchema.parse(args);
        const response = await analyticsManager.getMoodPopularity({ timeRange, totalPoints, includeDetails });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      case "analyze-trending-tracks": {
        const { limit, includeStats } = AnalyzeTrendingTracksSchema.parse(args);
        const analyticsManager = trendingManager.getAnalyticsManager();
        if (!analyticsManager) {
          throw new McpError(ErrorCode.InternalError, "Analytics manager not initialized");
        }
        const response = await analyticsManager.analyzeTrendingTracks({ 
          limit, 
          includeStats 
        });
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }

      // Audio Player endpoints
      case "play-audio": {
        const { data } = PlayAudioSchema.parse(args);
        try {
          const audioData = Buffer.from(data, 'base64');
          await audioPlayerManager.playAudioData(audioData);
          return {
            content: [{
              type: "text",
              text: "Playing audio data"
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Failed to play audio: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }

      case "stop-audio": {
        audioPlayerManager.stopPlayback();
        return {
          content: [{
            type: "text",
            text: "Stopped audio playback"
          }]
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid arguments: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`
      );
    }
    
    // Handle SDK errors
    if (error instanceof Error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Audius SDK error: ${error.message}`
      );
    }
    
    throw error;
  }
});

// Handle cleanup on exit
process.on('SIGINT', async () => {
  audioPlayerManager.stopPlayback();
  await streamingManager.stop();
  process.exit(0);
});

// Start the server
async function main() {
  try {
    // First start streaming server
    await streamingManager.start();

    // Then connect MCP server once streaming is ready
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    // Only log critical initialization failures
    if (error instanceof Error) {
      throw new McpError(ErrorCode.InternalError, `Failed to initialize: ${error.message}`);
    }
    throw error;
  }
}

// Execute main
main().catch(async (error) => {
  // Ensure clean shutdown
  audioPlayerManager.stopPlayback();
  await streamingManager.stop().catch(() => {});
  
  // If it's already an MCP error, rethrow it
  if (error instanceof McpError) {
    throw error;
  }
  
  // Otherwise wrap in MCP error
  throw new McpError(
    ErrorCode.InternalError,
    error instanceof Error ? error.message : String(error)
  );
});
