import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import SongCard from "@/components/SongCard";
import { Lock, Flame, Loader2 } from "lucide-react";

const PASSCODE = "0129";

const AddPage = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);

  const [spotifyInput, setSpotifyInput] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [albumArt, setAlbumArt] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [spotifyTrackId, setSpotifyTrackId] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const queryClient = useQueryClient();

  const handlePasscode = () => {
    if (passcode === PASSCODE) {
      setAuthenticated(true);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  const extractTrackId = (input: string): string | null => {
    const trimmed = input.trim();
    // spotify:track:ID
    const uriMatch = trimmed.match(/spotify:track:([a-zA-Z0-9]+)/);
    if (uriMatch) return uriMatch[1];
    // https://open.spotify.com/track/ID
    const urlMatch = trimmed.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
    if (urlMatch) return urlMatch[1];
    // Raw ID (alphanumeric, 22 chars)
    if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return trimmed;
    return null;
  };

  const handleFetchSpotify = async () => {
    const trackId = extractTrackId(spotifyInput);
    if (!trackId) {
      toast.error("Invalid Spotify link or track ID");
      return;
    }
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("spotify-track", {
        body: { trackId },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setTitle(data.title);
      setArtist(data.artist);
      setAlbumArt(data.albumArt);
      setSpotifyUrl(data.spotifyUrl);
      setSpotifyTrackId(trackId);
      setPreviewReady(true);
    } catch (e: any) {
      toast.error("Failed to fetch track info");
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !artist.trim()) {
      toast.error("Title and artist are required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("songs").insert({
        title: title.trim(),
        artist: artist.trim(),
        album_art_url: albumArt || null,
        spotify_url: spotifyUrl || null,
        spotify_track_id: spotifyTrackId || null,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("This song is already burned.");
        } else {
          throw error;
        }
        return;
      }
      toast.success(`🔥 "${title}" has been burned!`);
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      resetForm();
    } catch (e: any) {
      toast.error("Failed to save song");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSpotifyInput("");
    setTitle("");
    setArtist("");
    setAlbumArt("");
    setSpotifyUrl("");
    setSpotifyTrackId("");
    setPreviewReady(false);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto flex max-w-sm flex-col items-center px-4 py-16">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-foreground">Admin Access</h2>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Enter the passcode to add burned songs.
          </p>
          <div className="flex w-full gap-2">
            <Input
              type="password"
              placeholder="Passcode"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setPasscodeError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handlePasscode()}
              className="h-12 bg-card border-border text-center text-lg tracking-widest"
            />
            <Button
              onClick={handlePasscode}
              className="h-12 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Enter
            </Button>
          </div>
          {passcodeError && (
            <p className="mt-3 text-sm text-destructive">Incorrect passcode</p>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h2 className="mb-6 text-xl font-bold text-foreground">
          <Flame className="mr-2 inline h-5 w-5 text-burn" />
          Burn a Song
        </h2>

        {/* Spotify lookup */}
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <Label className="mb-2 block text-sm font-medium text-foreground">
            Paste Spotify Link or Track ID
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://open.spotify.com/track/... or track ID"
              value={spotifyInput}
              onChange={(e) => setSpotifyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchSpotify()}
              className="h-10 bg-background border-border font-mono text-sm"
            />
            <Button
              onClick={handleFetchSpotify}
              disabled={fetching || !spotifyInput.trim()}
              className="h-10 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Or fill in manually below.
          </p>
        </div>

        {/* Preview */}
        {previewReady && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
            <SongCard
              title={title}
              artist={artist}
              album_art_url={albumArt}
              spotify_url={spotifyUrl}
            />
          </div>
        )}

        {/* Manual fields */}
        <div className="mb-6 space-y-4 rounded-xl border border-border bg-card p-4">
          <div>
            <Label className="mb-1 block text-sm text-foreground">Song Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fade Into You"
              className="h-10 bg-background border-border"
            />
          </div>
          <div>
            <Label className="mb-1 block text-sm text-foreground">Artist</Label>
            <Input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g. Mazzy Star"
              className="h-10 bg-background border-border"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !title.trim() || !artist.trim()}
          className="h-12 w-full burn-gradient text-primary-foreground font-semibold text-base"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Flame className="mr-2 h-4 w-4" />
          )}
          Burn It
        </Button>
      </main>
    </div>
  );
};

export default AddPage;
