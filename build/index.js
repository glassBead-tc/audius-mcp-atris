#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema, ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { fetchFromAudius, AudiusAPIError } from "./utils.js";
// Input schemas for tools
const GetUserSchema = z.object({
    userId: z.string().describe("A User ID"),
    currentUserId: z.string().optional().describe("The user ID of the user making the request"),
});
const GetUserByHandleSchema = z.object({
    handle: z.string().describe("The user's handle/username"),
    currentUserId: z.string().optional().describe("The user ID of the user making the request"),
});
const SearchUsersSchema = z.object({
    query: z.string().describe("Search query for finding users"),
    genre: z.array(z.string()).optional().describe("The genres to filter by"),
    sortMethod: z.enum(["popular"]).optional().describe("The sort method"),
    isVerified: z.boolean().optional().describe("Only include verified users"),
});
const GetUserTracksSchema = z.object({
    userId: z.string().describe("A User ID"),
    limit: z.number().optional().describe("Number of tracks to return"),
    offset: z.number().optional().describe("Offset for pagination"),
});
const GetUserRepostsSchema = z.object({
    userId: z.string().describe("A User ID"),
    limit: z.number().optional().describe("Number of reposts to return"),
    offset: z.number().optional().describe("Offset for pagination"),
});
const GetUserFollowersSchema = z.object({
    userId: z.string().describe("A User ID"),
    limit: z.number().optional().describe("Number of followers to return"),
    offset: z.number().optional().describe("Offset for pagination"),
});
const GetUserFollowingSchema = z.object({
    userId: z.string().describe("A User ID"),
    limit: z.number().optional().describe("Number of following users to return"),
    offset: z.number().optional().describe("Offset for pagination"),
});
const GetUserTagsSchema = z.object({
    userId: z.string().describe("A User ID"),
});
const GetTrackSchema = z.object({
    trackId: z.string().describe("A Track ID"),
    currentUserId: z.string().optional().describe("The user ID of the user making the request"),
});
const GetTrackAccessInfoSchema = z.object({
    trackId: z.string().describe("A Track ID"),
    currentUserId: z.string().optional().describe("The user ID of the user making the request"),
    includeNetworkCut: z.boolean().optional().describe("Whether to include the staking system as a recipient"),
});
const GetTrackDetailsSchema = z.object({
    trackId: z.string().describe("A Track ID"),
    original: z.boolean().optional().describe("If true, inspects the original quality file"),
});
const GetTrackTopListenersSchema = z.object({
    trackId: z.string().describe("A Track ID"),
    currentUserId: z.string().optional().describe("The user ID of the user making the request"),
    limit: z.number().optional().describe("Number of listeners to return"),
    offset: z.number().optional().describe("Offset for pagination"),
});
const GetTrackStemsSchema = z.object({
    trackId: z.string().describe("A Track ID"),
});
const GetTracksSchema = z.object({
    ids: z.array(z.string()).describe("Array of track IDs"),
});
const StreamTrackSchema = z.object({
    trackId: z.string().describe("A Track ID"),
    userId: z.string().optional().describe("The user ID of the user making the request"),
    userSignature: z.string().optional().describe("Signature from the requesting user's wallet"),
    userData: z.string().optional().describe("Data used to generate the signature"),
    nftAccessSignature: z.string().optional().describe("Gated content signature"),
    skipPlayCount: z.boolean().optional().describe("Disable tracking of play counts"),
    apiKey: z.string().optional().describe("API key for third party apps"),
    skipCheck: z.boolean().optional().describe("Skip node health check"),
    noRedirect: z.boolean().optional().describe("Return stream URL in JSON instead of redirecting"),
});
const SearchTracksSchema = z.object({
    query: z.string().describe("Search query for finding tracks"),
    onlyDownloadable: z.boolean().optional().describe("Filter to only show downloadable tracks"),
    genre: z.array(z.string()).optional().describe("The genres to filter by"),
    mood: z.array(z.string()).optional().describe("The moods to filter by"),
    includePurchaseable: z.boolean().optional().describe("Whether to include purchaseable content"),
    isPurchaseable: z.boolean().optional().describe("Only include purchaseable tracks"),
    hasDownloads: z.boolean().optional().describe("Only include tracks with downloads"),
    key: z.array(z.string()).optional().describe("Only include tracks that match the musical key"),
    bpmMin: z.number().optional().describe("Only include tracks with BPM >= this value"),
    bpmMax: z.number().optional().describe("Only include tracks with BPM <= this value"),
});
const GetTrendingTracksSchema = z.object({
    genre: z.string().optional().describe("Filter trending tracks by genre"),
    time: z.enum(["week", "month", "year", "allTime"]).optional().describe("Time range for trending calculation"),
});
const GetUndergroundTrendingTracksSchema = z.object({
    offset: z.number().optional().describe("Offset for pagination"),
    limit: z.number().optional().describe("Number of tracks to return"),
});
const GetTipsSchema = z.object({
    offset: z.number().optional().describe("Offset for pagination"),
    limit: z.number().optional().describe("Number of tips to return"),
    currentUserId: z.string().optional().describe("The user ID of the user making the request"),
    receiverMinFollowers: z.number().optional().describe("Only include tips to recipients with this many followers"),
    receiverIsVerified: z.boolean().optional().describe("Only include tips to verified recipients"),
    currentUserFollows: z.enum(["sender", "receiver"]).optional().describe("Only include tips involving user's followers"),
    uniqueBy: z.enum(["sender", "receiver"]).optional().describe("Only include unique tips by sender/receiver"),
});
const GetDeveloperAppSchema = z.object({
    address: z.string().describe("Developer app address (API Key)"),
});
const ResolveUrlSchema = z.object({
    url: z.string().describe("URL to resolve (audius.co URL or path)"),
});
const GetPlaylistSchema = z.object({
    playlistId: z.string().describe("A Playlist ID"),
});
const GetPlaylistTracksSchema = z.object({
    playlistId: z.string().describe("A Playlist ID"),
});
const SearchPlaylistsSchema = z.object({
    query: z.string().describe("Search query for finding playlists"),
    genre: z.array(z.string()).optional().describe("The genres to filter by"),
    mood: z.array(z.string()).optional().describe("The moods to filter by"),
    sortMethod: z.enum(["popular"]).optional().describe("The sort method"),
    includePurchaseable: z.boolean().optional().describe("Whether to include purchaseable content"),
    hasDownloads: z.boolean().optional().describe("Only include tracks that have downloads"),
});
// Server configuration
const server = new Server({
    name: "audius-api",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            // User tools
            {
                name: "get-user",
                description: "Get details about a specific Audius user by their ID",
                inputSchema: GetUserSchema,
            },
            {
                name: "get-user-by-wallet",
                description: "Get a User ID from an associated wallet address",
                inputSchema: z.object({
                    wallet: z.string().describe("Wallet address"),
                }),
            },
            {
                name: "get-user-by-handle",
                description: "Get details about a specific Audius user by their handle/username",
                inputSchema: GetUserByHandleSchema,
            },
            {
                name: "search-users",
                description: "Search for Audius users",
                inputSchema: SearchUsersSchema,
            },
            {
                name: "get-user-tracks",
                description: "Get tracks created by a specific user",
                inputSchema: GetUserTracksSchema,
            },
            {
                name: "get-user-reposts",
                description: "Get tracks and playlists reposted by a user",
                inputSchema: GetUserRepostsSchema,
            },
            {
                name: "get-user-followers",
                description: "Get users who follow the specified user",
                inputSchema: GetUserFollowersSchema,
            },
            {
                name: "get-user-following",
                description: "Get users that the specified user follows",
                inputSchema: GetUserFollowingSchema,
            },
            {
                name: "get-user-tags",
                description: "Get most used track tags by a user",
                inputSchema: GetUserTagsSchema,
            },
            // Track tools
            {
                name: "get-track",
                description: "Get details about a specific track by ID",
                inputSchema: GetTrackSchema,
            },
            {
                name: "get-track-access-info",
                description: "Get track access information and permissions",
                inputSchema: GetTrackAccessInfoSchema,
            },
            {
                name: "get-track-details",
                description: "Get technical details about a track",
                inputSchema: GetTrackDetailsSchema,
            },
            {
                name: "get-track-top-listeners",
                description: "Get users who have listened to a track the most",
                inputSchema: GetTrackTopListenersSchema,
            },
            {
                name: "get-track-stems",
                description: "Get the remixable stems of a track",
                inputSchema: GetTrackStemsSchema,
            },
            {
                name: "get-underground-trending",
                description: "Get trending underground tracks",
                inputSchema: GetUndergroundTrendingTracksSchema,
            },
            {
                name: "get-tracks",
                description: "Get multiple tracks by their IDs",
                inputSchema: GetTracksSchema,
            },
            {
                name: "stream-track",
                description: "Get the streamable MP3 file URL for a track",
                inputSchema: StreamTrackSchema,
            },
            {
                name: "search-tracks",
                description: "Search for tracks on Audius",
                inputSchema: SearchTracksSchema,
            },
            {
                name: "get-trending-tracks",
                description: "Get trending tracks on Audius",
                inputSchema: GetTrendingTracksSchema,
            },
            // Playlist tools
            {
                name: "get-playlist",
                description: "Get details about a specific playlist by ID",
                inputSchema: GetPlaylistSchema,
            },
            {
                name: "get-playlist-by-permalink",
                description: "Get a playlist by handle and slug",
                inputSchema: z.object({
                    handle: z.string().describe("Playlist owner handle"),
                    slug: z.string().describe("Playlist slug"),
                    currentUserId: z.string().optional().describe("The user ID of the user making the request"),
                }),
            },
            {
                name: "get-playlist-access-info",
                description: "Get playlist access information and permissions",
                inputSchema: z.object({
                    playlistId: z.string().describe("A Playlist ID"),
                    currentUserId: z.string().optional().describe("The user ID of the user making the request"),
                    includeNetworkCut: z.boolean().optional().describe("Whether to include the staking system as a recipient"),
                }),
            },
            {
                name: "get-playlist-tracks",
                description: "Get all tracks in a playlist",
                inputSchema: GetPlaylistTracksSchema,
            },
            {
                name: "search-playlists",
                description: "Search for playlists on Audius",
                inputSchema: SearchPlaylistsSchema,
            },
        ],
    };
});
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            // User endpoints
            case "get-user": {
                const { userId } = GetUserSchema.parse(args);
                const data = await fetchFromAudius(`users/${userId}`);
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-user-by-handle": {
                const { handle } = GetUserByHandleSchema.parse(args);
                const data = await fetchFromAudius(`users/handle/${handle}`);
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-user-by-wallet": {
                const { wallet } = z.object({
                    wallet: z.string(),
                }).parse(args);
                const data = await fetchFromAudius('users/id', { associated_wallet: wallet });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "search-users": {
                const { query, genre, sortMethod, isVerified } = SearchUsersSchema.parse(args);
                const data = await fetchFromAudius('users/search', {
                    query,
                    genre: genre?.join(','),
                    sort_method: sortMethod,
                    is_verified: isVerified
                });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-user-tracks": {
                const { userId, limit, offset } = GetUserTracksSchema.parse(args);
                const data = await fetchFromAudius(`users/${userId}/tracks`, { limit, offset });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-user-reposts": {
                const { userId, limit, offset } = GetUserRepostsSchema.parse(args);
                const data = await fetchFromAudius(`users/${userId}/reposts`, { limit, offset });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-user-followers": {
                const { userId, limit, offset } = GetUserFollowersSchema.parse(args);
                const data = await fetchFromAudius(`users/${userId}/followers`, { limit, offset });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-user-following": {
                const { userId, limit, offset } = GetUserFollowingSchema.parse(args);
                const data = await fetchFromAudius(`users/${userId}/following`, { limit, offset });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-user-tags": {
                const { userId } = GetUserTagsSchema.parse(args);
                const data = await fetchFromAudius(`users/${userId}/tags`);
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            // Track endpoints
            case "get-track": {
                const { trackId } = GetTrackSchema.parse(args);
                const data = await fetchFromAudius(`tracks/${trackId}`);
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-tracks": {
                const { ids } = GetTracksSchema.parse(args);
                const data = await fetchFromAudius('tracks', { id: ids.join(',') });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "stream-track": {
                const { trackId, userId, userSignature, userData, nftAccessSignature, skipPlayCount, apiKey, skipCheck, noRedirect } = StreamTrackSchema.parse(args);
                const headers = {};
                if (userSignature) {
                    headers['Encoded-Data-Signature'] = userSignature;
                }
                if (userData) {
                    headers['Encoded-Data-Message'] = userData;
                }
                const data = await fetchFromAudius(`tracks/${trackId}/stream`, {
                    user_id: userId,
                    user_signature: userSignature,
                    user_data: userData,
                    nft_access_signature: nftAccessSignature,
                    skip_play_count: skipPlayCount,
                    api_key: apiKey,
                    skip_check: skipCheck,
                }, {
                    headers,
                    noRedirect,
                });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "search-tracks": {
                const { query, onlyDownloadable, genre, mood, includePurchaseable, isPurchaseable, hasDownloads, key, bpmMin, bpmMax } = SearchTracksSchema.parse(args);
                const data = await fetchFromAudius('tracks/search', {
                    query,
                    only_downloadable: onlyDownloadable,
                    genre: genre?.join(','),
                    mood: mood?.join(','),
                    include_purchaseable: includePurchaseable,
                    is_purchaseable: isPurchaseable,
                    has_downloads: hasDownloads,
                    key: key?.join(','),
                    bpm_min: bpmMin,
                    bpm_max: bpmMax
                });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-trending-tracks": {
                const { genre, time } = GetTrendingTracksSchema.parse(args);
                const data = await fetchFromAudius('tracks/trending', { genre, time });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            // Playlist endpoints
            case "get-playlist": {
                const { playlistId } = GetPlaylistSchema.parse(args);
                const data = await fetchFromAudius(`playlists/${playlistId}`);
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-playlist-tracks": {
                const { playlistId } = GetPlaylistTracksSchema.parse(args);
                const data = await fetchFromAudius(`playlists/${playlistId}/tracks`);
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "search-playlists": {
                const { query, genre, mood, sortMethod, includePurchaseable, hasDownloads } = SearchPlaylistsSchema.parse(args);
                const data = await fetchFromAudius('playlists/search', {
                    query,
                    genre: genre?.join(','),
                    mood: mood?.join(','),
                    sort_method: sortMethod,
                    include_purchaseable: includePurchaseable,
                    has_downloads: hasDownloads
                });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            // Tips endpoints
            case "get-tips": {
                const params = GetTipsSchema.parse(args);
                const data = await fetchFromAudius('tips', params);
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            // Developer app endpoints
            case "get-developer-app": {
                const { address } = GetDeveloperAppSchema.parse(args);
                const data = await fetchFromAudius(`developer_apps/${address}`);
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            // Track endpoints
            case "get-track-access-info": {
                const { trackId, currentUserId, includeNetworkCut } = GetTrackAccessInfoSchema.parse(args);
                const data = await fetchFromAudius(`tracks/${trackId}/access-info`, {
                    user_id: currentUserId,
                    include_network_cut: includeNetworkCut,
                });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-track-details": {
                const { trackId, original } = GetTrackDetailsSchema.parse(args);
                const data = await fetchFromAudius(`tracks/${trackId}/inspect`, { original });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-track-top-listeners": {
                const { trackId, currentUserId, limit, offset } = GetTrackTopListenersSchema.parse(args);
                const data = await fetchFromAudius(`tracks/${trackId}/top_listeners`, {
                    user_id: currentUserId,
                    limit,
                    offset,
                });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-track-stems": {
                const { trackId } = GetTrackStemsSchema.parse(args);
                const data = await fetchFromAudius(`tracks/${trackId}/stems`);
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-underground-trending": {
                const { limit, offset } = GetUndergroundTrendingTracksSchema.parse(args);
                const data = await fetchFromAudius('tracks/trending/underground', { limit, offset });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            // Playlist endpoints
            case "get-playlist-by-permalink": {
                const { handle, slug, currentUserId } = z.object({
                    handle: z.string(),
                    slug: z.string(),
                    currentUserId: z.string().optional(),
                }).parse(args);
                const data = await fetchFromAudius(`playlists/by_permalink/${handle}/${slug}`, {
                    user_id: currentUserId,
                });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            case "get-playlist-access-info": {
                const { playlistId, currentUserId, includeNetworkCut } = z.object({
                    playlistId: z.string(),
                    currentUserId: z.string().optional(),
                    includeNetworkCut: z.boolean().optional(),
                }).parse(args);
                const data = await fetchFromAudius(`playlists/${playlistId}/access-info`, {
                    user_id: currentUserId,
                    include_network_cut: includeNetworkCut,
                });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
            // URL resolution
            case "resolve": {
                const { url } = ResolveUrlSchema.parse(args);
                const data = await fetchFromAudius('resolve', { url });
                return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
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
        if (error instanceof AudiusAPIError) {
            throw new McpError(error.statusCode >= 500 ? ErrorCode.InternalError : ErrorCode.InvalidRequest, error.message, error.data);
        }
        throw error;
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Audius MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
