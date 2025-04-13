import { zodToJsonSchema } from 'zod-to-json-schema';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { startAudioStreamServer, stopAudioStreamServer } from './stream-server.js';
import { config } from './config.js';
import { StreamTrackTool } from './stream-server.js';

// Determine baseUrl for the stream server tool
const baseUrl =
  (config && (config as any).baseUrl)
    ? (config as any).baseUrl
    : `http://localhost:${(config && (config as any).port) ? (config as any).port : 7070}`;

// Create a single instance for use in tool execution
const streamTrackTool = new StreamTrackTool(baseUrl);
import {
  getAllToolDefinitions,
  getToolDefinition,
  ToolDefinition
} from './utils/tool-registry.js';
import { validateToolInput } from './utils/validation.js';
import {
  getTrack, getTrackSchema,
  searchTracks, searchTracksSchema,
  getTrendingTracks, getTrendingTracksSchema,
  getTrackComments, getTrackCommentsSchema
} from './tools/tracks.js';
import {
  getUser, getUserSchema,
  searchUsers, searchUsersSchema,
  getUserTracks, getUserTracksSchema
} from './tools/users.js';
import {
  getPlaylist, getPlaylistSchema,
  getAlbum, getAlbumSchema
} from './tools/playlists.js';
import {
  searchAll, searchAllSchema,
  advancedSearch, advancedSearchSchema,
  trendingDiscovery, trendingDiscoverySchema,
  similarArtists, similarArtistsSchema
} from './tools/search.js';
import {
  getUserFavorites, userFavoritesSchema,
  getUserReposts, userRepostsSchema,
  getUserFollowers, userFollowersSchema,
  getUserFollowing, userFollowingSchema,
  isFollowing, isFollowingSchema,
  getTrackFavorites, trackFavoritesSchema,
  getTrackReposts, trackRepostsSchema,
  followUser, followUserSchema,
  favoriteTrack, favoriteTrackSchema
} from './tools/social.js';
import {
  addTrackComment, addTrackCommentSchema,
  deleteTrackComment, deleteTrackCommentSchema
} from './tools/comments.js';
import {
  uploadTrack, uploadTrackSchema,
  updateTrack, updateTrackSchema,
  deleteTrack, deleteTrackSchema
} from './tools/track-management.js';
import {
  createPlaylist, createPlaylistSchema,
  updatePlaylist, updatePlaylistSchema,
  deletePlaylist, deletePlaylistSchema,
  addTracksToPlaylist, addTracksToPlaylistSchema,
  removeTrackFromPlaylist, removeTrackFromPlaylistSchema,
  reorderPlaylistTracks, reorderPlaylistTracksSchema
} from './tools/playlist-management.js';
import {
  sendMessage, sendMessageSchema,
  getMessages, getMessagesSchema,
  getMessageThreads, getMessageThreadsSchema,
  markMessageRead, markMessageReadSchema
} from './tools/messaging.js';
import {
  getTrackListenCounts, trackListenCountsSchema,
  getUserTrackListenCounts, userTrackListenCountsSchema,
  getTrackTopListeners, trackTopListenersSchema,
  getTrackListenerInsights, trackListenerInsightsSchema,
  getUserPlayMetrics, userPlayMetricsSchema,
  getTrackMonthlyTrending, trackMonthlyTrendingSchema,
  getUserSupporters, userSupportersSchema,
  getUserSupporting, userSupportingSchema
} from './tools/analytics.js';
import {
  getUserWallets, userWalletsSchema,
  getTransactionHistory, transactionHistorySchema,
  getAvailableChallenges, availableChallengesSchema,
  getUserClaimableTokens, userClaimableTokensSchema,
  claimTokens, claimTokensSchema,
  getTokenBalance, tokenBalanceSchema,
  sendTokens, sendTokensSchema
} from './tools/blockchain.js';
import {
  getTrackAccessGates, trackAccessGatesSchema,
  checkNftAccess, checkNftAccessSchema,
  getNftGatedSignature, nftGatedSignatureSchema,
  getPurchaseOptions, purchaseOptionsSchema,
  checkPurchaseAccess, checkPurchaseAccessSchema,
  getSupportedPaymentTokens, supportedPaymentTokensSchema,
  getUsdcGateInfo, usdcGateInfoSchema,
  sendTip, sendTipSchema,
  getSentTips, getSentTipsSchema,
  getReceivedTips, getReceivedTipsSchema,
  getUserTipStats, userTipStatsSchema,
  purchaseTrack, purchaseTrackSchema
} from './tools/monetization.js';
import {
  getNotifications, getNotificationsSchema,
  getNotificationSettings, notificationSettingsSchema,
  updateNotificationSettings, updateNotificationSettingsSchema,
  markNotificationsRead, markNotificationsReadSchema,
  markAllNotificationsRead, markAllNotificationsReadSchema,
  getAnnouncementNotifications, announcementNotificationsSchema,
  getMilestoneNotifications, milestoneNotificationsSchema,
  getNotificationCounts, notificationCountsSchema,
  getNotificationHistory, notificationHistorySchema,
  sendNotification, sendNotificationSchema
} from './tools/notifications.js';
import {
  trackResourceTemplate, handleTrackResource
} from './resources/tracks.js';
import {
  userResourceTemplate, handleUserResource
} from './resources/users.js';
import {
  playlistResourceTemplate, handlePlaylistResource,
  albumResourceTemplate, handleAlbumResource
} from './resources/playlists.js';
import {
  discoverMusicPrompt, handleDiscoverMusicPrompt
} from './prompts/music-search.js';
import {
  trackAnalysisPrompt, handleTrackAnalysisPrompt
} from './prompts/track-info.js';
import {
  artistProfilePrompt, handleArtistProfilePrompt
} from './prompts/artist-profile.js';
import {
  musicCreationPrompt, handleMusicCreationPrompt
} from './prompts/music-creation.js';
import {
  playlistCreationPrompt, handlePlaylistCreationPrompt
} from './prompts/playlist-creation.js';
import {
  messagingPrompt, handleMessagingPrompt
} from './prompts/messaging.js';
import {
  analyticsPrompt, handleAnalyticsPrompt
} from './prompts/analytics.js';
import {
  blockchainPrompt, handleBlockchainPrompt
} from './prompts/blockchain.js';
import {
  monetizationPrompt, handleMonetizationPrompt
} from './prompts/monetization.js';
import {
  notificationsPrompt, handleNotificationsPrompt
} from './prompts/notifications.js';

