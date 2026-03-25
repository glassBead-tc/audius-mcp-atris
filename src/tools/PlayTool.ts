/**
 * Play tool — open a track in the Audius desktop app or browser.
 *
 * Flow:
 * 1. Resolve the track (by ID or search query) via the Audius API
 * 2. Attempt to open in the Audius desktop app via audius:// protocol
 * 3. Fall back to opening in the user's default browser
 *
 * This tool runs system commands (open/xdg-open/start) so it only
 * works when the MCP server is running on the user's local machine.
 */
import { Effect } from "effect"
import { exec } from "node:child_process"
import { access, constants } from "node:fs/promises"
import { platform } from "node:os"
import { AudiusClient } from "../api/AudiusClient.js"
import { CallToolResult, TextContent, ToolAnnotations, Tool } from "../mcp/McpSchema.js"

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export const playToolDefinition = Tool.make({
  name: "play",
  title: "Play Track on Audius",
  description:
    "Play a track on the user's machine by opening it in the Audius desktop app " +
    "(if installed) or in their default browser. Provide either a track ID or a " +
    "search query to find and play a track. The server must be running locally.",
  inputSchema: {
    type: "object",
    properties: {
      trackId: {
        type: "string",
        description: "Audius track ID to play (e.g., 'D7KyD')"
      },
      query: {
        type: "string",
        description: "Search query to find a track (uses first result). " +
          "Use this when you know the track name but not the ID."
      },
      preferBrowser: {
        type: "boolean",
        description: "Force opening in browser even if desktop app is available (default: false)"
      }
    }
  },
  annotations: ToolAnnotations.make({
    title: "Play Track on Audius",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  })
})

// ---------------------------------------------------------------------------
// Platform utilities
// ---------------------------------------------------------------------------

/** Known paths where the Audius desktop app might be installed */
const DESKTOP_APP_PATHS: Record<string, string[]> = {
  darwin: [
    "/Applications/Audius.app",
    `${process.env["HOME"]}/Applications/Audius.app`
  ],
  win32: [
    `${process.env["LOCALAPPDATA"]}\\Programs\\Audius\\Audius.exe`,
    `${process.env["PROGRAMFILES"]}\\Audius\\Audius.exe`
  ],
  linux: [
    "/usr/bin/audius",
    "/usr/local/bin/audius",
    `${process.env["HOME"]}/.local/bin/audius`,
    // Snap/Flatpak
    "/snap/bin/audius",
    `${process.env["HOME"]}/.local/share/flatpak/exports/bin/com.audius.Audius`
  ]
}

async function findDesktopApp(): Promise<string | null> {
  const os = platform()
  const paths = DESKTOP_APP_PATHS[os] ?? []

  for (const p of paths) {
    if (!p) continue
    try {
      await access(p, constants.F_OK)
      return p
    } catch {
      // Not found at this path, try next
    }
  }
  return null
}

function openUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const os = platform()
    let cmd: string

    switch (os) {
      case "darwin":
        cmd = `open "${url}"`
        break
      case "win32":
        cmd = `start "" "${url}"`
        break
      default: // linux and others
        cmd = `xdg-open "${url}"`
        break
    }

    exec(cmd, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

function openWithApp(appPath: string, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const os = platform()
    let cmd: string

    switch (os) {
      case "darwin":
        cmd = `open -a "${appPath}" "${url}"`
        break
      case "win32":
        cmd = `"${appPath}" "${url}"`
        break
      default:
        cmd = `"${appPath}" "${url}"`
        break
    }

    exec(cmd, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handlePlay = (
  args: Record<string, unknown>
): Effect.Effect<typeof CallToolResult.Type, never, AudiusClient> =>
  Effect.gen(function* () {
    const audiusClient = yield* AudiusClient
    const trackId = args["trackId"] as string | undefined
    const query = args["query"] as string | undefined
    const preferBrowser = args["preferBrowser"] as boolean | undefined

    if (!trackId && !query) {
      return CallToolResult.make({
        content: [TextContent.make({
          type: "text" as const,
          text: "Error: Provide either 'trackId' or 'query' to find a track to play."
        })],
        isError: true
      })
    }

    // Step 1: Resolve track info
    let track: Record<string, unknown> | undefined

    if (trackId) {
      // Fetch track by ID
      const result = yield* Effect.catchAll(
        audiusClient.request("GET", `/tracks/${trackId}`),
        (error) => Effect.succeed({ error: error.message } as unknown)
      )

      const data = result as Record<string, unknown>
      if (data["error"]) {
        return CallToolResult.make({
          content: [TextContent.make({
            type: "text" as const,
            text: `Error fetching track ${trackId}: ${data["error"]}`
          })],
          isError: true
        })
      }

      track = (data["data"] as Record<string, unknown>) ?? data
    } else if (query) {
      // Search for track
      const result = yield* Effect.catchAll(
        audiusClient.request("GET", "/tracks/search", {
          query: { query }
        }),
        (error) => Effect.succeed({ error: error.message } as unknown)
      )

      const data = result as Record<string, unknown>
      if (data["error"]) {
        return CallToolResult.make({
          content: [TextContent.make({
            type: "text" as const,
            text: `Error searching for "${query}": ${data["error"]}`
          })],
          isError: true
        })
      }

      const tracks = (data["data"] as unknown[]) ?? []
      if (tracks.length === 0) {
        return CallToolResult.make({
          content: [TextContent.make({
            type: "text" as const,
            text: `No tracks found for "${query}".`
          })],
          isError: true
        })
      }

      track = tracks[0] as Record<string, unknown>
    }

    if (!track) {
      return CallToolResult.make({
        content: [TextContent.make({
          type: "text" as const,
          text: "Error: Could not resolve track."
        })],
        isError: true
      })
    }

    // Step 2: Build URLs
    const permalink = track["permalink"] as string | undefined
    const title = track["title"] as string ?? "Unknown Track"
    const artist = (track["user"] as Record<string, unknown>)?.["name"] as string ?? "Unknown Artist"

    // Build web URL from permalink or fall back to track ID
    const webUrl = permalink
      ? (permalink.startsWith("http") ? permalink : `https://audius.co${permalink}`)
      : `https://audius.co/tracks/${trackId ?? ""}`

    // Step 3: Try to open in desktop app, fall back to browser
    let openedWith = "browser"

    if (!preferBrowser) {
      const appPath = yield* Effect.tryPromise({
        try: () => findDesktopApp(),
        catch: () => new Error("Failed to search for desktop app")
      }).pipe(Effect.catchAll(() => Effect.succeed(null)))

      if (appPath) {
        // Try opening with the desktop app
        const openResult = yield* Effect.tryPromise({
          try: () => openWithApp(appPath, webUrl),
          catch: (e) => new Error(`Failed to open desktop app: ${e}`)
        }).pipe(Effect.catchAll(() => Effect.succeed("failed" as const)))

        if (openResult !== "failed") {
          openedWith = "desktop app"
        }
      }
    }

    // Fall back to browser if desktop didn't work
    if (openedWith === "browser") {
      const openResult = yield* Effect.tryPromise({
        try: () => openUrl(webUrl),
        catch: (e) => new Error(`Failed to open browser: ${e}`)
      }).pipe(Effect.catchAll((error) => Effect.succeed(error)))

      if (openResult instanceof Error) {
        return CallToolResult.make({
          content: [TextContent.make({
            type: "text" as const,
            text: `Found "${title}" by ${artist} but failed to open it: ${openResult.message}\n\nURL: ${webUrl}`
          })],
          isError: true
        })
      }
    }

    // Step 4: Return success
    return CallToolResult.make({
      content: [TextContent.make({
        type: "text" as const,
        text: JSON.stringify({
          status: "playing",
          openedWith,
          track: {
            title,
            artist,
            url: webUrl
          }
        }, null, 2)
      })]
    })
  })
