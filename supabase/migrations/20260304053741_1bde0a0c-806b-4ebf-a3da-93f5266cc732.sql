CREATE TABLE public.songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  spotify_track_id TEXT,
  album_art_url TEXT,
  spotify_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_songs_title_artist_unique ON public.songs (LOWER(title), LOWER(artist));

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view songs" ON public.songs FOR SELECT USING (true);

CREATE POLICY "Anyone can insert songs" ON public.songs FOR INSERT WITH CHECK (true);