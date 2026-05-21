/**
 * Prompts.ts — the workflow recipes as MCP prompts (AX-20).
 *
 * Each prompt hands the agent a projection-correct `execute` body for a
 * common analysis task, so the good path is one step away. Prompts cost
 * zero tool-call surface — they are not tools.
 */

export interface PromptArg {
  readonly name: string
  readonly description: string
  readonly required: boolean
}

export interface PromptDef {
  readonly name: string
  readonly description: string
  readonly arguments: PromptArg[]
  /** Build the execute()-ready code body from the supplied arguments. */
  readonly build: (args: Record<string, string>) => string
}

const arg = (name: string, description: string, required = false): PromptArg => ({
  name,
  description,
  required
})

/** Strip single quotes so an argument cannot break out of the code template. */
const safe = (s: string | undefined, fallback: string): string =>
  (s ?? fallback).replace(/['"`\\]/g, "")

export const PROMPTS: PromptDef[] = [
  {
    name: "audius-rising-stars",
    description: "Find breakout artists — trending tracks by low-follower, unverified artists.",
    arguments: [arg("genre", "Genre to filter by, e.g. 'Electronic' (optional)")],
    build: (a) => {
      const genre = a["genre"] ? `, genre: '${safe(a["genre"], "")}'` : ""
      return `const t = await audius.request('GET', '/tracks/trending', { query: { limit: 100${genre} } });
const seen = {};
for (const x of t.data) {
  const u = x.user; if (!u) continue;
  if (!seen[u.id] || x.play_count > seen[u.id].plays)
    seen[u.id] = { name: u.name, handle: u.handle, followers: u.follower_count, verified: u.is_verified, plays: x.play_count, track: x.title };
}
return Object.values(seen)
  .filter(a => !a.verified && a.followers < 2000)
  .sort((a, b) => b.plays - a.plays)
  .slice(0, 10);`
    }
  },
  {
    name: "audius-genre-report",
    description: "Profile one genre from current trending — key tracks, avg BPM, dominant moods.",
    arguments: [arg("genre", "Genre to profile, e.g. 'Electronic'", true)],
    build: (a) => {
      const genre = safe(a["genre"], "Electronic")
      return `const GENRE = '${genre}';
const t = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } });
const g = t.data.filter(x => x.genre === GENRE);
const moods = {}; let bpm = 0, n = 0;
for (const x of g) { if (x.mood) moods[x.mood] = (moods[x.mood] || 0) + 1; if (x.bpm) { bpm += x.bpm; n++; } }
return {
  genre: GENRE, trackCount: g.length,
  avgBpm: n ? Math.round(bpm / n) : null,
  topMoods: Object.entries(moods).sort((a, b) => b[1] - a[1]).slice(0, 5),
  topTracks: g.sort((a, b) => b.play_count - a.play_count).slice(0, 5)
    .map(x => ({ title: x.title, artist: x.user.name, plays: x.play_count }))
};`
    }
  },
  {
    name: "audius-artist-compare",
    description: "Compare two artists across followers, catalog size, plays and engagement.",
    arguments: [
      arg("artist_a", "First artist name", true),
      arg("artist_b", "Second artist name", true)
    ],
    build: (a) => {
      const A = safe(a["artist_a"], "deadmau5")
      const B = safe(a["artist_b"], "Skrillex")
      return `async function profile(q) {
  const s = await audius.request('GET', '/users/search', { query: { query: q } });
  const u = (s.data || []).find(x => x.is_verified) || (s.data || [])[0];
  if (!u) return { query: q, found: false };
  const t = await audius.request('GET', '/users/' + u.id + '/tracks');
  const plays = (t.data || []).reduce((s, x) => s + (x.play_count || 0), 0);
  const favs = (t.data || []).reduce((s, x) => s + (x.favorite_count || 0), 0);
  return { name: u.name, followers: u.follower_count, tracks: (t.data || []).length,
           totalPlays: plays, engagementRate: plays ? (favs / plays * 100).toFixed(2) + '%' : '0%' };
}
return { comparison: [await profile('${A}'), await profile('${B}')] };`
    }
  },
  {
    name: "audius-hidden-gems",
    description: "Trending tracks with the highest engagement-to-play ratio — underexposed favourites.",
    arguments: [],
    build: () =>
      `const t = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } });
return t.data
  .filter(x => x.play_count > 10)
  .map(x => ({ title: x.title, artist: x.user.name, plays: x.play_count,
    engagement: ((x.favorite_count + x.repost_count) / x.play_count * 100).toFixed(1) + '%',
    score: (x.favorite_count + x.repost_count) / x.play_count }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 10);`
  },
  {
    name: "audius-bpm-landscape",
    description: "Map the BPM spectrum of trending tracks — hot zones, dead zones, the sweet spot.",
    arguments: [],
    build: () =>
      `const t = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } });
const tracks = t.data.filter(x => x.bpm > 0);
const buckets = {};
for (const x of tracks) {
  const b = Math.floor(x.bpm / 10) * 10;
  (buckets[b] = buckets[b] || []).push(x.play_count);
}
return Object.entries(buckets)
  .map(([b, plays]) => ({ range: b + '-' + (Number(b) + 9) + ' BPM', count: plays.length,
    avgPlays: Math.round(plays.reduce((s, p) => s + p, 0) / plays.length) }))
  .sort((a, b) => parseInt(a.range) - parseInt(b.range));`
  }
]

export function getPrompt(name: string): PromptDef | undefined {
  return PROMPTS.find((p) => p.name === name)
}

/** The `prompts/list` payload. */
export function listPrompts(): Array<{
  name: string
  description: string
  arguments: PromptArg[]
}> {
  return PROMPTS.map((p) => ({
    name: p.name,
    description: p.description,
    arguments: p.arguments
  }))
}

/** The `prompts/get` payload for a prompt + its arguments. */
export function buildPromptResult(
  p: PromptDef,
  args: Record<string, string>
): {
  description: string
  messages: Array<{ role: "user"; content: { type: "text"; text: string } }>
} {
  const code = p.build(args)
  const text =
    `Run this with the \`execute\` tool — a projection-correct recipe for: ${p.description}\n\n` +
    "```js\n" +
    code +
    "\n```"
  return {
    description: p.description,
    messages: [{ role: "user", content: { type: "text", text } }]
  }
}
