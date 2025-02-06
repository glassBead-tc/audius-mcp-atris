import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from 'zod-to-json-schema';
import { UserHandlers } from "../handlers/user-handlers.js";
import { TrackHandlers } from "../handlers/track-handlers.js";
import { ManagerFactory } from "../managers/manager-factory.js";
import { sdk } from '@audius/sdk';
import {
  GetUserSchema,
  GetUserByHandleSchema,
  SearchUsersSchema,
  FollowUserSchema,
  UnfollowUserSchema,
  GetUserFollowersSchema,
  GetUserFollowingSchema,
  GetUserTracksSchema,
  GetUserFavoritesSchema,
  GetUserRepostsSchema,
} from "../schemas/user-schemas.js";
import {
  GetTrackSchema,
  GetTrackStreamSchema,
  GetTrackCommentsSchema,
  SearchTracksSchema,
  FavoriteTrackSchema,
  UnfavoriteTrackSchema,
} from "../schemas/track-schemas.js";
import { registerPromptHandlers } from "../prompts/handlers.js";

export class RouteRegistry {
  private readonly server: Server;
  private readonly userHandlers: UserHandlers;
  private readonly trackHandlers: TrackHandlers;
  private readonly audiusSdk: ReturnType<typeof sdk>;
  private readonly managerFactory: ManagerFactory;

  constructor(
    server: Server, 
    audiusSdk: ReturnType<typeof sdk>, 
    managerFactory: ManagerFactory
  ) {
    this.server = server;
    this.audiusSdk = audiusSdk;
    this.managerFactory = managerFactory;
    this.userHandlers = new UserHandlers(audiusSdk, managerFactory);
    this.trackHandlers = new TrackHandlers(audiusSdk, managerFactory);
  }

  public registerRoutes(): void {
    this.registerResourceHandlers();
    this.registerToolHandlers();
    this.registerPromptHandlers();
  }

  private registerResourceHandlers(): void {
    // Register resource list handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "audius://stats/global",
          name: "Global Audius Statistics",
          description: "Global platform statistics including total users, tracks, etc.",
          mimeType: "application/json"
        }
      ]
    }));

    // Register resource template handler
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
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

    // Register resource read handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      // Handle global stats
      if (uri === "audius://stats/global") {
        const trendingManager = this.managerFactory.getTrendingManager();
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
        const user = await this.audiusSdk.users.getUserByHandle({ handle });
        if (!user) {
          throw new McpError(ErrorCode.InvalidRequest, `Artist not found: ${handle}`);
        }
        const stats = {
          handle: user.data?.handle || '',
          name: user.data?.name || '',
          followerCount: user.data?.followerCount || 0,
          trackCount: user.data?.trackCount || 0,
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
        const stats = await this.trackHandlers.getTrackStats(trackId);
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
  }

  private registerToolHandlers(): void {
    // Register tool list handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // User Tools
        {
          name: "get-user",
          description: "Get details about a specific Audius user by their ID",
          inputSchema: zodToJsonSchema(GetUserSchema),
        },
        {
          name: "get-user-by-handle",
          description: "Look up a user by their Audius handle",
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
          description: "Get a list of users following the specified user",
          inputSchema: zodToJsonSchema(GetUserFollowersSchema),
        },
        {
          name: "get-user-following",
          description: "Get a list of users that the specified user follows",
          inputSchema: zodToJsonSchema(GetUserFollowingSchema),
        },
        {
          name: "get-user-tracks",
          description: "Get tracks uploaded by a user",
          inputSchema: zodToJsonSchema(GetUserTracksSchema),
        },
        {
          name: "get-user-favorites",
          description: "Get tracks favorited by a user",
          inputSchema: zodToJsonSchema(GetUserFavoritesSchema),
        },
        {
          name: "get-user-reposts",
          description: "Get tracks reposted by a user",
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
          description: "Get the streaming URL for a track",
          inputSchema: zodToJsonSchema(GetTrackStreamSchema),
        },
        {
          name: "get-track-comments",
          description: "Get comments on a track",
          inputSchema: zodToJsonSchema(GetTrackCommentsSchema),
        },
        {
          name: "search-tracks",
          description: "Search for tracks on Audius",
          inputSchema: zodToJsonSchema(SearchTracksSchema),
        },
        {
          name: "favorite-track",
          description: "Add a track to your favorites",
          inputSchema: zodToJsonSchema(FavoriteTrackSchema),
        },
        {
          name: "unfavorite-track",
          description: "Remove a track from your favorites",
          inputSchema: zodToJsonSchema(UnfavoriteTrackSchema),
        }
      ]
    }));

    // Register tool execution handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // User endpoints
          case "get-user":
            return await this.userHandlers.getUser(args);
          case "get-user-by-handle":
            return await this.userHandlers.getUserByHandle(args);
          case "search-users":
            return await this.userHandlers.searchUsers(args);
          case "follow-user":
            return await this.userHandlers.followUser(args);
          case "unfollow-user":
            return await this.userHandlers.unfollowUser(args);
          case "get-user-followers":
            return await this.userHandlers.getUserFollowers(args);
          case "get-user-following":
            return await this.userHandlers.getUserFollowing(args);
          case "get-user-tracks":
            return await this.userHandlers.getUserTracks(args);
          case "get-user-favorites":
            return await this.userHandlers.getUserFavorites(args);
          case "get-user-reposts":
            return await this.userHandlers.getUserReposts(args);

          // Track endpoints
          case "get-track":
            return await this.trackHandlers.getTrack(args);
          case "get-track-stream":
            return await this.trackHandlers.getTrackStream(args);
          case "get-track-comments":
            return await this.trackHandlers.getTrackComments(args);
          case "search-tracks":
            return await this.trackHandlers.searchTracks(args);
          case "favorite-track":
            return await this.trackHandlers.favoriteTrack(args);
          case "unfavorite-track":
            return await this.trackHandlers.unfavoriteTrack(args);

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private registerPromptHandlers(): void {
    registerPromptHandlers(this.server);
  }
}
