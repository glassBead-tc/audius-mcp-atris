import { z } from 'zod';
/**
 * Manages URL resolution functionality for the Audius MCP server
 */
export class ResolveManager {
    audiusSdk;
    constructor(audiusSdk) {
        this.audiusSdk = audiusSdk;
    }
    /**
     * Resolves an Audius URL to its corresponding API resource
     * @param url The Audius URL to resolve (e.g., audius.co/user/track)
     * @returns The resolved API resource data
     */
    async resolveUrl(url) {
        try {
            const response = await this.audiusSdk.resolve({ url });
            return response;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to resolve URL: ${error.message}`);
            }
            throw error;
        }
    }
}
// Schema for URL resolution
export const ResolveUrlSchema = z.object({
    url: z.string().url(),
}).describe("Resolve an Audius URL to its corresponding API resource");
