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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Count total remaining
    const { count: remaining, error: countError } = await supabase
      .from("songs")
      .select("id", { count: "exact", head: true })
      .not("spotify_track_id", "is", null)
      .is("album_art_url", null);

    if (countError) throw countError;

    if (!remaining || remaining === 0) {
      return new Response(JSON.stringify({ updated: 0, remaining: 0, done: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch a small batch (10 songs per invocation to stay safe)
    const { data: songs, error: fetchError } = await supabase
      .from("songs")
      .select("id, spotify_track_id")
      .not("spotify_track_id", "is", null)
      .is("album_art_url", null)
      .limit(10);

    if (fetchError) throw fetchError;
    if (!songs || songs.length === 0) {
      return new Response(JSON.stringify({ updated: 0, remaining: 0, done: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getSpotifyToken();
    let updated = 0;
    let failed = 0;

    // Fetch each track individually (like spotify-track function which works)
    for (const song of songs) {
      try {
        const res = await fetch(`https://api.spotify.com/v1/tracks/${song.spotify_track_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.error(`Track ${song.spotify_track_id} failed: ${res.status}`);
          failed++;
          if (res.status === 429) {
            // Rate limited - stop early, we'll pick up the rest next invocation
            console.log("Rate limited, stopping early");
            break;
          }
          continue;
        }

        const track = await res.json();
        const albumArt = track.album?.images?.[0]?.url;
        if (!albumArt) continue;

        const { error: updateError } = await supabase
          .from("songs")
          .update({ album_art_url: albumArt })
          .eq("id", song.id);

        if (!updateError) updated++;

        // Small delay between individual requests
        await sleep(200);
      } catch (e) {
        console.error(`Error processing track ${song.spotify_track_id}: ${(e as Error).message}`);
        failed++;
      }
    }

    const newRemaining = remaining - updated;
    return new Response(JSON.stringify({ updated, remaining: newRemaining, failed, done: newRemaining <= 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
