/**
 * Zod schemas for Audius user-related tool inputs
 * 
 * This file defines type-safe validation schemas for tools that
 * interact with Audius users.
 */

import { z } from 'zod';

/**
 * Schema for get-user tool
 */
export const getUserSchema = z.object({
  userId: z.string()
    .min(1, "User ID cannot be empty")
    .describe("The ID of the user to retrieve"),
});

export type GetUserInput = z.infer<typeof getUserSchema>;

/**
 * Schema for search-users tool
 */
export const searchUsersSchema = z.object({
  query: z.string()
    .min(1, "Search query cannot be empty")
    .describe("Search query for finding users"),
  limit: z.number()
    .int()
    .positive()
    .default(10)
    .describe("Maximum number of results to return (default: 10)"),
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;

/**
 * Schema for get-user-tracks tool
 */
export const getUserTracksSchema = z.object({
  userId: z.string()
    .min(1, "User ID cannot be empty")
    .describe("The ID of the user to get tracks for"),
  limit: z.number()
    .int()
    .positive()
    .default(10)
    .describe("Maximum number of tracks to return (default: 10)"),
});

export type GetUserTracksInput = z.infer<typeof getUserTracksSchema>;

/**
 * Schema for get-user-followers tool
 */
export const getUserFollowersSchema = z.object({
  userId: z.string()
    .min(1, "User ID cannot be empty")
    .describe("The ID of the user to get followers for"),
  limit: z.number()
    .int()
    .positive()
    .default(10)
    .describe("Maximum number of followers to return (default: 10)"),
});

export type GetUserFollowersInput = z.infer<typeof getUserFollowersSchema>;

/**
 * Schema for get-user-following tool
 */
export const getUserFollowingSchema = z.object({
  userId: z.string()
    .min(1, "User ID cannot be empty")
    .describe("The ID of the user to get following list for"),
  limit: z.number()
    .int()
    .positive()
    .default(10)
    .describe("Maximum number of following users to return (default: 10)"),
});

export type GetUserFollowingInput = z.infer<typeof getUserFollowingSchema>;