import { AudiusClient } from './sdk-client.js';

/**
 * Create and configure the MCP server
 */
export const createServer = () => {
  // Initialize server with configuration
  const server = new Server({
    name: config.server.name,
    version: config.server.version,
  }, {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  });
  
  // We'll get the Express app from the server if possible, otherwise we'll handle
  // the stream endpoint ourselves in a separate Express app
  let app;
  try {
    // This is implementation-specific and may not be available
    // @ts-ignore - Ignore TypeScript errors since getExpressApp may not be typed
    app = server.getExpressApp?.();
  } catch (error) {
    console.warn('Could not access Express app from MCP server. Stream endpoint will be handled by stream-server.js');
  }
  
  // If we have access to the Express app, add our stream endpoint
  if (app) {
    // Add redirect to streaming server for backward compatibility
    app.get('/stream/:trackId', (req, res) => {
      const trackId = req.params.trackId;
      const streamServerPort = process.env.STREAM_SERVER_PORT || '7070';
      const streamServerUrl = `http://localhost:${streamServerPort}/stream/${trackId}`;
      
      // Forward any query parameters
      if (req.url.includes('?')) {
        const queryString = req.url.substring(req.url.indexOf('?'));
        res.redirect(streamServerUrl + queryString);
      } else {
        res.redirect(streamServerUrl);
      }
    });
  }

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Get all registered tools from the registry
    const registeredTools = getAllToolDefinitions();
    
    // Convert to the format expected by MCP
    const toolsList = registeredTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      // Convert Zod schema to JSON Schema for MCP compatibility
      inputSchema: zodToJsonSchema(tool.schema)
    }));
    
    return {
      tools: toolsList
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    
    // Get the tool definition from the registry
    const toolDefinition = getToolDefinition(name);
    
    if (toolDefinition) {
      try {
        // Validate the input against the tool's schema
        const validatedArgs = validateToolInput(toolDefinition.schema, args);
        
        // Execute the tool with validated arguments
        // Ensure the result is a plain object (not a class instance)
        const result = await toolDefinition.execute(validatedArgs);
        // Convert to a plain object with index signature for type compatibility
        return JSON.parse(JSON.stringify(result));
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);
        return {
          content: [{
            type: 'text',
            text: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
    
    // Fall back to the legacy switch statement if needed
    switch (name) {
      // Special case for stream-track which needs context
      case 'stream-track':
        return await streamTrackTool.execute(args as any);
      case 'search-tracks':
        return await searchTracks(args as { query: string, limit?: number });
      case 'get-trending-tracks':
        return await getTrendingTracks(args as { genre?: string, limit?: number });
      case 'get-track-comments':
        return await getTrackComments(args as { trackId: string, limit?: number });
      
      // User tools
      case 'get-user':
        return await getUser(args as { userId: string });
      case 'search-users':
        return await searchUsers(args as { query: string, limit?: number });
      case 'get-user-tracks':
        return await getUserTracks(args as { userId: string, limit?: number });
      
      // Playlist & Album tools
      case 'get-playlist':
        return await getPlaylist(args as { playlistId: string });
      case 'get-album':
        return await getAlbum(args as { albumId: string });
      
      // Search tools
      case 'search-all':
        return await searchAll(args as { query: string, limit?: number });
      case 'advanced-search':
        return await advancedSearch(args as { 
          query: string;
          limit?: number;
          genres?: string[];
          moods?: string[];
          bpmMin?: number;
          bpmMax?: number;
          key?: string;
          onlyDownloadable?: boolean;
          sort?: 'relevant' | 'popular' | 'recent';
        });
      case 'trending-discovery':
        return await trendingDiscovery(args as { 
          genre?: string;
          limit?: number;
          timeFrame?: 'week' | 'month' | 'year' | 'allTime';
          underground?: boolean;
        });
      case 'similar-artists':
        return await similarArtists(args as { userId: string, limit?: number });
      
      // Social tools
      case 'user-favorites':
        return await getUserFavorites(args as { userId: string, limit?: number });
      case 'user-reposts':
        return await getUserReposts(args as { userId: string, limit?: number });
      case 'user-followers':
        return await getUserFollowers(args as { userId: string, limit?: number });
      case 'user-following':
        return await getUserFollowing(args as { userId: string, limit?: number });
      case 'is-following':
        return await isFollowing(args as { userId: string, followeeId: string });
      case 'track-favorites':
        return await getTrackFavorites(args as { trackId: string, limit?: number });
      case 'track-reposts':
        return await getTrackReposts(args as { trackId: string, limit?: number });
      case 'follow-user':
        return await followUser(args as { userId: string, followeeId: string });
      case 'favorite-track':
        return await favoriteTrack(args as { userId: string, trackId: string });
      
      // Comment tools
      case 'add-track-comment':
        return await addTrackComment(args as { trackId: string, userId: string, comment: string });
      case 'delete-track-comment':
        return await deleteTrackComment(args as { commentId: string, userId: string });
      
      // Track management tools
      case 'upload-track':
        return await uploadTrack(args as {
          userId: string;
          title: string;
          description?: string;
          genre?: string;
          mood?: string;
          tags?: string[];
          audioFileUrl: string;
          artworkUrl?: string;
          isDownloadable?: boolean;
          isPrivate?: boolean;
        });
      case 'update-track':
        return await updateTrack(args as {
          trackId: string;
          userId: string;
          title?: string;
          description?: string;
          genre?: string;
          mood?: string;
          tags?: string[];
          artworkUrl?: string;
          isDownloadable?: boolean;
          isPrivate?: boolean;
        });
      case 'delete-track':
        return await deleteTrack(args as { trackId: string, userId: string });
      
      // Playlist management tools
      case 'create-playlist':
        return await createPlaylist(args as {
          userId: string;
          playlistName: string;
          isPrivate?: boolean;
          isAlbum?: boolean;
          description?: string;
          artworkUrl?: string;
          trackIds?: string[];
        });
      case 'update-playlist':
        return await updatePlaylist(args as {
          userId: string;
          playlistId: string;
          playlistName?: string;
          isPrivate?: boolean;
          description?: string;
          artworkUrl?: string;
        });
      case 'delete-playlist':
        return await deletePlaylist(args as { userId: string, playlistId: string });
      case 'add-tracks-to-playlist':
        return await addTracksToPlaylist(args as { userId: string, playlistId: string, trackIds: string[] });
      case 'remove-track-from-playlist':
        return await removeTrackFromPlaylist(args as { userId: string, playlistId: string, trackId: string });
      case 'reorder-playlist-tracks':
        return await reorderPlaylistTracks(args as { userId: string, playlistId: string, trackIds: string[] });
      
      // Messaging tools
      case 'send-message':
        return await sendMessage(args as { fromUserId: string, toUserId: string, message: string });
      case 'get-messages':
        return await getMessages(args as { userId: string, withUserId: string, limit?: number });
      case 'get-message-threads':
        return await getMessageThreads(args as { userId: string, limit?: number });
      case 'mark-message-read':
        return await markMessageRead(args as { userId: string, messageId: string });
      
      // Analytics tools
      case 'track-listen-counts':
        return await getTrackListenCounts(args as { trackId: string });
      case 'user-track-listen-counts':
        return await getUserTrackListenCounts(args as { userId: string });
      case 'track-top-listeners':
        return await getTrackTopListeners(args as { trackId: string, limit?: number });
      case 'track-listener-insights':
        return await getTrackListenerInsights(args as { trackId: string });
      case 'user-play-metrics':
        return await getUserPlayMetrics(args as { userId: string });
      case 'track-monthly-trending':
        return await getTrackMonthlyTrending(args as { trackId: string });
      case 'user-supporters':
        return await getUserSupporters(args as { userId: string, limit?: number });
      case 'user-supporting':
        return await getUserSupporting(args as { userId: string, limit?: number });
      
      // Blockchain tools
      case 'user-wallets':
        return await getUserWallets(args as { userId: string });
      case 'transaction-history':
        return await getTransactionHistory(args as { userId: string, limit?: number });
      case 'available-challenges':
        return await getAvailableChallenges();
      case 'user-claimable-tokens':
        return await getUserClaimableTokens(args as { userId: string });
      case 'claim-tokens':
        return await claimTokens(args as { userId: string, challengeId: string });
      case 'token-balance':
        return await getTokenBalance(args as { 
          walletAddress: string, 
          blockchain: 'ethereum' | 'solana', 
          tokenMint?: string 
        });
      case 'send-tokens':
        return await sendTokens(args as { 
          senderWalletAddress: string, 
          receiverWalletAddress: string, 
          amount: string, 
          privateKey: string 
        });
      
      // Monetization tools
      case 'track-access-gates':
        return await getTrackAccessGates(args as { trackId: string });
      case 'check-nft-access':
        return await checkNftAccess(args as { trackId: string, walletAddress: string });
      case 'nft-gated-signature':
        return await getNftGatedSignature(args as { trackId: string, walletAddress: string });
      case 'purchase-options':
        return await getPurchaseOptions(args as { contentId: string, contentType: 'track' | 'playlist' });
      case 'check-purchase-access':
        return await checkPurchaseAccess(args as { 
          contentId: string, 
          contentType: 'track' | 'playlist', 
          walletAddress: string 
        });
      case 'supported-payment-tokens':
        return await getSupportedPaymentTokens();
      case 'usdc-gate-info':
        return await getUsdcGateInfo(args as { trackId: string });
      case 'purchase-track':
        return await purchaseTrack(args as {
          contentId: string;
          walletAddress: string;
          purchaseOption: string;
          paymentToken: string;
          amount: string;
          signerPrivateKey: string;
        });
      case 'send-tip':
        return await sendTip(args as { 
          senderUserId: string, 
          receiverUserId: string, 
          amount: string, 
          tokenType: 'AUDIO' | 'USDC' | 'SOL', 
          senderWalletAddress: string, 
          signerPrivateKey: string, 
          message?: string 
        });
      case 'get-sent-tips':
        return await getSentTips(args as { userId: string, limit?: number });
      case 'get-received-tips':
        return await getReceivedTips(args as { userId: string, limit?: number });
      case 'user-tip-stats':
        return await getUserTipStats(args as { userId: string });
      
      // Notification tools
      case 'get-notifications':
        return await getNotifications(args as { userId: string, limit?: number, timestamp?: string });
      case 'notification-settings':
        return await getNotificationSettings(args as { userId: string });
      case 'update-notification-settings':
        return await updateNotificationSettings(args as {
          userId: string;
          milestones?: boolean;
          followers?: boolean;
          reposts?: boolean;
          favorites?: boolean;
          messages?: boolean;
          announcements?: boolean;
          comments?: boolean;
          remixes?: boolean;
          tastemakers?: boolean;
          tips?: boolean;
          supporterRank?: boolean;
          supportingRank?: boolean;
        });
      case 'mark-notifications-read':
        return await markNotificationsRead(args as { userId: string, notificationIds: string[] });
      case 'mark-all-notifications-read':
        return await markAllNotificationsRead(args as { userId: string });
      case 'announcement-notifications':
        return await getAnnouncementNotifications(args as { limit?: number });
      case 'milestone-notifications':
        return await getMilestoneNotifications(args as { userId: string, limit?: number });
      case 'notification-counts':
        return await getNotificationCounts(args as { userId: string });
      case 'notification-history':
        return await getNotificationHistory(args as { userId: string, limit?: number });
      case 'send-notification':
        return await sendNotification(args as { 
          userId: string, 
          type: string, 
          message: string, 
          relatedEntityId?: string, 
          relatedEntityType?: string 
        });
      
      default:
        return {
          content: [{
            type: 'text',
            text: `Unknown tool: ${name}`,
          }],
          isError: true
        };
    }
  });

  // Register resource handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        trackResourceTemplate,
        userResourceTemplate,
        playlistResourceTemplate,
        albumResourceTemplate
      ]
    };
  });

  // Handle resource reading
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    let content;
    
    try {
      if (uri.startsWith('audius://track/')) {
        content = await handleTrackResource(uri);
      } else if (uri.startsWith('audius://user/')) {
        content = await handleUserResource(uri);
      } else if (uri.startsWith('audius://playlist/')) {
        content = await handlePlaylistResource(uri);
      } else if (uri.startsWith('audius://album/')) {
        content = await handleAlbumResource(uri);
      } else {
        throw new Error(`Unsupported resource URI: ${uri}`);
      }
      
      return {
        contents: [content]
      };
    } catch (error) {
      console.error(`Error reading resource ${uri}:`, error);
      throw error;
    }
  });

  // Register prompt handlers
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        discoverMusicPrompt,
        trackAnalysisPrompt,
        artistProfilePrompt,
        musicCreationPrompt,
        playlistCreationPrompt,
        messagingPrompt,
        analyticsPrompt,
        blockchainPrompt,
        monetizationPrompt,
        notificationsPrompt
      ]
    };
  });

  // Handle prompt execution
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case 'discover-music':
        return handleDiscoverMusicPrompt(args as { genre: string, artist?: string, mood?: string });
      
      case 'track-analysis':
        return handleTrackAnalysisPrompt(args as { trackId: string });
      
      case 'artist-profile':
        // Cast with type assertion to avoid TS error
        const artistProfileArgs = args as unknown as { 
          userId: string;
          includeConnections?: boolean;
          includePopularContent?: boolean;
        };
        return handleArtistProfilePrompt(artistProfileArgs);
      
      case 'music-creation':
        return handleMusicCreationPrompt(args as {
          trackTitle: string;
          userId: string;
          genre?: string;
          mood?: string;
          creationGoal?: 'publish-track' | 'remix-track' | 'collaborate' | 'plan-release';
        });
      
      case 'playlist-creation':
        // Cast with type assertion to avoid TS error
        const playlistCreationArgs = args as unknown as {
          userId: string;
          playlistName?: string;
          playlistId?: string;
          isAlbum?: boolean;
          genre?: string;
          action?: 'create' | 'update' | 'curate' | 'promote';
        };
        return handlePlaylistCreationPrompt(playlistCreationArgs);
      
      case 'messaging':
        return handleMessagingPrompt(args as {
          userId: string;
          recipientId?: string;
          initialMessage?: string;
          purpose?: 'collaboration' | 'feedback' | 'networking' | 'fanInteraction' | 'viewThreads';
        });
      
      case 'analytics':
        return handleAnalyticsPrompt(args as {
          userId?: string;
          trackId?: string;
          insightType?: 'listeners' | 'trending' | 'supporters' | 'playMetrics' | 'comprehensive';
          timePeriod?: 'week' | 'month' | 'year' | 'allTime';
        });
      
      case 'blockchain':
        return handleBlockchainPrompt(args as {
          userId?: string;
          walletAddress?: string;
          blockchain?: 'ethereum' | 'solana' | 'both';
          focus?: 'wallets' | 'tokens' | 'transactions' | 'rewards' | 'general';
        });
      
      case 'monetization':
        return handleMonetizationPrompt(args as {
          userId?: string;
          trackId?: string;
          walletAddress?: string;
          monetizationType?: 'nft-gates' | 'purchase-gates' | 'tipping' | 'usdc-payments' | 'all';
        });
      
      case 'notifications':
        // Cast with type assertion to avoid TS error
        const notificationsArgs = args as unknown as {
          userId: string;
          notificationType?: 'all' | 'milestones' | 'social' | 'announcements' | 'unread' | 'settings';
          limit?: number;
          markAsRead?: boolean;
        };
        return handleNotificationsPrompt(notificationsArgs);
      
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });

  return server;
  return server;
};

