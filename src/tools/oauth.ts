import { z } from 'zod';
import { AudiusClient } from '../sdk-client.js';
import { RequestHandlerExtra } from '../types/index.js';
import { createTextResponse, createMixedResponse } from '../utils/response.js';
import crypto from 'crypto';
import { URL } from 'url';

// Schema for initiate-oauth tool
export const initiateOAuthSchema = {
  type: 'object',
  properties: {
    scope: {
      type: 'string',
      enum: ['read', 'write'],
      description: 'OAuth scope - read for read-only access, write for read/write access',
    },
    appName: {
      type: 'string',
      description: 'Name of your application',
    },
    redirectUri: {
      type: 'string',
      description: 'URI where Audius will redirect after authorization',
    },
  },
  required: ['scope', 'appName', 'redirectUri'],
};

// Schema for verify-token tool
export const verifyTokenSchema = {
  type: 'object',
  properties: {
    token: {
      type: 'string',
      description: 'JWT token to verify',
    },
  },
  required: ['token'],
};

// Schema for exchange-code tool (for authorization code flow)
export const exchangeCodeSchema = {
  type: 'object',
  properties: {
    code: {
      type: 'string',
      description: 'Authorization code received from Audius',
    },
    state: {
      type: 'string',
      description: 'State parameter for CSRF protection',
    },
  },
  required: ['code'],
};

// Store for OAuth states (in production, use proper storage)
const oauthStates = new Map<string, { timestamp: number; appName: string; redirectUri: string }>();

// Clean up old states periodically
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (now - data.timestamp > 600000) { // 10 minutes
      oauthStates.delete(state);
    }
  }
}, 60000); // Check every minute

// Handler for initiate-oauth
export async function initiateOAuth(
  args: { scope: 'read' | 'write'; appName: string; redirectUri: string },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state for verification
    oauthStates.set(state, {
      timestamp: Date.now(),
      appName: args.appName,
      redirectUri: args.redirectUri
    });
    
    // Build OAuth authorization URL
    const authUrl = new URL('https://audius.co/oauth/auth');
    authUrl.searchParams.set('scope', args.scope);
    authUrl.searchParams.set('app_name', args.appName);
    authUrl.searchParams.set('redirect_uri', args.redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');
    
    const response = `OAuth Authorization Flow Initiated

Authorization URL: ${authUrl.toString()}

Instructions:
1. Direct the user to open this URL in their browser
2. User will log in to Audius and authorize your application
3. Audius will redirect to: ${args.redirectUri}
4. The redirect will include 'code' and 'state' parameters
5. Use the 'exchange-code' tool with these parameters to get the access token

State Token (save for verification): ${state}

Note: This state token expires in 10 minutes and should be verified when processing the callback.`;
    
    return createMixedResponse([
      { type: "text" as const, text: response },
      { 
        type: "resource" as const, 
        resource: { 
          uri: authUrl.toString(), 
          mimeType: "text/plain",
          text: JSON.stringify({
            authUrl: authUrl.toString(),
            state,
            expiresAt: new Date(Date.now() + 600000).toISOString()
          }, null, 2)
        } 
      }
    ]);
  } catch (error: any) {
    return createTextResponse(`Error initiating OAuth: ${error.message}`, true);
  }
}

// Handler for verify-token
export async function verifyToken(
  args: { token: string },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    // Select an Audius API endpoint
    const apiHosts = [
      'https://discoveryprovider.audius.co',
      'https://audius-dp.singapore.creatorseed.com',
      'https://discoveryprovider2.audius.co',
      'https://discoveryprovider3.audius.co'
    ];
    
    // Try multiple hosts in case one is down
    let verificationResult = null;
    let lastError = null;
    
    for (const host of apiHosts) {
      try {
        const verifyUrl = `${host}/v1/users/verify_token?token=${encodeURIComponent(args.token)}`;
        const response = await fetch(verifyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          verificationResult = await response.json();
          break;
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (err: any) {
        lastError = err.message;
        continue;
      }
    }
    
    if (!verificationResult) {
      return createTextResponse(`Failed to verify token: ${lastError}`, true);
    }
    
    // Parse the token payload
    const payload = verificationResult.data;
    
    const info = `Token Verification Successful

User Information:
- User ID: ${payload.userId}
- Email: ${payload.email}
- Name: ${payload.name}
- Handle: @${payload.handle}
- Verified: ${payload.verified ? 'Yes ✓' : 'No'}
- API Key: ${payload.apiKey || 'Not provided'}

Profile Pictures:
${payload.profilePicture ? Object.entries(payload.profilePicture).map(([size, url]) => `- ${size}: ${url}`).join('\n') : '- No profile picture'}

Token Details:
- Issued At: ${new Date(parseInt(payload.iat) * 1000).toISOString()}
- Sub (User ID): ${payload.sub}

This token can be used to make authenticated requests on behalf of this user.`;
    
    return createMixedResponse([
      { type: "text" as const, text: info },
      { 
        type: "resource" as const, 
        resource: { 
          uri: `audius://user/${payload.userId}`, 
          mimeType: "application/json",
          text: JSON.stringify(payload, null, 2)
        } 
      }
    ]);
  } catch (error: any) {
    return createTextResponse(`Error verifying token: ${error.message}`, true);
  }
}

// Handler for exchange-code (simulated - actual implementation would need backend)
export async function exchangeCode(
  args: { code: string; state?: string },
  extra?: RequestHandlerExtra
): Promise<any> {
  try {
    // Verify state if provided
    if (args.state) {
      const stateData = oauthStates.get(args.state);
      if (!stateData) {
        return createTextResponse('Invalid or expired state token', true);
      }
      oauthStates.delete(args.state); // Use once
    }
    
    // Note: In a real implementation, this would make a backend call to exchange
    // the authorization code for an access token. The MCP server would need
    // client credentials (client_id, client_secret) configured.
    
    const response = `Authorization Code Exchange

⚠️ Important Note:
The authorization code exchange requires backend implementation with your Audius app's client credentials.
This tool provides guidance on the next steps.

Code Received: ${args.code}
State Verified: ${args.state ? 'Yes ✓' : 'Not provided'}

Next Steps for Implementation:
1. Configure your backend with Audius OAuth client credentials
2. Implement token exchange endpoint:
   POST https://audius.co/oauth/token
   Body: {
     grant_type: "authorization_code",
     code: "${args.code}",
     redirect_uri: "your-redirect-uri",
     client_id: "your-client-id",
     client_secret: "your-client-secret"
   }

3. The response will contain:
   - access_token: JWT token for API calls
   - token_type: "Bearer"
   - expires_in: Token lifetime in seconds
   - refresh_token: Token for refreshing access

4. Use the access token with the Audius SDK:
   const sdk = audiusSdk({
     apiKey: 'your-api-key',
     apiSecret: 'your-api-secret'
   });

5. For write operations, include the userId from the token:
   sdk.tracks.favoriteTrack({
     trackId: 'D7KyD',
     userId: 'user-id-from-token'
   });

Security Notes:
- Never expose client_secret in frontend code
- Store tokens securely
- Implement token refresh before expiration
- Validate the state parameter to prevent CSRF attacks`;
    
    return createTextResponse(response);
  } catch (error: any) {
    return createTextResponse(`Error exchanging code: ${error.message}`, true);
  }
}