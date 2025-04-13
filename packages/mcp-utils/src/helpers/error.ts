/**
 * Error handling utilities for Audius MCP
 * 
 * This file contains functions and classes for standardized error handling,
 * error formatting, and error types used throughout the application.
 */

/**
 * Base error class for Audius MCP errors.
 * All other error classes should extend this one.
 */
export class AudiusMcpError extends Error {
  /** HTTP status code associated with this error */
  statusCode: number;
  
  /** Error code for client side identification */
  errorCode: string;
  
  /** Additional error details */
  details?: Record<string, any>;

  constructor(message: string, statusCode = 500, errorCode = 'INTERNAL_ERROR', details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    
    // Ensures proper inheritance in ES5
    Object.setPrototypeOf(this, AudiusMcpError.prototype);
  }

  /**
   * Convert the error to a plain object suitable for logging or response
   */
  toJSON() {
    return {
      error: this.errorCode,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details })
    };
  }
}

/**
 * Validation error class for input validation errors
 */
export class ValidationError extends AudiusMcpError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Not found error class for resources that don't exist
 */
export class NotFoundError extends AudiusMcpError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 404, 'NOT_FOUND', details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Authorization error class for unauthorized requests
 */
export class AuthorizationError extends AudiusMcpError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 401, 'UNAUTHORIZED', details);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Format an error for consistent logging
 * @param error The error to format
 * @returns Formatted error object
 */
export function formatError(error: unknown): Record<string, any> {
  if (error instanceof AudiusMcpError) {
    return error.toJSON();
  }
  
  if (error instanceof Error) {
    return {
      error: 'UNKNOWN_ERROR',
      message: error.message,
      statusCode: 500,
      stack: error.stack
    };
  }
  
  return {
    error: 'UNKNOWN_ERROR',
    message: String(error),
    statusCode: 500
  };
}

/**
 * Safely handle errors in async functions
 * @param fn Async function to execute
 * @returns Result of the function or throws a normalized error
 */
export async function handleAsync<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AudiusMcpError) {
      throw error;
    }
    
    if (error instanceof Error) {
      throw new AudiusMcpError(error.message);
    }
    
    throw new AudiusMcpError(String(error));
  }
}