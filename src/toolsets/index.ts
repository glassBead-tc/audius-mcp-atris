import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolsetGroup, Toolset, createServerTool, jsonSchemaToZod } from './core.js';

// Import all tools and schemas
import { 
  getTrack, getTrackSchema,
  searchTracks, searchTracksSchema,
  getTrendingTracks, getTrendingTracksSchema,
  getTrackComments, getTrackCommentsSchema,
  getTrackStreamUrl, getTrackStreamUrlSchema,
  getBulkTracks, getBulkTracksSchema
} from '../tools/tracks.js';

import {
  getUser, getUserSchema,
  searchUsers, searchUsersSchema,
  getUserTracks, getUserTracksSchema,
  getBulkUsers, getBulkUsersSchema,
  getAIAttributedTracksByUserHandle, getAIAttributedTracksByUserHandleSchema,
  getLibraryTracks, getLibraryTracksSchema,
  getLibraryAlbums, getLibraryAlbumsSchema,
  getLibraryPlaylists, getLibraryPlaylistsSchema,
  getAuthorizedApps, getAuthorizedAppsSchema,
  getConnectedWallets, getConnectedWalletsSchema,
  getDeveloperApps, getDeveloperAppsSchema
} from '../tools/users.js';

import {
  getPlaylist, getPlaylistSchema,
  getAlbum, getAlbumSchema,
  getTrendingPlaylists, getTrendingPlaylistsSchema,
  getBulkPlaylists, getBulkPlaylistsSchema
} from '../tools/playlists.js';

import {
  getAlbum as getAlbumDetails, getAlbumSchema as getAlbumDetailsSchema,
  getAlbumTracks, getAlbumTracksSchema,
  getUserAlbums, getUserAlbumsSchema
} from '../tools/albums.js';

import {
  resolve, resolveSchema,
  getSdkVersion, getSdkVersionSchema
} from '../tools/core.js';

import {
  initiateOAuth, initiateOAuthSchema,
  verifyToken, verifyTokenSchema,
  exchangeCode, exchangeCodeSchema
} from '../tools/oauth.js';

import {
  searchAll, searchAllSchema,
  advancedSearch, advancedSearchSchema,
  trendingDiscovery, trendingDiscoverySchema,
  similarArtists, similarArtistsSchema
} from '../tools/search.js';

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
} from '../tools/social.js';

import {
  addTrackComment, addTrackCommentSchema,
  deleteTrackComment, deleteTrackCommentSchema
} from '../tools/comments.js';

import {
  uploadTrack, uploadTrackSchema,
  updateTrack, updateTrackSchema,
  deleteTrack, deleteTrackSchema
} from '../tools/track-management.js';

import {
  createPlaylist, createPlaylistSchema,
  updatePlaylist, updatePlaylistSchema,
  deletePlaylist, deletePlaylistSchema,
  addTracksToPlaylist, addTracksToPlaylistSchema,
  removeTrackFromPlaylist, removeTrackFromPlaylistSchema,
  reorderPlaylistTracks, reorderPlaylistTracksSchema
} from '../tools/playlist-management.js';

import {
  sendMessage, sendMessageSchema,
  getMessages, getMessagesSchema,
  getMessageThreads, getMessageThreadsSchema,
  markMessageRead, markMessageReadSchema
} from '../tools/messaging.js';

import {
  getTrackListenCounts, trackListenCountsSchema,
  getUserTrackListenCounts, userTrackListenCountsSchema,
  getTrackTopListeners, trackTopListenersSchema,
  getTrackListenerInsights, trackListenerInsightsSchema,
  getUserPlayMetrics, userPlayMetricsSchema,
  getTrackMonthlyTrending, trackMonthlyTrendingSchema,
  getUserSupporters, userSupportersSchema,
  getUserSupporting, userSupportingSchema
} from '../tools/analytics.js';

