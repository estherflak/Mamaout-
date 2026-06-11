-- Migration v7: places table for permanent venues (playgrounds & libraries)

CREATE TABLE IF NOT EXISTS places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  place_type TEXT CHECK (place_type IN ('playground', 'library')) NOT NULL,
  address TEXT,
  neighborhood TEXT,
  area TEXT CHECK (area IN ('tel_aviv', 'ramat_gan')),
  age_min_months INTEGER DEFAULT 0,
  age_max_months INTEGER,
  opening_hours JSONB,          -- { "sun": "09:00-17:00", "mon": "09:00-17:00", ... }
  price INTEGER,                -- entry fee in NIS (0 = free)
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  photo_url TEXT,
  story_hour_schedule TEXT,     -- for libraries: e.g. "Every Tuesday 10:00"
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Places are publicly readable" ON places FOR SELECT USING (true);
