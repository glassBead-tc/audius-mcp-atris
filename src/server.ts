import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { config } from './config.js';
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
  handleTrackResource
} from './resources/tracks.js';
import {
  handleUserResource
} from './resources/users.js';
import {
  handlePlaylistResource,
  handleAlbumResource
} from './resources/playlists.js';
import {
  handleDiscoverMusicPrompt
} from './prompts/music-search.js';
import {
  handleTrackAnalysisPrompt
} from './prompts/track-info.js';
import {
  handleArtistProfilePrompt
} from './prompts/artist-profile.js';
import {
  handleMusicCreationPrompt
} from './prompts/music-creation.js';
import {
  handlePlaylistCreationPrompt
} from './prompts/playlist-creation.js';
import {
  handleMessagingPrompt
} from './prompts/messaging.js';
import {
  handleAnalyticsPrompt
} from './prompts/analytics.js';
import {
  handleBlockchainPrompt
} from './prompts/blockchain.js';
import {
  handleMonetizationPrompt
} from './prompts/monetization.js';
import {
  handleNotificationsPrompt
} from './prompts/notifications.js';

// Helper to convert JSON Schema to Zod schema
const jsonSchemaToZod = (schema: any) => {
  // In a complete implementation, this would convert JSON Schema to Zod schema
  // For now, we'll extract properties and create a Zod object schema
  if (schema.type === 'object' && schema.properties) {
    const zodProps: Record<string, z.ZodTypeAny> = {};
    
    for (const [key, prop] of Object.entries(schema.properties) as [string, any][]) {
      if (prop.type === 'string') {
        zodProps[key] = schema.required?.includes(key) 
          ? z.string() 
          : z.string().optional();
      } else if (prop.type === 'number') {
        zodProps[key] = schema.required?.includes(key) 
          ? z.number() 
          : z.number().optional();
      } else if (prop.type === 'boolean') {
        zodProps[key] = schema.required?.includes(key) 
          ? z.boolean() 
          : z.boolean().optional();
      } else if (prop.type === 'array') {
        // Handle array types
        let itemType: z.ZodTypeAny = z.any();
        if (prop.items?.type === 'string') {
          itemType = z.string();
        } else if (prop.items?.type === 'number') {
          itemType = z.number();
        } else if (prop.items?.type === 'boolean') {
          itemType = z.boolean();
        }
        
        zodProps[key] = schema.required?.includes(key)
          ? z.array(itemType)
          : z.array(itemType).optional();
      } else if (prop.type === 'object' && prop.properties) {
        // Handle nested objects recursively
        const nestedProps = jsonSchemaToZod(prop);
        zodProps[key] = schema.required?.includes(key)
          ? z.object(nestedProps)
          : z.object(nestedProps).optional();
      } else if (prop.enum) {
        // Handle enum types
        zodProps[key] = schema.required?.includes(key)
          ? z.enum(prop.enum)
          : z.enum(prop.enum).optional();
      } else {
        // For simplicity, treat other types as passthrough
        zodProps[key] = schema.required?.includes(key) 
          ? z.any() 
          : z.any().optional();
      }
    }
    
    // Return the raw shape object for use with tool registration
    return zodProps;
  }
  
  // Fallback for other schema types
  return {}; // Return empty object as ZodRawShape
};

/**
 * Create and configure the MCP server
 */
