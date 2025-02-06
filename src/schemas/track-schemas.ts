import { z } from "zod";
import { HashIdSchema } from "./user-schemas.js";

export const GetUserTracksSchema = z.object({
  userId: HashIdSchema,
  limit: z.number().default(10).describe("Maximum number of tracks to return (default: 10)"),
  offset: z.number().optional().describe("Number of tracks to skip"),
  sort: z.enum(['date', 'plays']).optional(),
  sortMethod: z.enum(['title', 'artist_name', 'release_date', 'plays', 'reposts', 'saves']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  filterTracks: z.enum(['all', 'public', 'unlisted']).optional()
}).describe("Get tracks for a user with pagination support");

export const GetTrackSchema = z.object({
  trackId: HashIdSchema,
}).describe("Get track details");

export const GetTrackStreamSchema = z.object({
  trackId: HashIdSchema,
}).describe("Get track stream URL and SSE endpoint");

export const GetTrackCommentsSchema = z.object({
  trackId: HashIdSchema,
  limit: z.number().default(5).describe("Maximum number of comments to return (default: 5)"),
  offset: z.number().optional(),
}).describe("Get comments on a track");

export const SearchTracksSchema = z.object({
  query: z.string(),
}).describe("Search for tracks");

export const FavoriteTrackSchema = z.object({
  userId: HashIdSchema,
  trackId: HashIdSchema,
}).describe("Favorite a track");

export const UnfavoriteTrackSchema = z.object({
  userId: HashIdSchema,
  trackId: HashIdSchema,
}).describe("Unfavorite a track");

export const GetTrackPriceSchema = z.object({
  trackId: HashIdSchema,
}).describe("Get price information for a track");

export const PurchaseTrackSchema = z.object({
  trackId: HashIdSchema,
  buyerId: HashIdSchema,
}).describe("Purchase a track using USDC");

export const VerifyPurchaseSchema = z.object({
  trackId: HashIdSchema,
  userId: HashIdSchema,
}).describe("Verify if a user has purchased a track");

// Track stats response type
export interface TrackStats {
  title: string;
  artist: string;
  playCount: number;
  repostCount: number;
  favoriteCount: number;
  timestamp: string;
}
