/**
 * Client utilities for interacting with MCP.
 * This file contains functions and classes for client-side interactions.
 */

/**
 * Fetches an Audius track stream as a readable stream.
 * 
 * @param audiusSdk - The initialized Audius SDK instance
 * @param trackId - The Audius track ID
 * @param options - Optional parameters (userId, apiKey, etc.)
 * @returns A Promise resolving to a ReadableStream or Node.js Readable
 */
export async function fetchAudiusTrackStream(
  audiusSdk: any,
  trackId: string,
  options: Record<string, any> = {}
): Promise<ReadableStream<Uint8Array> | NodeJS.ReadableStream> {
  try {
    // Get the stream URL from the SDK
    const streamUrl: string = await audiusSdk.tracks.getTrackStreamUrl({
      trackId,
      ...options
    })

    // Append no_redirect=true
    const urlObj = new URL(streamUrl)
    urlObj.searchParams.set('no_redirect', 'true')
    const finalUrl = urlObj.toString()

    // Use global fetch (Node 18+) or polyfill
    const response = await fetch(finalUrl, {
      method: 'GET',
      redirect: 'manual'
    })

    if (response.status >= 200 && response.status < 300) {
      return response.body as any
    } else if (response.status >= 300 && response.status < 400) {
      throw new Error(
        `Unexpected redirect when fetching Audius stream (status ${response.status}).`
      )
    } else if (response.status === 404) {
      throw new Error('Track not found (404).')
    } else if (response.status === 403) {
      throw new Error('Access forbidden to this track (403).')
    } else {
      throw new Error(
        `Failed to fetch Audius track stream. Status: ${response.status} ${response.statusText}`
      )
    }
  } catch (err: any) {
    throw new Error(
      `Error fetching Audius track stream: ${err.message || err.toString()}`
    )
  }
}