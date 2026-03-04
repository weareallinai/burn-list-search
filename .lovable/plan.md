

## Fix: Spotify Backfill 403 Rate Limiting

### Problem
The edge function fires all 9 batch requests (50 tracks each) nearly simultaneously. Spotify rate-limits after the first batch, returning 403 for the rest. On retry, the token itself may be flagged, so all batches fail.

### Root Cause
The `for` loop sends requests as fast as possible. Even though they're `await`ed sequentially, there's no delay between them, and Spotify's rate limiter kicks in.

### Solution
Two changes to `supabase/functions/spotify-backfill/index.ts`:

1. **Add a delay between batches** (1-2 seconds) to stay under Spotify's rate limit
2. **Log the actual response body on 403** to confirm it's rate limiting (not a credentials issue)
3. **Retry failed batches** with exponential backoff

### Changes

**`supabase/functions/spotify-backfill/index.ts`:**
- Add a `sleep(ms)` helper
- Insert `await sleep(1500)` between each batch iteration
- On 403, wait longer (3s) and retry once before skipping
- Return details on how many batches succeeded vs failed

No frontend changes needed -- the button and UI already work correctly. Once the edge function paces itself, clicking "Backfill Album Art" repeatedly will chip through the remaining 365 songs.

