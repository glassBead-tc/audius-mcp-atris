import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
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
  getTrackReposts, trackRepostsSchema
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
  getUserTipStats, userTipStatsSchema
} from './tools/monetization.js';
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

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Track tools
        { name: 'get-track', description: 'Get details for a specific track', inputSchema: getTrackSchema },
        { name: 'search-tracks', description: 'Search for tracks by keyword', inputSchema: searchTracksSchema },
        { name: 'get-trending-tracks', description: 'Get trending tracks on Audius', inputSchema: getTrendingTracksSchema },
        { name: 'get-track-comments', description: 'Get comments for a specific track', inputSchema: getTrackCommentsSchema },
        
        // User tools
        { name: 'get-user', description: 'Get details for a specific user', inputSchema: getUserSchema },
        { name: 'search-users', description: 'Search for users by keyword', inputSchema: searchUsersSchema },
        { name: 'get-user-tracks', description: 'Get tracks uploaded by a specific user', inputSchema: getUserTracksSchema },
        
        // Playlist & Album tools
        { name: 'get-playlist', description: 'Get details for a specific playlist', inputSchema: getPlaylistSchema },
        { name: 'get-album', description: 'Get details for a specific album', inputSchema: getAlbumSchema },
        
        // Search tools
        { name: 'search-all', description: 'Search across all content types on Audius', inputSchema: searchAllSchema },
        { name: 'advanced-search', description: 'Advanced search for tracks with filtering by genre, mood, BPM, etc.', inputSchema: advancedSearchSchema },
        { name: 'trending-discovery', description: 'Discover trending or underground tracks with genre filtering', inputSchema: trendingDiscoverySchema },
        { name: 'similar-artists', description: 'Find artists similar to a specified artist', inputSchema: similarArtistsSchema },
        
        // Social tools
        { name: 'user-favorites', description: 'Get tracks favorited by a user', inputSchema: userFavoritesSchema },
        { name: 'user-reposts', description: 'Get content reposted by a user', inputSchema: userRepostsSchema },
        { name: 'user-followers', description: 'Get followers of a user', inputSchema: userFollowersSchema },
        { name: 'user-following', description: 'Get users followed by a user', inputSchema: userFollowingSchema },
        { name: 'is-following', description: 'Check if a user is following another user', inputSchema: isFollowingSchema },
        { name: 'track-favorites', description: 'Get users who favorited a track', inputSchema: trackFavoritesSchema },
        { name: 'track-reposts', description: 'Get users who reposted a track', inputSchema: trackRepostsSchema },
        
        // Comment tools
        { name: 'add-track-comment', description: 'Add a comment to a track', inputSchema: addTrackCommentSchema },
        { name: 'delete-track-comment', description: 'Delete a comment from a track', inputSchema: deleteTrackCommentSchema },
        
        // Track management tools
        { name: 'upload-track', description: 'Upload a new track', inputSchema: uploadTrackSchema },
        { name: 'update-track', description: 'Update an existing track', inputSchema: updateTrackSchema },
        { name: 'delete-track', description: 'Delete a track', inputSchema: deleteTrackSchema },
        
        // Playlist management tools
        { name: 'create-playlist', description: 'Create a new playlist or album', inputSchema: createPlaylistSchema },
        { name: 'update-playlist', description: 'Update an existing playlist', inputSchema: updatePlaylistSchema },
        { name: 'delete-playlist', description: 'Delete a playlist', inputSchema: deletePlaylistSchema },
        { name: 'add-tracks-to-playlist', description: 'Add tracks to a playlist', inputSchema: addTracksToPlaylistSchema },
        { name: 'remove-track-from-playlist', description: 'Remove a track from a playlist', inputSchema: removeTrackFromPlaylistSchema },
        { name: 'reorder-playlist-tracks', description: 'Reorder tracks in a playlist', inputSchema: reorderPlaylistTracksSchema },
        
        // Messaging tools
        { name: 'send-message', description: 'Send a direct message to a user', inputSchema: sendMessageSchema },
        { name: 'get-messages', description: 'Get messages between two users', inputSchema: getMessagesSchema },
        { name: 'get-message-threads', description: 'Get message threads for a user', inputSchema: getMessageThreadsSchema },
        { name: 'mark-message-read', description: 'Mark a message as read', inputSchema: markMessageReadSchema },
        
        // Analytics tools
        { name: 'track-listen-counts', description: 'Get listen counts for a track', inputSchema: trackListenCountsSchema },
        { name: 'user-track-listen-counts', description: 'Get listen counts for a user\'s tracks', inputSchema: userTrackListenCountsSchema },
        { name: 'track-top-listeners', description: 'Get top listeners for a track', inputSchema: trackTopListenersSchema },
        { name: 'track-listener-insights', description: 'Get listener insights for a track', inputSchema: trackListenerInsightsSchema },
        { name: 'user-play-metrics', description: 'Get aggregate play metrics for a user', inputSchema: userPlayMetricsSchema },
        { name: 'track-monthly-trending', description: 'Get monthly trending data for a track', inputSchema: trackMonthlyTrendingSchema },
        { name: 'user-supporters', description: 'Get supporters for a user', inputSchema: userSupportersSchema },
        { name: 'user-supporting', description: 'Get artists a user is supporting', inputSchema: userSupportingSchema },
        
        // Blockchain tools
        { name: 'user-wallets', description: 'Get wallet information for a user', inputSchema: userWalletsSchema },
        { name: 'transaction-history', description: 'Get transaction history for a user', inputSchema: transactionHistorySchema },
        { name: 'available-challenges', description: 'Get available challenges and rewards', inputSchema: availableChallengesSchema },
        { name: 'user-claimable-tokens', description: 'Get claimable tokens for a user', inputSchema: userClaimableTokensSchema },
        { name: 'claim-tokens', description: 'Claim tokens for a challenge', inputSchema: claimTokensSchema },
        { name: 'token-balance', description: 'Get token balance for a wallet', inputSchema: tokenBalanceSchema },
        { name: 'send-tokens', description: 'Send tokens from one wallet to another', inputSchema: sendTokensSchema },
        
        // Monetization tools
        { name: 'track-access-gates', description: 'Get access gates for a track', inputSchema: trackAccessGatesSchema },
        { name: 'check-nft-access', description: 'Check NFT-gated access for a track', inputSchema: checkNftAccessSchema },
        { name: 'nft-gated-signature', description: 'Get NFT-gated signature for a track', inputSchema: nftGatedSignatureSchema },
        { name: 'purchase-options', description: 'Get purchase options for content', inputSchema: purchaseOptionsSchema },
        { name: 'check-purchase-access', description: 'Check purchase-gated access for content', inputSchema: checkPurchaseAccessSchema },
        { name: 'supported-payment-tokens', description: 'Get supported payment tokens', inputSchema: supportedPaymentTokensSchema },
        { name: 'usdc-gate-info', description: 'Get USDC gate info for a track', inputSchema: usdcGateInfoSchema },
        { name: 'send-tip', description: 'Send a tip to a user', inputSchema: sendTipSchema },
        { name: 'get-sent-tips', description: 'Get tips sent by a user', inputSchema: getSentTipsSchema },
        { name: 'get-received-tips', description: 'Get tips received by a user', inputSchema: getReceivedTipsSchema },
        { name: 'user-tip-stats', description: 'Get tip statistics for a user', inputSchema: userTipStatsSchema },
      ]
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      // Track tools
      case 'get-track':
        return await getTrack(args as { trackId: string });
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
        monetizationPrompt
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
        return handleArtistProfilePrompt(args as { 
          userId: string;
          includeConnections?: boolean;
          includePopularContent?: boolean;
        });
      
      case 'music-creation':
        return handleMusicCreationPrompt(args as {
          trackTitle: string;
          userId: string;
          genre?: string;
          mood?: string;
          creationGoal?: 'publish-track' | 'remix-track' | 'collaborate' | 'plan-release';
        });
      
      case 'playlist-creation':
        return handlePlaylistCreationPrompt(args as {
          userId: string;
          playlistName?: string;
          playlistId?: string;
          isAlbum?: boolean;
          genre?: string;
          action?: 'create' | 'update' | 'curate' | 'promote';
        });
      
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
      
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });

  return server;
};