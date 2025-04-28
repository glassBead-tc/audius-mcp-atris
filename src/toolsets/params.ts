/**
 * Utilities for parameter validation in tool handlers
 */

/**
 * Validates that a required parameter exists and is of the expected type
 * @param args Object containing the arguments
 * @param param Parameter name to check
 * @param type Expected type of the parameter
 * @returns The parameter value
 * @throws Error if parameter is missing or not of expected type
 */
export function requiredParam<T>(args: Record<string, any>, param: string, type: string): T {
  if (args[param] === undefined) {
    throw new Error(`Missing required parameter: ${param}`);
  }

  const value = args[param];
  if (type === 'string' && typeof value !== 'string') {
    throw new Error(`Parameter ${param} must be a string`);
  } else if (type === 'number' && typeof value !== 'number') {
    throw new Error(`Parameter ${param} must be a number`);
  } else if (type === 'boolean' && typeof value !== 'boolean') {
    throw new Error(`Parameter ${param} must be a boolean`);
  } else if (type === 'array' && !Array.isArray(value)) {
    throw new Error(`Parameter ${param} must be an array`);
  } else if (type === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
    throw new Error(`Parameter ${param} must be an object`);
  }

  return value as T;
}

/**
 * Gets an optional parameter or returns undefined if not present
 * @param args Object containing the arguments
 * @param param Parameter name to check
 * @param type Expected type of the parameter
 * @returns The parameter value or undefined
 * @throws Error if parameter is present but not of expected type
 */
export function optionalParam<T>(args: Record<string, any>, param: string, type: string): T | undefined {
  if (args[param] === undefined) {
    return undefined;
  }

  const value = args[param];
  if (type === 'string' && typeof value !== 'string') {
    throw new Error(`Parameter ${param} must be a string`);
  } else if (type === 'number' && typeof value !== 'number') {
    throw new Error(`Parameter ${param} must be a number`);
  } else if (type === 'boolean' && typeof value !== 'boolean') {
    throw new Error(`Parameter ${param} must be a boolean`);
  } else if (type === 'array' && !Array.isArray(value)) {
    throw new Error(`Parameter ${param} must be an array`);
  } else if (type === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
    throw new Error(`Parameter ${param} must be an object`);
  }

  return value as T;
}

/**
 * Gets an optional parameter or returns a default value if not present
 * @param args Object containing the arguments
 * @param param Parameter name to check
 * @param defaultValue Default value to return if parameter is not present
 * @param type Expected type of the parameter
 * @returns The parameter value or the default value
 * @throws Error if parameter is present but not of expected type
 */
export function optionalParamWithDefault<T>(
  args: Record<string, any>, 
  param: string, 
  defaultValue: T, 
  type: string
): T {
  const value = optionalParam<T>(args, param, type);
  return value === undefined ? defaultValue : value;
}

/**
 * Helper specifically for optional numeric parameters with default
 * @param args Object containing the arguments
 * @param param Parameter name to check
 * @param defaultValue Default number to use if not provided
 * @returns The parameter value or default
 */
export function optionalNumberParam(
  args: Record<string, any>, 
  param: string, 
  defaultValue: number
): number {
  return optionalParamWithDefault<number>(args, param, defaultValue, 'number');
}

/**
 * Helper specifically for optional string parameters with default
 * @param args Object containing the arguments
 * @param param Parameter name to check
 * @param defaultValue Default string to use if not provided
 * @returns The parameter value or default
 */
export function optionalStringParam(
  args: Record<string, any>, 
  param: string, 
  defaultValue: string
): string {
  return optionalParamWithDefault<string>(args, param, defaultValue, 'string');
}

/**
 * Helper specifically for optional boolean parameters with default
 * @param args Object containing the arguments
 * @param param Parameter name to check
 * @param defaultValue Default boolean to use if not provided
 * @returns The parameter value or default
 */
export function optionalBooleanParam(
  args: Record<string, any>, 
  param: string, 
  defaultValue: boolean
): boolean {
  return optionalParamWithDefault<boolean>(args, param, defaultValue, 'boolean');
}

/**
 * Helper for pagination parameters
 * @param args Object containing the arguments
 * @returns Object with page and limit parameters
 */
export function paginationParams(
  args: Record<string, any>, 
  defaultLimit: number = 10
): { page: number; limit: number } {
  const page = optionalNumberParam(args, 'page', 1);
  const limit = optionalNumberParam(args, 'limit', defaultLimit);
  
  return { page, limit };
}