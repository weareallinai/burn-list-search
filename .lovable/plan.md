

## Fix: Spotify Backfill - Process One Batch Per Invocation

### Problem
The Spotify API is returning 403 on every batch. Once the token gets flagged for rate limiting, all subsequent requests in the same function invocation fail -- including retries. The current approach of processing all 365 songs in a single function call doesn't work.

### Solution
Split the work: the edge function processes **one batch of 50** per call and returns whether there are more songs remaining. The frontend loops, calling the function repeatedly with a delay between each call. Each invocation gets a fresh Spotify token, avoiding the rate-limit flag.

### Changes

**`supabase/functions/spotify-backfill/index.ts`:**
- Remove the batch loop -- fetch only the first 50 songs missing album art per invocation
- Make a single Spotify API call per invocation
- Return `{ updated, remaining, done }` so the frontend knows whether to call again

**`src/pages/AddPage.tsx`:**
- Change the backfill handler to call the function in a loop
- Add a 3-second delay between calls
- Show live progress (e.g., "Updated 50 of 365... Updated 100 of 365...")
- Stop when the function returns `done: true` or `remaining: 0`

### Why This Works
- One Spotify API call per edge function invocation = no rate limiting
- Fresh token each time = no flagged credentials
- ~8 calls total, each taking ~2 seconds, with 3-second gaps = done in under a minute
- No new database tables needed

