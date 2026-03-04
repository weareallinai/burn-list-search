import { useState, useMemo } from "react";
import { Search, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import SongCard from "@/components/SongCard";
import Header from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SearchPage = () => {
  const [query, setQuery] = useState("");

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ["songs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return songs;
    const q = query.toLowerCase();
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q)
    );
  }, [query, songs]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for a song or artist..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-10 text-base bg-card border-border focus-visible:ring-burn"
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Flame className="h-8 w-8 animate-pulse text-burn" />
            <p className="text-sm">Loading burned songs...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Flame className="h-8 w-8" />
            <p className="text-sm">
              {query.trim() ? "No burned songs found." : "No songs burned yet."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="mb-2 text-xs text-muted-foreground">
              {filtered.length} burned song{filtered.length !== 1 ? "s" : ""}
            </p>
            {filtered.map((song) => (
              <SongCard
                key={song.id}
                title={song.title}
                artist={song.artist}
                album_art_url={song.album_art_url}
                spotify_url={song.spotify_url}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchPage;
