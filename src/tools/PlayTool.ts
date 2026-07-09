/**
 * Play tool — resolve a track to its Audius URLs (AX-14: honest resolver).
 *
 * Flow:
 * 1. Resolve the track (by ID or search query) via the Audius API
 * 2. Opportunistically try to open it locally (desktop app, then browser)
 * 3. Always return the resolved URLs; report whether the open succeeded
 *
 * Resolution succeeding is the tool's success condition. Opening is
 * best-effort: it only works when the server runs on the user's machine,
 * and even then only "an open command was issued" — playback is never
 * claimed or verified.
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
  title: "Resolve Track on Audius",
  description:
    "Resolve a track (by track ID or search query) to its Audius URLs. " +
    "If the server is running on the user's local machine it will also try to " +
    "open the track in the Audius desktop app or default browser; the result's " +
    "`opened` field reports whether that worked. On remote/headless deployments " +
    "it simply returns the URLs — share them with the user. Never assume audio " +
    "is playing: this tool resolves and (at best) issues an open command.",
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
  args: Record<string, unknown>,
  bearerToken?: string
): Effect.Effect<typeof CallToolResult.Type, never, AudiusClient> =>
  Effect.gen(function* () {
    const audiusClient = yield* AudiusClient
    const authContext = bearerToken ? { bearerToken } : undefined
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
        audiusClient.request("GET", `/tracks/${trackId}`, undefined, authContext),
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
        audiusClient.request("GET", "/tracks/search", { query: { query } }, authContext),
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

    // Step 3: Opportunistically try to open locally — desktop app, then
    // browser. Resolution already succeeded, so open failures downgrade to
    // an honest `opened: false`, never a tool error.
    let opened = false
    let openedWith: string | undefined
    let openFailure: string | undefined

    if (!preferBrowser) {
      const appPath = yield* Effect.tryPromise({
        try: () => findDesktopApp(),
        catch: () => new Error("Failed to search for desktop app")
      }).pipe(Effect.catchAll(() => Effect.succeed(null)))

      if (appPath) {
        const openResult = yield* Effect.tryPromise({
          try: () => openWithApp(appPath, webUrl),
          catch: (e) => new Error(`Failed to open desktop app: ${e}`)
        }).pipe(Effect.catchAll(() => Effect.succeed("failed" as const)))

        if (openResult !== "failed") {
          opened = true
          openedWith = "desktop app"
        }
      }
    }

    if (!opened) {
      const openResult = yield* Effect.tryPromise({
        try: () => openUrl(webUrl),
        catch: (e) => new Error(`Failed to open browser: ${e}`)
      }).pipe(Effect.catchAll((error) => Effect.succeed(error)))

      if (openResult instanceof Error) {
        openFailure = openResult.message
      } else {
        opened = true
        openedWith = "browser"
      }
    }

    // Step 4: Return the resolution — the URLs are the deliverable.
    const streamUrl = (track["stream"] as Record<string, unknown> | undefined)?.["url"] as string | undefined
    return CallToolResult.make({
      content: [TextContent.make({
        type: "text" as const,
        text: JSON.stringify({
          status: "resolved",
          track: {
            title,
            artist,
            url: webUrl,
            ...(streamUrl ? { streamUrl } : {})
          },
          opened,
          ...(openedWith ? { openedWith } : {}),
          note: opened
            ? `Open command issued via ${openedWith} on the server host — playback is not verified.`
            : `Could not open a player on this host (${openFailure ?? "no opener available"}). Share the URL with the user instead.`
        }, null, 2)
      })]
    })
  })
