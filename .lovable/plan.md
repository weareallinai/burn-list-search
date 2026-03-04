

## Backfill Album Art for All 415 Songs

Spotify can handle 415 calls easily — we just need to pace them to avoid hitting rate limits.

### Approach

Create a new edge function `spotify-backfill` that:

1. Queries all songs that have a `spotify_track_id` but no `album_art_url`
2. Fetches metadata from Spotify in batches of 20 (Spotify's `/tracks` endpoint supports up to 50 IDs per request via `GET /v1/tracks?ids=id1,id2,...`)
3. Updates each song's `album_art_url` in the database
4. Returns a summary of how many were updated

### Why This Works
- Spotify's "Get Several Tracks" endpoint accepts up to **50 track IDs in a single request**, so we only need ~9 API calls total for 415 songs
- No rate limit concerns at all

### Frontend
- Add a "Backfill Album Art" button on the `/add` page (behind the passcode) that triggers the function and shows progress

### Files to create/edit
- **Create** `supabase/functions/spotify-backfill/index.ts` — batch fetch + update
- **Edit** `src/pages/AddPage.tsx` — add backfill trigger button

