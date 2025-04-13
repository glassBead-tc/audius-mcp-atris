/**
 * Validation utilities for Audius MCP
 * 
 * This file contains functions for validating inputs, parameters,
 * and other data used throughout the application.
 */

import { z } from 'zod';

/**
 * Create a validated configuration object from schema and raw data
 * @param schema The Zod schema to validate against
 * @param data The raw configuration data
 * @returns A validated configuration object
 * @throws Error if validation fails
 */
export function validateConfig<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation error:', error.errors);
    } else {
      console.error('Unexpected validation error:', error);
    }
    throw error;
  }
}

/**
 * Validate a track ID
 * @param trackId The track ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidTrackId(trackId: string): boolean {
  // Track IDs are strings that should only contain alphanumeric characters
  return /^[A-Za-z0-9]+$/.test(trackId);
}

/**
 * Validate a user ID
 * @param userId The user ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidUserId(userId: string): boolean {
  // User IDs are strings that should only contain alphanumeric characters
  return /^[A-Za-z0-9]+$/.test(userId);
}

/**
 * Validate a URL
 * @param url The URL to validate
 * @returns true if valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}