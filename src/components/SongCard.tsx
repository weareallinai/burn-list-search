import { ExternalLink, Flame } from "lucide-react";

interface SongCardProps {
  title: string;
  artist: string;
  album_art_url?: string | null;
  spotify_url?: string | null;
}

const SongCard = ({ title, artist, album_art_url, spotify_url }: SongCardProps) => {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-burn/20">
      {album_art_url ? (
        <img
          src={album_art_url}
          alt={`${title} album art`}
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Flame className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-tight text-foreground">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{artist}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-burn/10 px-2 py-0.5 text-xs font-medium text-burn">
            <Flame className="h-3 w-3" />
            Already burned
          </span>
        </div>
      </div>
      {spotify_url && (
        <a
          href={spotify_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Open in Spotify"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
};

export default SongCard;
