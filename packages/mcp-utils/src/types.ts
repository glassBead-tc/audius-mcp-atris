/**
 * Type definitions for the Audius MCP utilities
 * 
 * This file contains type definitions and interfaces used throughout the package.
 */

/**
 * Configuration types
 */
export interface AudiusConfig {
  apiKey?: string;
  apiSecret?: string;
  environment: 'production' | 'staging' | 'development';
}

export interface ServerConfig {
  name: string;
  version: string;
}

export interface MpcConfig {
  audius: AudiusConfig;
  server: ServerConfig;
}

/**
 * API Response types
 */
export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

/**
 * Common Audius entity types
 */
export interface AudiusUser {
  user_id: string;
  name: string;
  handle: string;
  is_verified: boolean;
  profile_picture?: string;
  cover_photo?: string;
  bio?: string;
  location?: string;
  [key: string]: any; // Allow additional properties
}

export interface AudiusTrack {
  track_id: string;
  title: string;
  user: {
    user_id: string;
    handle: string;
    name: string;
  };
  description?: string;
  genre?: string;
  mood?: string;
  release_date?: string;
  duration: number;
  artwork?: {
    url: string;
  };
  [key: string]: any; // Allow additional properties
}

export interface AudiusPlaylist {
  playlist_id: string;
  user: {
    user_id: string;
    handle: string;
    name: string;
  };
  playlist_name: string;
  playlist_contents: {
    track_ids: string[];
  };
  playlist_image_url?: string;
  description?: string;
  is_album: boolean;
  [key: string]: any; // Allow additional properties
}

/**
 * Stream-related types
 */
export interface StreamOptions {
  userId?: string;
  preview?: boolean;
  skipPlayCount?: boolean;
  [key: string]: any; // Allow additional options
}

export interface StreamResponse {
  streamUrl: string;
  contentType: string;
  trackId: string;
}

/**
 * Error-related types
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

/**
 * MCP-specific types
 */
export interface ToolSchema {
  type: string;
  properties: Record<string, any>;
  required: string[];
  description: string;
}

export interface ResourceSchema {
  type: string;
  description: string;
  properties?: Record<string, any>;
}