/**
 * Start both the MCP server and the audio streaming server, with clean shutdown.
 * Reads config from environment variables (no hardcoded secrets).
 */
export async function startServers() {
  // Load config from environment variables or config abstraction
  const mcpConfig = config;
  const streamPort = process.env.STREAM_SERVER_PORT ? parseInt(process.env.STREAM_SERVER_PORT, 10) : 7070;
  const streamBaseUrl = process.env.STREAM_SERVER_BASE_URL || `http://localhost:${streamPort}`;

  // Optionally, pass logger if needed
  const logger = console;

  // Start MCP server
  const mcpServer = createServer();

  // Start streaming server
  await startAudioStreamServer({
    port: streamPort,
    baseUrl: streamBaseUrl,
    logger
  });

  // Clean shutdown handler
  const shutdown = async (signal) => {
    logger.info?.(`[Shutdown] Received ${signal}, shutting down servers...`);
    // Gracefully close MCP server if supported
    if (typeof mcpServer.close === 'function') {
      try {
        await mcpServer.close();
      } catch (err) {
        logger.error?.('Error closing MCP server:', err);
      }
    }
    try {
      await stopAudioStreamServer();
    } catch (err) {
      logger.error?.('Error shutting down streaming server:', err);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info?.('All servers started. MCP and streaming endpoints are live.');
  return { mcpServer };
}

