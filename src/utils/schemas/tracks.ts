/**
 * Zod schemas for Audius track-related tool inputs
 * 
 * This file defines type-safe validation schemas for tools that
 * interact with Audius tracks.
 */

import { z } from 'zod';

/**
 * Schema for get-track tool
 */
export const getTrackSchema = z.object({
  trackId: z.string()
    .min(1, "Track ID cannot be empty")
    .describe("The ID of the track to retrieve"),
});

export type GetTrackInput = z.infer<typeof getTrackSchema>;

/**
 * Schema for search-tracks tool
 */
export const searchTracksSchema = z.object({
  query: z.string()
    .min(1, "Search query cannot be empty")
    .describe("Search query for finding tracks"),
  limit: z.number()
    .int()
    .positive()
    .default(10)
    .describe("Maximum number of results to return (default: 10)"),
});

export type SearchTracksInput = z.infer<typeof searchTracksSchema>;

/**
 * Schema for get-trending-tracks tool
 */
export const getTrendingTracksSchema = z.object({
  genre: z.string()
    .optional()
    .describe("Genre to filter by (optional)"),
  limit: z.number()
    .int()
    .positive()
    .default(10)
    .describe("Maximum number of results to return (default: 10)"),
});

export type GetTrendingTracksInput = z.infer<typeof getTrendingTracksSchema>;

/**
 * Schema for get-track-comments tool
 */
export const getTrackCommentsSchema = z.object({
  trackId: z.string()
    .min(1, "Track ID cannot be empty")
    .describe("The ID of the track to get comments for"),
  limit: z.number()
    .int()
    .positive()
    .default(10)
    .describe("Maximum number of comments to return (default: 10)"),
});

export type GetTrackCommentsInput = z.infer<typeof getTrackCommentsSchema>;

/**
 * Schema for stream-track tool
 */
export const streamTrackSchema = z.object({
  trackId: z.string()
    .min(1, "Track ID cannot be empty")
    .describe("Audius track ID to stream"),
  userId: z.string()
    .optional()
    .describe("Optional user ID"),
  apiKey: z.string()
    .optional()
    .describe("Optional API key"),
  preview: z.boolean()
    .optional()
    .describe("If true, stream a preview clip"),
  skipPlayCount: z.boolean()
    .optional()
    .describe("If true, do not increment play count"),
});

export type StreamTrackInput = z.infer<typeof streamTrackSchema>;