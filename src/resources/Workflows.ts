/**
 * Pre-built workflows — advanced analytics and discovery patterns
 * that demonstrate what Code Mode enables beyond simple API calls.
 *
 * Served as an MCP resource at audius://workflows so LLMs can
 * read them on demand and adapt them to user requests.
 */

export const WORKFLOWS_URI = "audius://workflows"

export const workflowsResource = {
  uri: WORKFLOWS_URI,
  name: "Audius Workflows",
  description:
    "Pre-built analytics and discovery workflows for the Audius execute tool. " +
    "Each workflow runs as a single execute() call — just copy the code block. " +
    "Includes: genre popularity index, platform vital signs, hidden gems finder, " +
    "rising stars tracker, BPM landscape, mood journey playlists, scene reports, " +
    "long tail analysis, tag cloud intelligence, artist social graphs, collab finder, " +
    "and deep artist comparisons.",
  mimeType: "text/markdown"
}

export const WORKFLOWS_CONTENT = `# Audius Workflows

Pre-built analytics and discovery workflows for the execute tool. Each one runs
as a single execute() call that chains multiple API requests and does computation
the Audius API doesn't natively support.

Copy any code block into execute() to run it. Modify the constants at the top
(GENRE, ARTIST, TOTAL_POINTS, etc.) to customize.

---

## Genre Popularity Index

Estimates genre popularity by distributing points across trending tracks using
a Pareto distribution, then aggregating by genre. The API has no "genres by
popularity" endpoint — this synthesizes it.

\`\`\`javascript
const TOTAL_POINTS = 10000
const PARETO_ALPHA = 1.5

const trending = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } })
const tracks = trending.data

const weights = tracks.map((_, i) => Math.pow(1 / (i + 1), PARETO_ALPHA))
const totalWeight = weights.reduce((a, b) => a + b, 0)
const points = weights.map(w => Math.round((w / totalWeight) * TOTAL_POINTS))

const genrePoints = {}
tracks.forEach((track, i) => {
  const genre = track.genre || 'Unknown'
  genrePoints[genre] = (genrePoints[genre] || 0) + points[i]
})

const ranked = Object.entries(genrePoints)
  .map(([genre, pts]) => ({
    genre, points: pts,
    trackCount: tracks.filter(t => t.genre === genre).length
  }))
  .sort((a, b) => b.points - a.points)

return { method: 'Pareto (α=1.5) over ' + tracks.length + ' tracks', genreRanking: ranked }
\`\`\`

---

## Platform Vital Signs

A dashboard combining content velocity, artist diversity (verified vs independent),
genre diversity (Shannon entropy), and average engagement metrics.

\`\`\`javascript
const trending = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } })
const tracks = trending.data
const now = Date.now()
const oneWeek = 7 * 24 * 60 * 60 * 1000

const thisWeek = tracks.filter(t => (now - new Date(t.created_at).getTime()) < oneWeek)
const lastWeek = tracks.filter(t => {
  const age = now - new Date(t.created_at).getTime()
  return age >= oneWeek && age < oneWeek * 2
})

const verified = tracks.filter(t => t.user.is_verified)
const uniqueArtists = new Set(tracks.map(t => t.user.id))

const genreCounts = {}
tracks.forEach(t => { genreCounts[t.genre || 'Unknown'] = (genreCounts[t.genre || 'Unknown'] || 0) + 1 })
const total = tracks.length
const entropy = -Object.values(genreCounts).reduce((sum, c) => {
  const p = c / total
  return sum + p * Math.log2(p)
}, 0)

const avgFavs = Math.round(tracks.reduce((s, t) => s + t.favorite_count, 0) / tracks.length)
const avgReposts = Math.round(tracks.reduce((s, t) => s + t.repost_count, 0) / tracks.length)
const avgPlays = Math.round(tracks.reduce((s, t) => s + t.play_count, 0) / tracks.length)

return {
  title: 'Audius Platform Vital Signs',
  date: new Date().toISOString().split('T')[0],
  contentVelocity: { trendingFromThisWeek: thisWeek.length, trendingFromLastWeek: lastWeek.length },
  artistDiversity: {
    uniqueArtistsInTop100: uniqueArtists.size,
    verifiedArtists: verified.length,
    independentRatio: ((tracks.length - verified.length) / tracks.length * 100).toFixed(0) + '%'
  },
  genreDiversity: {
    uniqueGenres: Object.keys(genreCounts).length,
    shannonEntropy: entropy.toFixed(2),
    diversityScore: (entropy / Math.log2(Object.keys(genreCounts).length) * 100).toFixed(0) + '%'
  },
  avgEngagement: { plays: avgPlays, favorites: avgFavs, reposts: avgReposts,
    engagementRate: ((avgFavs + avgReposts) / avgPlays * 100).toFixed(1) + '%' }
}
\`\`\`

---

## Hidden Gems

Finds tracks with high engagement-to-play ratios — tracks that almost everyone
who listens to ends up favoriting. These are underexposed tracks that deserve
more listeners.

\`\`\`javascript
const trending = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } })
const tracks = trending.data.filter(t => t.play_count > 10)

const scored = tracks.map(t => ({
  title: t.title, artist: t.user.name,
  plays: t.play_count, favorites: t.favorite_count, reposts: t.repost_count,
  engagementRate: ((t.favorite_count + t.repost_count) / t.play_count * 100).toFixed(1) + '%',
  engagementScore: (t.favorite_count + t.repost_count) / t.play_count
})).sort((a, b) => b.engagementScore - a.engagementScore)

return { hiddenGems: scored.slice(0, 10), overplayed: scored.slice(-3).reverse() }
\`\`\`

---

## Rising Stars

Finds artists who have tracks trending but low follower counts — the breakout
candidates. Contrasts them with established artists to show the platform's
indie-to-mainstream ratio.

\`\`\`javascript
const trending = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } })

const artistMap = {}
trending.data.forEach(t => {
  const u = t.user
  if (!artistMap[u.id] || t.play_count > artistMap[u.id].bestTrackPlays) {
    artistMap[u.id] = {
      name: u.name, handle: u.handle, followers: u.follower_count,
      verified: u.is_verified, trackCount: u.track_count,
      bestTrack: t.title, bestTrackPlays: t.play_count, genre: t.genre,
      joinDate: u.created_at.split('T')[0]
    }
  }
})
const artists = Object.values(artistMap)
const risingStars = artists.filter(a => a.followers < 500 && !a.verified)
  .sort((a, b) => b.bestTrackPlays - a.bestTrackPlays)
const established = artists.filter(a => a.verified || a.followers >= 10000)
  .sort((a, b) => b.followers - a.followers)

return {
  summary: { total: artists.length, risingStar: risingStars.length, established: established.length },
  risingStars: risingStars.slice(0, 10),
  established: established.slice(0, 5)
}
\`\`\`

---

## The Long Tail

Analyzes the play distribution across trending tracks using a Gini coefficient
to measure inequality. Answers: is Audius winner-take-all or democratic?

\`\`\`javascript
const trending = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } })
const plays = trending.data.map(t => t.play_count).sort((a, b) => b - a)

const totalPlays = plays.reduce((a, b) => a + b, 0)
const top10Plays = plays.slice(0, 10).reduce((a, b) => a + b, 0)
const bottom50Plays = plays.slice(50).reduce((a, b) => a + b, 0)

const n = plays.length
const sortedAsc = [...plays].sort((a, b) => a - b)
let giniSum = 0
sortedAsc.forEach((x, i) => { giniSum += (2 * (i + 1) - n - 1) * x })
const gini = giniSum / (n * totalPlays)

return {
  totalPlays,
  top10: { plays: top10Plays, pct: (top10Plays/totalPlays*100).toFixed(1) + '%' },
  bottom50: { plays: bottom50Plays, pct: (bottom50Plays/totalPlays*100).toFixed(1) + '%' },
  giniCoefficient: gini.toFixed(3),
  interpretation: gini > 0.5 ? 'Winner-take-all' : 'Distributed',
  range: { max: plays[0], median: plays[Math.floor(n/2)], min: plays[n-1] }
}
\`\`\`

---

## BPM Landscape

Maps the BPM spectrum of trending tracks. Finds dead zones (BPM ranges with no
tracks), hot zones (oversaturated tempos), and the sweet spot (highest avg plays).

\`\`\`javascript
const trending = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } })
const tracks = trending.data.filter(t => t.bpm && t.bpm > 0)

const buckets = {}
tracks.forEach(t => {
  const bucket = Math.floor(t.bpm / 10) * 10
  const label = bucket + '-' + (bucket + 9)
  if (!buckets[label]) buckets[label] = { tracks: [], genres: new Set() }
  buckets[label].tracks.push(t)
  buckets[label].genres.add(t.genre)
})

const allBuckets = []
for (let b = 60; b <= 180; b += 10) {
  const label = b + '-' + (b + 9)
  allBuckets.push({
    range: label + ' BPM', count: buckets[label] ? buckets[label].tracks.length : 0,
    genres: buckets[label] ? [...buckets[label].genres] : [],
    avgPlays: buckets[label]
      ? Math.round(buckets[label].tracks.reduce((s, t) => s + t.play_count, 0) / buckets[label].tracks.length) : 0
  })
}

return {
  spectrum: allBuckets.filter(b => b.count > 0),
  hotZones: allBuckets.filter(b => b.count >= 5).map(b => b.range),
  deadZones: allBuckets.filter(b => b.count === 0).map(b => b.range),
  sweetSpot: allBuckets.sort((a, b) => b.avgPlays - a.avgPlays)[0]
}
\`\`\`

---

## Mood Journey

Builds a playlist path that transitions through moods — from energizing to
peaceful, picking the highest-favorited track for each mood.

\`\`\`javascript
const MOOD_PATH = ['Energizing', 'Fiery', 'Aggressive', 'Defiant', 'Cool', 'Melancholy', 'Peaceful']

const trending = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } })
const byMood = {}
trending.data.forEach(t => {
  const mood = t.mood || 'Unspecified'
  if (!byMood[mood]) byMood[mood] = []
  byMood[mood].push(t)
})

const journey = MOOD_PATH.map(mood => {
  const tracks = byMood[mood] || []
  const pick = tracks.sort((a, b) => b.favorite_count - a.favorite_count)[0]
  return {
    mood,
    track: pick ? {
      title: pick.title, artist: pick.user.name, genre: pick.genre,
      bpm: pick.bpm,
      duration: Math.floor(pick.duration / 60) + ':' + String(pick.duration % 60).padStart(2, '0')
    } : null,
    available: tracks.length
  }
})

return { path: MOOD_PATH.join(' → '), tracks: journey }
\`\`\`

---

## Scene Report

Deep dive into a single genre's ecosystem — key artists, average track length,
dominant moods, top tags, and BPM profile.

\`\`\`javascript
const GENRE = 'Electronic'  // change this to any genre

const trending = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } })
const genreTracks = trending.data.filter(t => t.genre === GENRE)

const artists = {}
let totalDuration = 0, totalBpm = 0, bpmCount = 0
const moods = {}, tags = {}

genreTracks.forEach(t => {
  const name = t.user.name
  if (!artists[name]) artists[name] = { tracks: 0, plays: 0, followers: t.user.follower_count }
  artists[name].tracks++
  artists[name].plays += t.play_count
  totalDuration += t.duration
  if (t.bpm) { totalBpm += t.bpm; bpmCount++ }
  if (t.mood) moods[t.mood] = (moods[t.mood] || 0) + 1
  if (t.tags) t.tags.split(',').forEach(tag => {
    const clean = tag.trim().toLowerCase()
    if (clean) tags[clean] = (tags[clean] || 0) + 1
  })
})

return {
  genre: GENRE, trackCount: genreTracks.length,
  avgDurationSec: Math.round(totalDuration / genreTracks.length),
  avgBpm: bpmCount > 0 ? Math.round(totalBpm / bpmCount) : null,
  dominantMoods: Object.entries(moods).sort((a,b) => b[1]-a[1]).slice(0,5).map(([m,c]) => ({mood:m,count:c})),
  topTags: Object.entries(tags).sort((a,b) => b[1]-a[1]).slice(0,10).map(([t,c]) => ({tag:t,count:c})),
  keyArtists: Object.entries(artists).sort((a,b) => b[1].plays-a[1].plays).slice(0,10)
    .map(([name, d]) => ({ name, ...d }))
}
\`\`\`

---

## Tag Cloud Intelligence

Mines the tag ecosystem to find crossover tags (tags that span multiple genres),
strongest tag pairs (co-occurring tags), and micro-communities.

\`\`\`javascript
const trending = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } })

const tagPairs = {}, tagGenre = {}, tagCount = {}
trending.data.forEach(t => {
  if (!t.tags) return
  const trackTags = t.tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  trackTags.forEach(tag => {
    tagCount[tag] = (tagCount[tag] || 0) + 1
    if (!tagGenre[tag]) tagGenre[tag] = {}
    tagGenre[tag][t.genre] = (tagGenre[tag][t.genre] || 0) + 1
  })
  for (let i = 0; i < trackTags.length; i++) {
    for (let j = i + 1; j < trackTags.length; j++) {
      const pair = [trackTags[i], trackTags[j]].sort().join(' + ')
      tagPairs[pair] = (tagPairs[pair] || 0) + 1
    }
  }
})

const crossoverTags = Object.entries(tagGenre)
  .filter(([_, genres]) => Object.keys(genres).length >= 3)
  .map(([tag, genres]) => ({
    tag, count: tagCount[tag],
    genres: Object.entries(genres).sort((a,b) => b[1]-a[1]).map(([g]) => g)
  })).sort((a, b) => b.count - a.count)

return {
  totalUniqueTags: Object.keys(tagCount).length,
  topTags: Object.entries(tagCount).sort((a,b) => b[1]-a[1]).slice(0,15).map(([t,c]) => ({tag:t,count:c})),
  strongestPairs: Object.entries(tagPairs).sort((a,b) => b[1]-a[1]).slice(0,10).map(([p,c]) => ({pair:p,count:c})),
  crossoverTags: crossoverTags.slice(0, 8)
}
\`\`\`

---

## Artist Social Graph

Starting from a seed artist, maps their social connections — who they follow,
and any remix relationships in their catalog.

\`\`\`javascript
const SEED = 'deadmau5'  // change this

const search = await audius.request('GET', '/users/search', { query: { query: SEED } })
const seed = search.data.find(u => u.is_verified) || search.data[0]

const following = await audius.request('GET', '/users/' + seed.id + '/following', { query: { limit: 20 } })
const tracks = await audius.request('GET', '/users/' + seed.id + '/tracks')
const remixes = tracks.data.filter(t => t.remix_of && t.remix_of.tracks && t.remix_of.tracks.length > 0)

return {
  seed: { name: seed.name, followers: seed.follower_count, tracks: seed.track_count },
  follows: following.data.map(u => ({ name: u.name, followers: u.follower_count, verified: u.is_verified })),
  remixConnections: remixes.map(t => ({ title: t.title, remixOf: t.remix_of.tracks }))
}
\`\`\`

---

## Collab Finder

Given an artist, finds other artists in the same genre with similar follower
counts (10-200% of seed) — potential collaboration partners.

\`\`\`javascript
const ARTIST = 'Rezz'  // change this

const search = await audius.request('GET', '/users/search', { query: { query: ARTIST } })
const artist = search.data.find(u => u.is_verified) || search.data[0]
const artistTracks = await audius.request('GET', '/users/' + artist.id + '/tracks')
const genres = [...new Set(artistTracks.data.map(t => t.genre).filter(Boolean))]

const trending = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } })
const candidates = []
trending.data.filter(t => genres.includes(t.genre) && t.user.id !== artist.id).forEach(t => {
  const ratio = t.user.follower_count / (artist.follower_count || 1)
  if (ratio > 0.1 && ratio < 2.0) {
    candidates.push({
      name: t.user.name, handle: t.user.handle, followers: t.user.follower_count,
      followerRatio: (ratio * 100).toFixed(0) + '%', genre: t.genre, verified: t.user.is_verified,
      topTrack: t.title, trackPlays: t.play_count
    })
  }
})

const seen = new Set()
const unique = candidates.filter(c => { if (seen.has(c.handle)) return false; seen.add(c.handle); return true })

return {
  artist: { name: artist.name, followers: artist.follower_count, genres },
  collabCandidates: unique.sort((a,b) => b.followers - a.followers).slice(0, 10)
}
\`\`\`

---

## Deep Artist Comparison

Side-by-side comparison of two artists across plays, engagement, genres,
catalog size, and supporter base.

\`\`\`javascript
const ARTIST_A = 'deadmau5'
const ARTIST_B = 'Skrillex'

async function profile(query) {
  const s = await audius.request('GET', '/users/search', { query: { query } })
  const u = s.data.find(x => x.is_verified) || s.data[0]
  const t = await audius.request('GET', '/users/' + u.id + '/tracks')
  const totalPlays = t.data.reduce((s, x) => s + (x.play_count || 0), 0)
  const totalFavs = t.data.reduce((s, x) => s + (x.favorite_count || 0), 0)
  return {
    name: u.name, followers: u.follower_count, tracks: t.data.length,
    totalPlays, totalFavorites: totalFavs,
    avgPlaysPerTrack: t.data.length ? Math.round(totalPlays / t.data.length) : 0,
    engagementRate: totalPlays ? (totalFavs / totalPlays * 100).toFixed(2) + '%' : '0%',
    genres: [...new Set(t.data.map(x => x.genre).filter(Boolean))],
    supporters: u.supporter_count
  }
}

const a = await profile(ARTIST_A)
const b = await profile(ARTIST_B)
return { comparison: [a, b] }
\`\`\`

---

## The Audius Clock

Analyzes release timing patterns — which days and hours produce the most
successful trending tracks.

\`\`\`javascript
const trending = await audius.request('GET', '/tracks/trending', { query: { limit: 100 } })
const tracks = trending.data.filter(t => t.release_date || t.created_at)

const hourCounts = {}, dayOfWeekCounts = {}, hourPlays = {}
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

tracks.forEach(t => {
  const d = new Date(t.release_date || t.created_at)
  const hour = d.getUTCHours()
  const day = days[d.getUTCDay()]
  hourCounts[hour] = (hourCounts[hour] || 0) + 1
  dayOfWeekCounts[day] = (dayOfWeekCounts[day] || 0) + 1
  hourPlays[hour] = (hourPlays[hour] || 0) + t.play_count
})

const bestHours = Object.entries(hourPlays).map(([h, plays]) => ({
  hour: parseInt(h), avgPlays: Math.round(plays / (hourCounts[parseInt(h)] || 1)),
  trackCount: hourCounts[parseInt(h)] || 0
})).sort((a, b) => b.avgPlays - a.avgPlays)

return {
  releasesByDay: Object.entries(dayOfWeekCounts)
    .sort((a, b) => days.indexOf(a[0]) - days.indexOf(b[0]))
    .map(([day, count]) => ({ day, count })),
  bestHoursUTC: bestHours.slice(0, 5),
  worstHoursUTC: bestHours.slice(-3)
}
\`\`\`
`
