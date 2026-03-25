# Audius REST API Endpoints

## Table of Contents
1. [Base URL & Auth](#base-url--auth)
2. [Tracks](#tracks)
3. [Users](#users)
4. [Playlists](#playlists)
5. [Search](#search)
6. [Comments](#comments)
7. [Common Patterns](#common-patterns)

## Base URL & Auth

Base: `https://api.audius.co/v1`

All requests require `x-api-key` header:
```
x-api-key: YOUR_API_KEY
```

Get credentials at https://audius.co/settings or https://api.audius.co/plans.

**Deprecated:** `discoveryprovider.audius.co` — always use `api.audius.co`.

## Tracks

```
GET /v1/tracks/trending           # Trending tracks
GET /v1/tracks/:id                # Get track by ID
GET /v1/tracks/:id/stream         # Stream audio
GET /v1/tracks/search?query=...   # Search tracks (deprecated path, use /v1/search)
```

## Users

```
GET /v1/users/:id                 # Get user profile
GET /v1/users/:id/tracks          # User's tracks
GET /v1/users/:id/favorites       # User's favorites
GET /v1/users/:id/reposts         # User's reposts
GET /v1/users/search?query=...    # Search users
```

## Playlists

```
GET /v1/playlists/:id             # Get playlist
GET /v1/playlists/:id/tracks      # Playlist tracks
GET /v1/playlists/search?query=.. # Search playlists
```

## Search

```
GET /v1/search?query=...          # Global search (tracks, users, playlists)
```

## Comments

Comments endpoints are available for tracks. Check the Swagger spec for the full list:
`https://api.audius.co/v1/swagger.yaml`

## Common Patterns

### Pagination
Most list endpoints support `offset` and `limit` query parameters.

### Image URLs
Artwork URLs in responses include mirror fallback URLs. Preserve all mirrors for retry logic — if the primary mirror fails, fall back to alternates.

### Streaming
Track streaming via `/v1/tracks/:id/stream` returns the audio file directly. Include the API key header.

### Full API Discovery
The OpenAPI spec at `https://api.audius.co/v1/swagger.yaml` is the authoritative reference for all endpoints, parameters, and response schemas. Use it for code generation or to discover endpoints not listed here.