import {
  getUserWallets, userWalletsSchema,
  getTransactionHistory, transactionHistorySchema,
  getAvailableChallenges, availableChallengesSchema,
  getUserClaimableTokens, userClaimableTokensSchema,
  claimTokens, claimTokensSchema,
  getTokenBalance, tokenBalanceSchema,
  sendTokens, sendTokensSchema
} from '../tools/blockchain.js';

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
} from '../tools/monetization.js';

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
} from '../tools/notifications.js';

// Default toolsets to enable
export const DefaultToolsets = ['all'];

/**
 * Initialize all toolsets and return the toolset group
 * @param enabledToolsets List of toolsets to enable
 * @param readOnly Whether to operate in read-only mode
 */
export function initToolsets(enabledToolsets: string[] = DefaultToolsets, readOnly: boolean = false): ToolsetGroup {
  // Create a new toolset group
  const toolsetGroup = new ToolsetGroup(readOnly);

  // 1. Tracks Toolset
  const trackTools = new Toolset('tracks', 'Audius Track-related tools');
  
  // Read-only track tools
  trackTools.addReadTools(
    createServerTool('get-track', getTrackSchema, getTrack, true, 'Get track details by ID'),
    createServerTool('search-tracks', searchTracksSchema, searchTracks, true, 'Search for tracks by query'),
    createServerTool('get-trending-tracks', getTrendingTracksSchema, getTrendingTracks, true, 'Get trending tracks'),
    createServerTool('get-track-comments', getTrackCommentsSchema, getTrackComments, true, 'Get comments for a track'),
    createServerTool('get-track-stream-url', getTrackStreamUrlSchema, getTrackStreamUrl, true, 'Get stream URL for a track'),
    createServerTool('get-bulk-tracks', getBulkTracksSchema, getBulkTracks, true, 'Get multiple tracks by IDs')
  );
  
  // 2. Track Management Toolset (write operations)
  const trackManagementTools = new Toolset('track-management', 'Audius Track management tools');
  
  trackManagementTools.addWriteTools(
    createServerTool('upload-track', uploadTrackSchema, uploadTrack, false, 'Upload a new track'),
    createServerTool('update-track', updateTrackSchema, updateTrack, false, 'Update an existing track'),
    createServerTool('delete-track', deleteTrackSchema, deleteTrack, false, 'Delete a track')
  );

  // 3. Users Toolset
  const userTools = new Toolset('users', 'Audius User-related tools');
  
  userTools.addReadTools(
    createServerTool('get-user', getUserSchema, getUser, true, 'Get user details by ID'),
    createServerTool('search-users', searchUsersSchema, searchUsers, true, 'Search for users'),
    createServerTool('get-user-tracks', getUserTracksSchema, getUserTracks, true, 'Get tracks for a user'),
    createServerTool('get-bulk-users', getBulkUsersSchema, getBulkUsers, true, 'Get multiple users by IDs'),
    createServerTool('get-ai-attributed-tracks-by-handle', getAIAttributedTracksByUserHandleSchema, getAIAttributedTracksByUserHandle, true, 'Get AI-attributed tracks by user handle'),
    createServerTool('get-library-tracks', getLibraryTracksSchema, getLibraryTracks, true, 'Get library tracks for a user'),
    createServerTool('get-library-albums', getLibraryAlbumsSchema, getLibraryAlbums, true, 'Get library albums for a user'),
    createServerTool('get-library-playlists', getLibraryPlaylistsSchema, getLibraryPlaylists, true, 'Get library playlists for a user'),
    createServerTool('get-authorized-apps', getAuthorizedAppsSchema, getAuthorizedApps, true, 'Get authorized apps for a user'),
    createServerTool('get-connected-wallets', getConnectedWalletsSchema, getConnectedWallets, true, 'Get connected wallets for a user'),
    createServerTool('get-developer-apps', getDeveloperAppsSchema, getDeveloperApps, true, 'Get developer apps for a user')
  );

  // 4. Playlists Toolset
  const playlistTools = new Toolset('playlists', 'Audius Playlist-related tools');
  
  playlistTools.addReadTools(
    createServerTool('get-playlist', getPlaylistSchema, getPlaylist, true, 'Get playlist details'),
    createServerTool('get-album', getAlbumSchema, getAlbum, true, 'Get album details'),
    createServerTool('get-trending-playlists', getTrendingPlaylistsSchema, getTrendingPlaylists, true, 'Get trending playlists'),
    createServerTool('get-bulk-playlists', getBulkPlaylistsSchema, getBulkPlaylists, true, 'Get multiple playlists by IDs')
  );

  // 5. Albums Toolset
  const albumTools = new Toolset('albums', 'Audius Album-specific tools');
  
  albumTools.addReadTools(
    createServerTool('get-album-details', getAlbumDetailsSchema, getAlbumDetails, true, 'Get album details'),
    createServerTool('get-album-tracks', getAlbumTracksSchema, getAlbumTracks, true, 'Get tracks in an album'),
    createServerTool('get-user-albums', getUserAlbumsSchema, getUserAlbums, true, 'Get albums for a user')
  );

  // 6. Playlist Management Toolset
  const playlistManagementTools = new Toolset('playlist-management', 'Audius Playlist management tools');
  
  playlistManagementTools.addWriteTools(
    createServerTool('create-playlist', createPlaylistSchema, createPlaylist, false, 'Create a new playlist'),
    createServerTool('update-playlist', updatePlaylistSchema, updatePlaylist, false, 'Update an existing playlist'),
    createServerTool('delete-playlist', deletePlaylistSchema, deletePlaylist, false, 'Delete a playlist'),
    createServerTool('add-tracks-to-playlist', addTracksToPlaylistSchema, addTracksToPlaylist, false, 'Add tracks to a playlist'),
    createServerTool('remove-track-from-playlist', removeTrackFromPlaylistSchema, removeTrackFromPlaylist, false, 'Remove a track from a playlist'),
    createServerTool('reorder-playlist-tracks', reorderPlaylistTracksSchema, reorderPlaylistTracks, false, 'Reorder tracks in a playlist')
  );

  // 7. Search Toolset
  const searchTools = new Toolset('search', 'Audius Search tools');
  
  searchTools.addReadTools(
    createServerTool('search-all', searchAllSchema, searchAll, true, 'Search across all Audius content'),
    createServerTool('advanced-search', advancedSearchSchema, advancedSearch, true, 'Advanced search with filters'),
    createServerTool('trending-discovery', trendingDiscoverySchema, trendingDiscovery, true, 'Discover trending content'),
    createServerTool('similar-artists', similarArtistsSchema, similarArtists, true, 'Find artists similar to a given artist')
  );

  // 7. Social Toolset
  const socialTools = new Toolset('social', 'Audius Social interaction tools');
  
  socialTools.addReadTools(
    createServerTool('user-favorites', userFavoritesSchema, getUserFavorites, true, 'Get user favorites'),
    createServerTool('user-reposts', userRepostsSchema, getUserReposts, true, 'Get user reposts'),
    createServerTool('user-followers', userFollowersSchema, getUserFollowers, true, 'Get user followers'),
    createServerTool('user-following', userFollowingSchema, getUserFollowing, true, 'Get users that a user follows'),
    createServerTool('is-following', isFollowingSchema, isFollowing, true, 'Check if a user follows another user'),
    createServerTool('track-favorites', trackFavoritesSchema, getTrackFavorites, true, 'Get users who favorited a track'),
    createServerTool('track-reposts', trackRepostsSchema, getTrackReposts, true, 'Get users who reposted a track')
  );

  socialTools.addWriteTools(
    createServerTool('follow-user', followUserSchema, followUser, false, 'Follow a user'),
    createServerTool('favorite-track', favoriteTrackSchema, favoriteTrack, false, 'Favorite a track')
  );

  // 8. Comments Toolset
  const commentTools = new Toolset('comments', 'Audius Comment tools');
  
  commentTools.addWriteTools(
    createServerTool('add-track-comment', addTrackCommentSchema, addTrackComment, false, 'Add a comment to a track'),
    createServerTool('delete-track-comment', deleteTrackCommentSchema, deleteTrackComment, false, 'Delete a track comment')
  );

  // 9. Messaging Toolset
  const messagingTools = new Toolset('messaging', 'Audius Messaging tools');
  
  messagingTools.addReadTools(
    createServerTool('get-messages', getMessagesSchema, getMessages, true, 'Get messages between users'),
    createServerTool('get-message-threads', getMessageThreadsSchema, getMessageThreads, true, 'Get message threads for a user')
  );
  
  messagingTools.addWriteTools(
    createServerTool('send-message', sendMessageSchema, sendMessage, false, 'Send a message to a user'),
    createServerTool('mark-message-read', markMessageReadSchema, markMessageRead, false, 'Mark a message as read')
  );

  // 10. Analytics Toolset
  const analyticsTools = new Toolset('analytics', 'Audius Analytics tools');
  
  analyticsTools.addReadTools(
    createServerTool('get-track-listen-counts', trackListenCountsSchema, getTrackListenCounts, true, 'Get listen counts for a track'),
    createServerTool('get-user-track-listen-counts', userTrackListenCountsSchema, getUserTrackListenCounts, true, 'Get listen counts for a user\'s tracks'),
    createServerTool('get-track-top-listeners', trackTopListenersSchema, getTrackTopListeners, true, 'Get top listeners for a track'),
    createServerTool('get-track-listener-insights', trackListenerInsightsSchema, getTrackListenerInsights, true, 'Get listener insights for a track'),
    createServerTool('get-user-play-metrics', userPlayMetricsSchema, getUserPlayMetrics, true, 'Get play metrics for a user'),
    createServerTool('get-track-monthly-trending', trackMonthlyTrendingSchema, getTrackMonthlyTrending, true, 'Get monthly trending data for a track'),
    createServerTool('get-user-supporters', userSupportersSchema, getUserSupporters, true, 'Get supporters for a user'),
    createServerTool('get-user-supporting', userSupportingSchema, getUserSupporting, true, 'Get users that a user is supporting')
  );

  // 11. Blockchain Toolset
  const blockchainTools = new Toolset('blockchain', 'Audius Blockchain-related tools');
  
  blockchainTools.addReadTools(
    createServerTool('get-user-wallets', userWalletsSchema, getUserWallets, true, 'Get wallets associated with a user'),
    createServerTool('get-transaction-history', transactionHistorySchema, getTransactionHistory, true, 'Get transaction history'),
    createServerTool('get-available-challenges', availableChallengesSchema, getAvailableChallenges, true, 'Get available challenges'),
    createServerTool('get-user-claimable-tokens', userClaimableTokensSchema, getUserClaimableTokens, true, 'Get claimable tokens for a user'),
    createServerTool('get-token-balance', tokenBalanceSchema, getTokenBalance, true, 'Get token balance')
  );
  
  blockchainTools.addWriteTools(
    createServerTool('claim-tokens', claimTokensSchema, claimTokens, false, 'Claim tokens'),
    createServerTool('send-tokens', sendTokensSchema, sendTokens, false, 'Send tokens')
  );

  // 12. Monetization Toolset
  const monetizationTools = new Toolset('monetization', 'Audius Monetization tools');
  
  monetizationTools.addReadTools(
    createServerTool('get-track-access-gates', trackAccessGatesSchema, getTrackAccessGates, true, 'Get access gates for a track'),
    createServerTool('check-nft-access', checkNftAccessSchema, checkNftAccess, true, 'Check NFT access'),
    createServerTool('get-purchase-options', purchaseOptionsSchema, getPurchaseOptions, true, 'Get purchase options'),
    createServerTool('check-purchase-access', checkPurchaseAccessSchema, checkPurchaseAccess, true, 'Check purchase access'),
    createServerTool('get-supported-payment-tokens', supportedPaymentTokensSchema, getSupportedPaymentTokens, true, 'Get supported payment tokens'),
    createServerTool('get-usdc-gate-info', usdcGateInfoSchema, getUsdcGateInfo, true, 'Get USDC gate info'),
    createServerTool('get-sent-tips', getSentTipsSchema, getSentTips, true, 'Get sent tips'),
    createServerTool('get-received-tips', getReceivedTipsSchema, getReceivedTips, true, 'Get received tips'),
    createServerTool('get-user-tip-stats', userTipStatsSchema, getUserTipStats, true, 'Get tip stats for a user')
  );
  
  monetizationTools.addWriteTools(
    createServerTool('get-nft-gated-signature', nftGatedSignatureSchema, getNftGatedSignature, false, 'Get NFT gated signature'),
    createServerTool('send-tip', sendTipSchema, sendTip, false, 'Send a tip'),
    createServerTool('purchase-track', purchaseTrackSchema, purchaseTrack, false, 'Purchase a track')
  );

  // 13. Notifications Toolset
  const notificationTools = new Toolset('notifications', 'Audius Notification tools');
  
  notificationTools.addReadTools(
    createServerTool('get-notifications', getNotificationsSchema, getNotifications, true, 'Get notifications'),
    createServerTool('get-notification-settings', notificationSettingsSchema, getNotificationSettings, true, 'Get notification settings'),
    createServerTool('get-announcement-notifications', announcementNotificationsSchema, getAnnouncementNotifications, true, 'Get announcement notifications'),
    createServerTool('get-milestone-notifications', milestoneNotificationsSchema, getMilestoneNotifications, true, 'Get milestone notifications'),
    createServerTool('get-notification-counts', notificationCountsSchema, getNotificationCounts, true, 'Get notification counts'),
    createServerTool('get-notification-history', notificationHistorySchema, getNotificationHistory, true, 'Get notification history')
  );
  
  notificationTools.addWriteTools(
    createServerTool('update-notification-settings', updateNotificationSettingsSchema, updateNotificationSettings, false, 'Update notification settings'),
    createServerTool('mark-notifications-read', markNotificationsReadSchema, markNotificationsRead, false, 'Mark notifications as read'),
    createServerTool('mark-all-notifications-read', markAllNotificationsReadSchema, markAllNotificationsRead, false, 'Mark all notifications as read'),
    createServerTool('send-notification', sendNotificationSchema, sendNotification, false, 'Send a notification')
  );

  // 14. Core Toolset
  const coreTools = new Toolset('core', 'Core Audius functionality');
  
  coreTools.addReadTools(
    createServerTool('resolve', resolveSchema, resolve, true, 'Resolve Audius URLs to entities'),
    createServerTool('get-sdk-version', getSdkVersionSchema, getSdkVersion, true, 'Get SDK and server version info')
  );

  // 15. OAuth Toolset
  const oauthTools = new Toolset('oauth', 'OAuth authentication tools');
  
  oauthTools.addReadTools(
    createServerTool('initiate-oauth', initiateOAuthSchema, initiateOAuth, true, 'Start OAuth authorization flow'),
    createServerTool('verify-token', verifyTokenSchema, verifyToken, true, 'Verify JWT token from OAuth'),
    createServerTool('exchange-code', exchangeCodeSchema, exchangeCode, true, 'Exchange authorization code for token')
  );

  // Add all toolsets to the group
  toolsetGroup.addToolset(trackTools);
  toolsetGroup.addToolset(trackManagementTools);
  toolsetGroup.addToolset(userTools);
  toolsetGroup.addToolset(playlistTools);
  toolsetGroup.addToolset(albumTools);
  toolsetGroup.addToolset(playlistManagementTools);
  toolsetGroup.addToolset(searchTools);
  toolsetGroup.addToolset(socialTools);
  toolsetGroup.addToolset(commentTools);
  toolsetGroup.addToolset(messagingTools);
  toolsetGroup.addToolset(analyticsTools);
  toolsetGroup.addToolset(blockchainTools);
  toolsetGroup.addToolset(monetizationTools);
  toolsetGroup.addToolset(notificationTools);
  toolsetGroup.addToolset(coreTools);
  toolsetGroup.addToolset(oauthTools);

  // Enable the requested toolsets
  toolsetGroup.enableToolsets(enabledToolsets);

  return toolsetGroup;
}

/**
 * Register all resources with the MCP server
 */
export function registerResources(server: McpServer): void {
  // These can be implemented from the existing resource registrations
  // For now, we'll keep this as a placeholder
}