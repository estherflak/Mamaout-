-- Migration v10: saved searches
-- Lets a mom save a search that currently has no results (e.g. "Pottery in
-- Tel Aviv"). She can re-run it later from her profile, and the saved rows
-- double as a signal of what activities are in demand.

CREATE TABLE IF NOT EXISTS saved_searches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles ON DELETE CASCADE,
  query       text,
  area        text DEFAULT 'all',
  label       text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own saved searches" ON saved_searches;
CREATE POLICY "Users manage own saved searches" ON saved_searches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS saved_searches_user_idx ON saved_searches (user_id);
