

# Add sorting to Burn List + fix build errors

## Changes

### 1. Fix build errors in edge functions
Add proper error typing (`(e as Error).message`) in `spotify-backfill/index.ts` and `spotify-track/index.ts`.

### 2. Add sort toggle to SearchPage
Add a sort control (using a ToggleGroup or small button group) below the search bar with three options:
- **Newest** (default, current behavior)
- **Title A-Z**
- **Artist A-Z**

The sorting will be applied client-side using `useMemo` on the already-fetched songs list. No database changes needed.

Genre sorting is not currently possible since the `songs` table has no `genre` column — we'd need to add that column and populate it (potentially via Spotify API). That can be a follow-up.

### Files to edit
- `src/pages/SearchPage.tsx` — add sort state + toggle UI + sort logic in the `useMemo`
- `supabase/functions/spotify-backfill/index.ts` — fix `e.message` type errors
- `supabase/functions/spotify-track/index.ts` — fix `e.message` type error

