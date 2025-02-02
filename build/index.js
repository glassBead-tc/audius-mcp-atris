#!/usr/bin/env node
import { config } from 'dotenv';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema, ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { sdk } from '@audius/sdk';
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
// Load environment variables
config({ path: '.env.local' });
const API_KEY = process.env.AUDIUS_API_KEY;
const API_SECRET = process.env.AUDIUS_API_SECRET;
if (!API_KEY) {
    throw new Error('AUDIUS_API_KEY environment variable is required');
}
// Initialize Audius SDK
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
// Common Types
const HashIdSchema = z.string().describe("Audius ID");
// User Schemas
const GetUserSchema = z.object({
    userId: HashIdSchema,
}).describe("Get user details");
const GetUserByHandleSchema = z.object({
    handle: z.string(),
}).describe("Get user by handle");
const SearchUsersSchema = z.object({
    query: z.string(),
}).describe("Search for users");
const FollowUserSchema = z.object({
    userId: HashIdSchema,
    followeeUserId: HashIdSchema,
}).describe("Follow a user");
const UnfollowUserSchema = z.object({
    userId: HashIdSchema,
    followeeUserId: HashIdSchema,
}).describe("Unfollow a user");
const GetUserFollowersSchema = z.object({
    userId: HashIdSchema,
    limit: z.number().optional(),
    offset: z.number().optional(),
}).describe("Get user's followers");
const GetUserFollowingSchema = z.object({
    userId: HashIdSchema,
    limit: z.number().optional(),
    offset: z.number().optional(),
}).describe("Get users that a user is following");
const GetTrendingUsersSchema = z.object({
    genre: z.array(z.string()).optional(),
}).describe("Get trending users on Audius");
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
const GetTrackStreamUrlSchema = z.object({
    trackId: HashIdSchema,
}).describe("Get streamable URL for a track");
const GetTrackCommentsSchema = z.object({
    trackId: HashIdSchema,
    limit: z.number().optional(),
    offset: z.number().optional(),
}).describe("Get comments on a track");
const SearchTracksSchema = z.object({
    query: z.string(),
}).describe("Search for tracks");
const GetTrendingTracksSchema = z.object({
    genre: z.string().optional(),
}).describe("Get trending tracks");
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
const GetTrendingPlaylistsSchema = z.object({
    time: z.enum(['week', 'month', 'year']).optional(),
}).describe("Get trending playlists");
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
const server = new Server({
    name: "mcp-audius",
    version: "1.0.0",
}, {
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Error handling
server.onerror = (error) => {
    console.error("[MCP Server Error]", error);
};
// Register request handlers
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
            name: "get-track-stream-url",
            description: "Get a streamable URL for a specific track",
            inputSchema: zodToJsonSchema(GetTrackStreamUrlSchema),
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
            description: "Get trending tracks on Audius",
            inputSchema: zodToJsonSchema(GetTrendingTracksSchema),
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
            description: "Get trending playlists on Audius",
            inputSchema: zodToJsonSchema(GetTrendingPlaylistsSchema),
        },
        {
            name: "search-playlists",
            description: "Search for playlists on Audius",
            inputSchema: zodToJsonSchema(SearchPlaylistsSchema),
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
    ],
}));
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
                const { genre } = GetTrendingUsersSchema.parse(args);
                const response = await audiusSdk.users.searchUsers({
                    query: '', // Empty query to get all users
                    sortMethod: 'popular',
                    genre
                });
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
            case "get-track-stream-url": {
                const { trackId } = GetTrackStreamUrlSchema.parse(args);
                const response = await audiusSdk.tracks.getTrackStreamUrl({ trackId });
                return { content: [{ type: "text", text: JSON.stringify({ streamUrl: response }, null, 2) }] };
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
                const { genre } = GetTrendingTracksSchema.parse(args);
                const response = await audiusSdk.tracks.getTrendingTracks({ genre });
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
                const { time } = GetTrendingPlaylistsSchema.parse(args);
                const response = await audiusSdk.playlists.getTrendingPlaylists({ time });
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
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(", ")}`);
        }
        // Handle SDK errors
        if (error instanceof Error) {
            throw new McpError(ErrorCode.InternalError, `Audius SDK error: ${error.message}`);
        }
        throw error;
    }
});
// Start the server
async function main() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Audius MCP Server running on stdio");
    }
    catch (error) {
        console.error("Failed to initialize server:", error);
        process.exit(1);
    }
}
// Execute main
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
