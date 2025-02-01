import { fetchFromAudius } from './utils.js';

// Types for authentication
export interface AuthenticatedUser {
  userId: string;
  email: string;
  handle: string;
  name: string;
  verified: boolean;
  sub?: string;
  iat?: string;
}

export interface AuthOptions {
  token: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// Cache verified tokens to reduce API calls
const tokenCache = new Map<string, {
  user: AuthenticatedUser;
  expires: number;
}>();

interface TokenResponse {
  data?: {
    userId: string;
    email: string;
    handle: string;
    name: string;
    verified: boolean;
    sub?: string;
    iat?: string;
  };
}

// Verify a token and get user information
export async function verifyToken(token: string): Promise<AuthenticatedUser> {
  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && cached.expires > Date.now()) {
    return cached.user;
  }

  // Verify with Audius API
  const data = await fetchFromAudius('users/verify_token', { token }) as TokenResponse;
  
  if (!data.data) {
    throw new AuthError('Invalid token');
  }

  const user: AuthenticatedUser = {
    userId: data.data.userId,
    email: data.data.email,
    handle: data.data.handle,
    name: data.data.name,
    verified: data.data.verified,
    sub: data.data.sub,
    iat: data.data.iat
  };

  // Cache the result for 5 minutes
  tokenCache.set(token, {
    user,
    expires: Date.now() + 5 * 60 * 1000
  });

  return user;
}

// Make an authenticated request to the Audius API
export async function fetchFromAudiusWithAuth<T>(
  endpoint: string,
  token: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  // First verify the token is valid
  await verifyToken(token);

  // Get an Audius API host
  const hostResponse = await fetch('https://api.audius.co');
  const hosts = await hostResponse.json();
  const host = hosts.data[0];

  const url = `${host}/v1/${endpoint}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(body && { 'Content-Type': 'application/json' })
    },
    ...(body && { body: JSON.stringify(body) })
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthError('Invalid or expired token');
    }
    throw new Error(`Audius API error: ${response.statusText}`);
  }

  return response.json();
}

// Helper to extract auth options from tool arguments
export function getAuthFromArgs(args: any): AuthOptions {
  if (!args.token) {
    throw new AuthError('Authentication token is required');
  }

  return {
    token: args.token
  };
}

// Base schema for authenticated tool inputs
export const authInputSchema = {
  token: { 
    type: "string", 
    description: "Authentication token from Audius" 
  }
} as const;