export const createServer = () => {
  // Initialize server with McpServer
  const server = new McpServer({
    name: config.server.name,
    version: config.server.version,
  });

  // Register Resources
  
  // Track resource
  server.resource(
    'track',
    new ResourceTemplate('audius://track/{id}', { list: undefined }),
    handleTrackResource
  );
  
  // User resource
  server.resource(
    'user',
    new ResourceTemplate('audius://user/{id}', { list: undefined }),
    handleUserResource
  );
  
  // Playlist resource
  server.resource(
    'playlist',
    new ResourceTemplate('audius://playlist/{id}', { list: undefined }),
    handlePlaylistResource
  );
  
  // Album resource
  server.resource(
    'album',
    new ResourceTemplate('audius://album/{id}', { list: undefined }),
    handleAlbumResource
  );
  
  // Register Track Tools
  server.tool(
    'get-track',
    jsonSchemaToZod(getTrackSchema),
    getTrack
  );
  
  server.tool(
    'search-tracks',
    jsonSchemaToZod(searchTracksSchema),
    searchTracks
  );
  
  server.tool(
    'get-trending-tracks',
    jsonSchemaToZod(getTrendingTracksSchema),
    getTrendingTracks
  );
  
  server.tool(
    'get-track-comments',
    jsonSchemaToZod(getTrackCommentsSchema),
    getTrackComments
  );
  
  // Register User Tools
  server.tool(
    'get-user',
    jsonSchemaToZod(getUserSchema),
    getUser
  );
  
  server.tool(
    'search-users',
    jsonSchemaToZod(searchUsersSchema),
    searchUsers
  );
  
  server.tool(
    'get-user-tracks',
    jsonSchemaToZod(getUserTracksSchema),
    getUserTracks
  );
  
  // Register Playlist & Album Tools
  server.tool(
    'get-playlist',
    jsonSchemaToZod(getPlaylistSchema),
    getPlaylist
  );
  
  server.tool(
    'get-album',
    jsonSchemaToZod(getAlbumSchema),
    getAlbum
  );
  
  // Register Search Tools
  server.tool(
    'search-all',
    jsonSchemaToZod(searchAllSchema),
    searchAll
  );
  
  server.tool(
    'advanced-search',
    jsonSchemaToZod(advancedSearchSchema),
    advancedSearch
  );
  
  server.tool(
    'trending-discovery',
    jsonSchemaToZod(trendingDiscoverySchema),
    trendingDiscovery
  );
  
  server.tool(
    'similar-artists',
    jsonSchemaToZod(similarArtistsSchema),
    similarArtists
  );
  
  // Register Social Tools
  server.tool(
    'user-favorites',
    jsonSchemaToZod(userFavoritesSchema),
    getUserFavorites
  );
  
  server.tool(
    'user-reposts',
    jsonSchemaToZod(userRepostsSchema),
    getUserReposts
  );
  
  server.tool(
    'user-followers',
    jsonSchemaToZod(userFollowersSchema),
    getUserFollowers
  );
  
  server.tool(
    'user-following',
    jsonSchemaToZod(userFollowingSchema),
    getUserFollowing
  );
  
  server.tool(
    'is-following',
    jsonSchemaToZod(isFollowingSchema),
    isFollowing
  );
  
  server.tool(
    'track-favorites',
    jsonSchemaToZod(trackFavoritesSchema),
    getTrackFavorites
  );
  
  server.tool(
    'track-reposts',
    jsonSchemaToZod(trackRepostsSchema),
    getTrackReposts
  );
  
  server.tool(
    'follow-user',
    jsonSchemaToZod(followUserSchema),
    followUser
  );
  
  server.tool(
    'favorite-track',
    jsonSchemaToZod(favoriteTrackSchema),
    favoriteTrack
  );
  
  // Register Comment Tools
  server.tool(
    'add-track-comment',
    jsonSchemaToZod(addTrackCommentSchema),
    addTrackComment
  );
  
  server.tool(
    'delete-track-comment',
    jsonSchemaToZod(deleteTrackCommentSchema),
    deleteTrackComment
  );
  
  // Register Track Management Tools
  server.tool(
    'upload-track',
    jsonSchemaToZod(uploadTrackSchema),
    uploadTrack
  );
  
  server.tool(
    'update-track',
    jsonSchemaToZod(updateTrackSchema),
    updateTrack
  );
  
  server.tool(
    'delete-track',
    jsonSchemaToZod(deleteTrackSchema),
    deleteTrack
  );
  
  // Register Playlist Management Tools
  server.tool(
    'create-playlist',
    jsonSchemaToZod(createPlaylistSchema),
    createPlaylist
  );
  
  server.tool(
    'update-playlist',
    jsonSchemaToZod(updatePlaylistSchema),
    updatePlaylist
  );
  
  server.tool(
    'delete-playlist',
    jsonSchemaToZod(deletePlaylistSchema),
    deletePlaylist
  );
  
  server.tool(
    'add-tracks-to-playlist',
    jsonSchemaToZod(addTracksToPlaylistSchema),
    addTracksToPlaylist
  );
  
  server.tool(
    'remove-track-from-playlist',
    jsonSchemaToZod(removeTrackFromPlaylistSchema),
    removeTrackFromPlaylist
  );
  
  server.tool(
    'reorder-playlist-tracks',
    jsonSchemaToZod(reorderPlaylistTracksSchema),
    reorderPlaylistTracks
  );
  
  // Register Messaging Tools
  server.tool(
    'send-message',
    jsonSchemaToZod(sendMessageSchema),
    sendMessage
  );
  
  server.tool(
    'get-messages',
    jsonSchemaToZod(getMessagesSchema),
    getMessages
  );
  
  server.tool(
    'get-message-threads',
    jsonSchemaToZod(getMessageThreadsSchema),
    getMessageThreads
  );
  
  server.tool(
    'mark-message-read',
    jsonSchemaToZod(markMessageReadSchema),
    markMessageRead
  );
  
  // Register Analytics Tools
  server.tool(
    'get-track-listen-counts',
    jsonSchemaToZod(trackListenCountsSchema),
    getTrackListenCounts
  );
  
  server.tool(
    'get-user-track-listen-counts',
    jsonSchemaToZod(userTrackListenCountsSchema),
    getUserTrackListenCounts
  );
  
  server.tool(
    'get-track-top-listeners',
    jsonSchemaToZod(trackTopListenersSchema),
    getTrackTopListeners
  );
  
  server.tool(
    'get-track-listener-insights',
    jsonSchemaToZod(trackListenerInsightsSchema),
    getTrackListenerInsights
  );
  
  server.tool(
    'get-user-play-metrics',
    jsonSchemaToZod(userPlayMetricsSchema),
    getUserPlayMetrics
  );
  
  server.tool(
    'get-track-monthly-trending',
    jsonSchemaToZod(trackMonthlyTrendingSchema),
    getTrackMonthlyTrending
  );
  
  server.tool(
    'get-user-supporters',
    jsonSchemaToZod(userSupportersSchema),
    getUserSupporters
  );
  
  server.tool(
    'get-user-supporting',
    jsonSchemaToZod(userSupportingSchema),
    getUserSupporting
  );
  
  // Register Blockchain Tools
  server.tool(
    'get-user-wallets',
    jsonSchemaToZod(userWalletsSchema),
    getUserWallets
  );
  
  server.tool(
    'get-transaction-history',
    jsonSchemaToZod(transactionHistorySchema),
    getTransactionHistory
  );
  
  server.tool(
    'get-available-challenges',
    jsonSchemaToZod(availableChallengesSchema),
    getAvailableChallenges
  );
  
  server.tool(
    'get-user-claimable-tokens',
    jsonSchemaToZod(userClaimableTokensSchema),
    getUserClaimableTokens
  );
  
  server.tool(
    'claim-tokens',
    jsonSchemaToZod(claimTokensSchema),
    claimTokens
  );
  
  server.tool(
    'get-token-balance',
    jsonSchemaToZod(tokenBalanceSchema),
    getTokenBalance
  );
  
  server.tool(
    'send-tokens',
    jsonSchemaToZod(sendTokensSchema),
    sendTokens
  );
  
  // Register Monetization Tools
  server.tool(
    'get-track-access-gates',
    jsonSchemaToZod(trackAccessGatesSchema),
    getTrackAccessGates
  );
  
  server.tool(
    'check-nft-access',
    jsonSchemaToZod(checkNftAccessSchema),
    checkNftAccess
  );
  
  server.tool(
    'get-nft-gated-signature',
    jsonSchemaToZod(nftGatedSignatureSchema),
    getNftGatedSignature
  );
  
  server.tool(
    'get-purchase-options',
    jsonSchemaToZod(purchaseOptionsSchema),
    getPurchaseOptions
  );
  
  server.tool(
    'check-purchase-access',
    jsonSchemaToZod(checkPurchaseAccessSchema),
    checkPurchaseAccess
  );
  
  server.tool(
    'get-supported-payment-tokens',
    jsonSchemaToZod(supportedPaymentTokensSchema),
    getSupportedPaymentTokens
  );
  
  server.tool(
    'get-usdc-gate-info',
    jsonSchemaToZod(usdcGateInfoSchema),
    getUsdcGateInfo
  );
  
  server.tool(
    'send-tip',
    jsonSchemaToZod(sendTipSchema),
    sendTip
  );
  
  server.tool(
    'get-sent-tips',
    jsonSchemaToZod(getSentTipsSchema),
    getSentTips
  );
  
  server.tool(
    'get-received-tips',
    jsonSchemaToZod(getReceivedTipsSchema),
    getReceivedTips
  );
  
  server.tool(
    'get-user-tip-stats',
    jsonSchemaToZod(userTipStatsSchema),
    getUserTipStats
  );
  
  server.tool(
    'purchase-track',
    jsonSchemaToZod(purchaseTrackSchema),
    purchaseTrack
  );
  
  // Register Notification Tools
  server.tool(
    'get-notifications',
    jsonSchemaToZod(getNotificationsSchema),
    getNotifications
  );
  
  server.tool(
    'get-notification-settings',
    jsonSchemaToZod(notificationSettingsSchema),
    getNotificationSettings
  );
  
  server.tool(
    'update-notification-settings',
    jsonSchemaToZod(updateNotificationSettingsSchema),
    updateNotificationSettings
  );
  
  server.tool(
    'mark-notifications-read',
    jsonSchemaToZod(markNotificationsReadSchema),
    markNotificationsRead
  );
  
  server.tool(
    'mark-all-notifications-read',
    jsonSchemaToZod(markAllNotificationsReadSchema),
    markAllNotificationsRead
  );
  
  server.tool(
    'get-announcement-notifications',
    jsonSchemaToZod(announcementNotificationsSchema),
    getAnnouncementNotifications
  );
  
  server.tool(
    'get-milestone-notifications',
    jsonSchemaToZod(milestoneNotificationsSchema),
    getMilestoneNotifications
  );
  
  server.tool(
    'get-notification-counts',
    jsonSchemaToZod(notificationCountsSchema),
    getNotificationCounts
  );
  
  server.tool(
    'get-notification-history',
    jsonSchemaToZod(notificationHistorySchema),
    getNotificationHistory
  );
  
  server.tool(
    'send-notification',
    jsonSchemaToZod(sendNotificationSchema),
    sendNotification
  );
  
  // Register Prompts
  server.prompt(
    'discover-music',
    { 
      query: z.string(),
      artist: z.string().optional(),
      mood: z.string().optional(),
      bpmRange: z.string().optional(),
      underground: z.string().optional(), // Convert boolean to string
      discoveryMode: z.string().optional() // Convert enum to string
    },
    handleDiscoverMusicPrompt
  );
  
  server.prompt(
    'track-analysis',
    { trackId: z.string() },
    handleTrackAnalysisPrompt
  );
  
  server.prompt(
    'artist-profile',
    { 
      userId: z.string(),
      includeConnections: z.string().optional(), // Convert boolean to string
      includePopularContent: z.string().optional() // Convert boolean to string
    },
    handleArtistProfilePrompt
  );
  
  server.prompt(
    'music-creation',
    { 
      trackTitle: z.string(),
      userId: z.string(), 
      genre: z.string().optional(),
      mood: z.string().optional(),
      creationGoal: z.string().optional() // Convert enum to string
    },
    handleMusicCreationPrompt
  );
  
  server.prompt(
    'playlist-creation',
    { 
      userId: z.string(),
      playlistName: z.string().optional(),
      playlistId: z.string().optional(),
      isAlbum: z.string().optional(), // Convert boolean to string
      genre: z.string().optional(),
      action: z.string().optional() // Convert enum to string
    },
    handlePlaylistCreationPrompt
  );
  
  server.prompt(
    'messaging',
    { 
      userId: z.string(), 
      recipientId: z.string().optional(),
      initialMessage: z.string().optional(),
      purpose: z.string().optional() // Convert enum to string
    },
    handleMessagingPrompt
  );
  
  server.prompt(
    'analytics',
    { 
      userId: z.string().optional(), 
      trackId: z.string().optional(),
      insightType: z.string().optional(), // Convert enum to string
      timePeriod: z.string().optional() // Convert enum to string
    },
    handleAnalyticsPrompt
  );
  
  server.prompt(
    'blockchain',
    { 
      userId: z.string().optional(),
      walletAddress: z.string().optional(),
      blockchain: z.string().optional(), // Convert enum to string
      focus: z.string().optional() // Convert enum to string
    },
    handleBlockchainPrompt
  );
  
  server.prompt(
    'monetization',
    { 
      userId: z.string().optional(),
      trackId: z.string().optional(),
      walletAddress: z.string().optional(),
      monetizationType: z.string().optional() // Convert enum to string
    },
    handleMonetizationPrompt
  );
  
  server.prompt(
    'notifications',
    { 
      userId: z.string(),
      notificationType: z.string().optional(),
      limit: z.string().optional(),
      markAsRead: z.string().optional()
    },
    handleNotificationsPrompt
  );

  return server;
};