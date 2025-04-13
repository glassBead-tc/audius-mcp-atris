/**
 * Validation utilities for Audius MCP
 * 
 * This file contains functions for validating inputs, parameters,
 * and other data used throughout the application.
 */

import { z } from 'zod';

/**
 * Error class for handling validation failures
 */
export class InputValidationError extends Error {
  statusCode: number;
  errorCode: string;
  details?: Record<string, any>;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'InputValidationError';
    this.statusCode = 400;
    this.errorCode = 'VALIDATION_ERROR';
    this.details = details;
    
    // Ensures proper inheritance in ES5
    Object.setPrototypeOf(this, InputValidationError.prototype);
  }

  /**
   * Create an InputValidationError from a Zod validation error
   * @param errors Zod validation errors
   * @returns An InputValidationError
   */
  static fromZodError(errors: z.ZodIssue[]): InputValidationError {
    const formattedErrors = errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
    
    return new InputValidationError(
      'Invalid input parameters',
      { validationErrors: formattedErrors }
    );
  }
}

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
 * Validate tool input against a Zod schema
 * @param schema The Zod schema to validate against
 * @param input The input data to validate
 * @returns The validated input data
 * @throws InputValidationError if validation fails
 */
export function validateToolInput<T extends z.ZodType>(
  schema: T,
  input: unknown
): z.infer<T> {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Log validation errors for debugging
      console.debug('Tool input validation error:', error.errors);
      
      // Throw a specialized error for tool input validation failures
      throw InputValidationError.fromZodError(error.errors);
    }
    
    // For any other error type, re-throw
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