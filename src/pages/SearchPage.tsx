import { useState, useMemo } from "react";
import { Search, Flame, ArrowDownAZ, Clock, Music } from "lucide-react";
import { Input } from "@/components/ui/input";
import SongCard from "@/components/SongCard";
import Header from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type SortOption = "newest" | "title" | "artist";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

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
    let result = songs;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q)
      );
    }
    if (sort === "title") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "artist") {
      result = [...result].sort((a, b) => a.artist.localeCompare(b.artist));
    }
    // "newest" is already the default order from the query
    return result;
  }, [query, songs, sort]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold burn-text tracking-tight">Motorcycle Tony's Music Club</h2>
          <div className="mx-auto mt-2 h-px w-16 burn-gradient rounded-full opacity-60" />
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for a song or artist..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-10 text-base bg-card border-border focus-visible:ring-burn"
          />
        </div>

        <div className="mb-6 flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Sort:</span>
          <ToggleGroup
            type="single"
            value={sort}
            onValueChange={(v) => { if (v) setSort(v as SortOption); }}
            className="gap-1"
          >
            <ToggleGroupItem value="newest" className="h-8 px-3 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
              <Clock className="h-3.5 w-3.5 mr-1" /> Newest
            </ToggleGroupItem>
            <ToggleGroupItem value="title" className="h-8 px-3 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
              <ArrowDownAZ className="h-3.5 w-3.5 mr-1" /> Title
            </ToggleGroupItem>
            <ToggleGroupItem value="artist" className="h-8 px-3 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
              <Music className="h-3.5 w-3.5 mr-1" /> Artist
            </ToggleGroupItem>
          </ToggleGroup>
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
