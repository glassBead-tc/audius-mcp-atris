// Cache for Audius host
let cachedHost = null;
let lastHostFetch = 0;
const HOST_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
// Helper functions for Audius API interactions
export async function getAudiusHost() {
    const now = Date.now();
    if (cachedHost && (now - lastHostFetch) < HOST_CACHE_DURATION) {
        return cachedHost;
    }
    try {
        const response = await fetch('https://api.audius.co');
        const hosts = await response.json();
        const selectedHost = hosts.data[Math.floor(Math.random() * hosts.data.length)];
        if (!selectedHost) {
            throw new Error('No Audius hosts available');
        }
        cachedHost = selectedHost;
        lastHostFetch = now;
        return selectedHost;
    }
    catch (error) {
        if (cachedHost) {
            // If we have a cached host, use it even if expired
            return cachedHost;
        }
        throw new Error('Failed to fetch Audius API host');
    }
}
export async function fetchFromAudius(endpoint, params = {}, options = {}) {
    const host = await getAudiusHost();
    // Build query string, filtering out undefined values
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
            queryParams.append(key, value.toString());
        }
    });
    queryParams.append('app_name', 'MCP_SERVER');
    // Handle no_redirect parameter for stream endpoints
    if (options.noRedirect) {
        queryParams.append('no_redirect', 'true');
    }
    const url = `${host}/v1/${endpoint}${queryParams.size ? '?' + queryParams.toString() : ''}`;
    // Implement retry logic
    const MAX_RETRIES = 3;
    let lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const headers = {
                'Accept': 'application/json',
                ...options.headers,
            };
            const response = await fetch(url, { headers });
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new AudiusAPIError(`Audius API error: ${response.statusText}`, response.status, errorData);
            }
            const data = await response.json();
            return cleanResponse(data);
        }
        catch (error) {
            lastError = error;
            if (error instanceof AudiusAPIError && error.statusCode >= 400 && error.statusCode < 500) {
                // Don't retry client errors
                throw error;
            }
            if (attempt === MAX_RETRIES - 1) {
                throw error;
            }
            // Wait before retrying, with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }
    throw lastError || new Error('Maximum retries exceeded');
}
// Custom error class
export class AudiusAPIError extends Error {
    statusCode;
    data;
    constructor(message, statusCode, data) {
        super(message);
        this.statusCode = statusCode;
        this.data = data;
        this.name = 'AudiusAPIError';
    }
}
// Validation utilities
export const validateWalletAddress = (address) => {
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    const solRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return ethRegex.test(address) || solRegex.test(address);
};
export const validateHandle = (handle) => {
    const handleRegex = /^[a-zA-Z0-9_]{1,100}$/;
    return handleRegex.test(handle);
};
// Response formatting utilities
export const formatTimestamp = (timestamp) => {
    try {
        const date = new Date(timestamp);
        return date.toISOString();
    }
    catch {
        return timestamp;
    }
};
export const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
};
export const cleanResponse = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }
    const cleaned = Array.isArray(data) ? [] : {};
    for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) {
            cleaned[key] = value;
            continue;
        }
        if (typeof value === 'object') {
            cleaned[key] = cleanResponse(value);
            continue;
        }
        if (typeof value === 'string' && (key.includes('date') ||
            key.includes('time') ||
            key.includes('created') ||
            key.includes('updated'))) {
            cleaned[key] = formatTimestamp(value);
            continue;
        }
        if (typeof value === 'number' && (key.includes('count') ||
            key.includes('amount') ||
            key.includes('balance'))) {
            cleaned[key] = formatNumber(value);
            continue;
        }
        cleaned[key] = value;
    }
    return cleaned;
};
