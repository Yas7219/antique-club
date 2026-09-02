-- Chat rooms
CREATE TABLE public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms viewable by all"
ON public.chat_rooms FOR SELECT USING (true);

INSERT INTO public.chat_rooms (slug, name, description, icon, sort_order) VALUES
  ('general', 'The Grand Salon', 'Where all collectors gather', 'Globe', 1),
  ('antiques', 'Antiques & Furniture', 'Period pieces, furniture, decor', 'Armchair', 2),
  ('coins', 'Coins & Medals', 'Numismatic discussions', 'Coins', 3),
  ('watches', 'Watches & Timepieces', 'Horology corner', 'Watch', 4),
  ('art', 'Art & Paintings', 'Fine art talk', 'Palette', 5),
  ('books', 'Books & Manuscripts', 'Rare books and manuscripts', 'BookOpen', 6),
  ('jewelry', 'Jewelry & Gems', 'Precious pieces', 'Gem', 7),
  ('trades', 'Trades & Negotiations', 'Looking to buy, sell, trade', 'Sparkles', 8);

-- Add room_id to messages
ALTER TABLE public.messages ADD COLUMN room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE;

-- Backfill: set existing messages to general room
UPDATE public.messages
SET room_id = (SELECT id FROM public.chat_rooms WHERE slug = 'general');

ALTER TABLE public.messages ALTER COLUMN room_id SET NOT NULL;

CREATE INDEX idx_messages_room_created ON public.messages(room_id, created_at DESC);

-- Video rooms
CREATE TABLE public.video_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  daily_url text NOT NULL,
  daily_name text NOT NULL,
  created_by uuid NOT NULL,
  call_type text NOT NULL DEFAULT 'video',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Video rooms viewable by all"
ON public.video_rooms FOR SELECT USING (true);

CREATE POLICY "Authenticated users create video rooms"
ON public.video_rooms FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator ends video rooms"
ON public.video_rooms FOR UPDATE
USING (auth.uid() = created_by);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_rooms;