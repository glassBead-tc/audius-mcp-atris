/**
 * Zod schemas for Audius playlist-related tool inputs
 * 
 * This file defines type-safe validation schemas for tools that
 * interact with Audius playlists.
 */

import { z } from 'zod';

/**
 * Schema for get-playlist tool
 */
export const getPlaylistSchema = z.object({
  playlistId: z.string()
    .min(1, "Playlist ID cannot be empty")
    .describe("The ID of the playlist to retrieve"),
});

export type GetPlaylistInput = z.infer<typeof getPlaylistSchema>;

/**
 * Schema for search-playlists tool
 */
export const searchPlaylistsSchema = z.object({
  query: z.string()
    .min(1, "Search query cannot be empty")
    .describe("Search query for finding playlists"),
  limit: z.number()
    .int()
    .positive()
    .default(10)
    .describe("Maximum number of results to return (default: 10)"),
});

export type SearchPlaylistsInput = z.infer<typeof searchPlaylistsSchema>;

/**
 * Schema for get-user-playlists tool
 */
export const getUserPlaylistsSchema = z.object({
  userId: z.string()
    .min(1, "User ID cannot be empty")
    .describe("The ID of the user to get playlists for"),
  limit: z.number()
    .int()
    .positive()
    .default(10)
    .describe("Maximum number of playlists to return (default: 10)"),
});

export type GetUserPlaylistsInput = z.infer<typeof getUserPlaylistsSchema>;

/**
 * Schema for create-playlist tool
 */
export const createPlaylistSchema = z.object({
  userId: z.string()
    .min(1, "User ID cannot be empty")
    .describe("The ID of the user creating the playlist"),
  name: z.string()
    .min(1, "Playlist name cannot be empty")
    .describe("Name of the playlist"),
  isPrivate: z.boolean()
    .default(false)
    .describe("Whether the playlist is private (default: false)"),
  description: z.string()
    .optional()
    .describe("Optional description for the playlist"),
  trackIds: z.array(z.string())
    .default([])
    .describe("Array of track IDs to include in the playlist"),
});

export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;

/**
 * Schema for add-track-to-playlist tool
 */
export const addTrackToPlaylistSchema = z.object({
  playlistId: z.string()
    .min(1, "Playlist ID cannot be empty")
    .describe("The ID of the playlist to add track to"),
  trackId: z.string()
    .min(1, "Track ID cannot be empty")
    .describe("The ID of the track to add"),
});

export type AddTrackToPlaylistInput = z.infer<typeof addTrackToPlaylistSchema>;

/**
 * Schema for remove-track-from-playlist tool
 */
export const removeTrackFromPlaylistSchema = z.object({
  playlistId: z.string()
    .min(1, "Playlist ID cannot be empty")
    .describe("The ID of the playlist to remove track from"),
  trackId: z.string()
    .min(1, "Track ID cannot be empty")
    .describe("The ID of the track to remove"),
});

export type RemoveTrackFromPlaylistInput = z.infer<typeof removeTrackFromPlaylistSchema>;