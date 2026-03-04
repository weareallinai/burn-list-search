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

    // Fetch one batch of 50
    const { data: songs, error: fetchError } = await supabase
      .from("songs")
      .select("id, spotify_track_id")
      .not("spotify_track_id", "is", null)
      .is("album_art_url", null)
      .limit(50);

    if (fetchError) throw fetchError;
    if (!songs || songs.length === 0) {
      return new Response(JSON.stringify({ updated: 0, remaining: 0, done: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getSpotifyToken();
    const ids = songs.map((s) => s.spotify_track_id).join(",");

    const res = await fetch(`https://api.spotify.com/v1/tracks?ids=${ids}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Spotify batch failed (${res.status}): ${body}`);
      throw new Error(`Spotify API error: ${res.status}`);
    }

    const data = await res.json();
    let updated = 0;

    for (const track of data.tracks) {
      if (!track) continue;
      const albumArt = track.album?.images?.[0]?.url;
      if (!albumArt) continue;

      const song = songs.find((s) => s.spotify_track_id === track.id);
      if (!song) continue;

      const { error: updateError } = await supabase
        .from("songs")
        .update({ album_art_url: albumArt })
        .eq("id", song.id);

      if (!updateError) updated++;
    }

    const newRemaining = remaining - updated;
    return new Response(JSON.stringify({ updated, remaining: newRemaining, done: newRemaining <= 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
