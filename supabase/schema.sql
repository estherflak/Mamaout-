-- Run this in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New query → paste → Run

CREATE TABLE IF NOT EXISTS activities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  location      text,
  category      text CHECK (category IN ('movement','wellness','creative','social','baby-focused')),
  price_range   text CHECK (price_range IN ('free','₪','₪₪','₪₪₪')),
  baby_age_min  integer,
  language      text DEFAULT 'he' CHECK (language IN ('he','en')),
  source_url    text UNIQUE,
  source_name   text,
  is_verified   boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- Index for fast deduplication check on source_url
CREATE INDEX IF NOT EXISTS activities_source_url_idx ON activities (source_url);

-- Index for frontend ordering
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON activities (created_at DESC);

-- Enable Row Level Security
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Public read access (anon key can SELECT)
CREATE POLICY "public_read" ON activities
  FOR SELECT USING (true);

-- Service role / anon can insert (scraper writes via anon key)
CREATE POLICY "anon_insert" ON activities
  FOR INSERT WITH CHECK (true);
