import { z } from "zod";

// Base schema for Audius IDs
export const HashIdSchema = z.string().describe("Audius ID - A unique identifier for an Audius resource");

// User-related schemas
export const GetUserSchema = z.object({
  userId: HashIdSchema,
}).describe("Get detailed information about a specific Audius user including their profile, stats, and verification status");

export const GetUserByHandleSchema = z.object({
  handle: z.string().describe("The user's handle/username without the @ symbol"),
}).describe("Look up an Audius user by their handle (username). Returns the same information as get-user");

export const SearchUsersSchema = z.object({
  query: z.string().describe("Search term to find users - can include partial names or handles"),
}).describe("Search for Audius users by name or handle. Returns a list of matching users with basic profile information");

export const FollowUserSchema = z.object({
  userId: HashIdSchema.describe("ID of the user who will follow"),
  followeeUserId: HashIdSchema.describe("ID of the user to be followed"),
}).describe("Make one user follow another user. The userId is the follower, followeeUserId is the user being followed");

export const UnfollowUserSchema = z.object({
  userId: HashIdSchema.describe("ID of the user who will unfollow"),
  followeeUserId: HashIdSchema.describe("ID of the user to be unfollowed"),
}).describe("Remove a follow relationship between users. The userId is the unfollower, followeeUserId is the user being unfollowed");

export const GetUserFollowersSchema = z.object({
  userId: HashIdSchema.describe("ID of the user whose followers you want to retrieve"),
  limit: z.number().default(5).describe("Maximum number of followers to return (default: 5)"),
  offset: z.number().optional().describe("Number of followers to skip for pagination"),
}).describe("Get a paginated list of users who follow the specified user. Use limit and offset for pagination");

export const GetUserFollowingSchema = z.object({
  userId: HashIdSchema,
  limit: z.number().default(5).describe("Maximum number of users to return (default: 5)"),
  offset: z.number().optional(),
}).describe("Get users that a user is following");

export const GetUserTracksSchema = z.object({
  userId: HashIdSchema,
  limit: z.number().default(5).describe("Maximum number of tracks to return (default: 5)"),
  offset: z.number().optional(),
  sort: z.enum(['date', 'plays']).optional(),
  sortMethod: z.enum([
    'title',
    'artist_name',
    'release_date',
    'last_listen_date',
    'added_date',
    'plays',
    'reposts',
    'saves',
    'most_listens_by_user'
  ]).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  filterTracks: z.enum(['all', 'public', 'unlisted']).optional(),
}).describe("Get tracks created by a user");

export const GetUserFavoritesSchema = z.object({
  userId: HashIdSchema,
}).describe("Get a user's favorite tracks");

export const GetUserRepostsSchema = z.object({
  userId: HashIdSchema,
  limit: z.number().default(5).describe("Maximum number of reposts to return (default: 5)"),
  offset: z.number().optional(),
}).describe("Get a user's reposts");
