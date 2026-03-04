import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getSpotifyToken(): Promise<string> {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Spotify credentials not configured");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("Failed to get Spotify token");
  const data = await res.json();
  return data.access_token;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBatchWithRetry(ids: string, token: string): Promise<any | null> {
  const url = `https://api.spotify.com/v1/tracks?ids=${ids}`;
  const headers = { Authorization: `Bearer ${token}` };

  const res = await fetch(url, { headers });
  if (res.ok) return res.json();

  const body = await res.text();
  console.error(`Spotify batch failed (${res.status}): ${body}`);

  if (res.status === 403 || res.status === 429) {
    console.log("Retrying after 3s...");
    await sleep(3000);
    const retry = await fetch(url, { headers });
    if (retry.ok) return retry.json();
    console.error(`Retry also failed (${retry.status})`);
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: songs, error: fetchError } = await supabase
      .from("songs")
      .select("id, spotify_track_id")
      .not("spotify_track_id", "is", null)
      .is("album_art_url", null);

    if (fetchError) throw fetchError;
    if (!songs || songs.length === 0) {
      return new Response(JSON.stringify({ updated: 0, total: 0, message: "No songs need backfilling" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getSpotifyToken();
    let updated = 0;
    let batchesSucceeded = 0;
    let batchesFailed = 0;
    const batchSize = 50;

    for (let i = 0; i < songs.length; i += batchSize) {
      const batch = songs.slice(i, i + batchSize);
      const ids = batch.map((s) => s.spotify_track_id).join(",");

      const data = await fetchBatchWithRetry(ids, token);
      if (!data) {
        batchesFailed++;
        continue;
      }
      batchesSucceeded++;

      for (const track of data.tracks) {
        if (!track) continue;
        const albumArt = track.album?.images?.[0]?.url;
        if (!albumArt) continue;

        const song = batch.find((s) => s.spotify_track_id === track.id);
        if (!song) continue;

        const { error: updateError } = await supabase
          .from("songs")
          .update({ album_art_url: albumArt })
          .eq("id", song.id);

        if (!updateError) updated++;
      }

      // Delay between batches to avoid rate limiting
      if (i + batchSize < songs.length) {
        await sleep(1500);
      }
    }

    return new Response(JSON.stringify({ updated, total: songs.length, batchesSucceeded, batchesFailed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
