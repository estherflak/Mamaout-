-- Migration v6: scheduling, enrichment, and organizer fields for activities

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS schedule_type       TEXT CHECK (schedule_type IN ('recurring', 'one-time', 'drop-in')),
  ADD COLUMN IF NOT EXISTS schedule_label      TEXT,           -- "Every Monday · 10:00–11:00"
  ADD COLUMN IF NOT EXISTS recurrence_days     TEXT[],         -- ARRAY['monday', 'wednesday']
  ADD COLUMN IF NOT EXISTS time_start          TIME,
  ADD COLUMN IF NOT EXISTS time_end            TIME,
  ADD COLUMN IF NOT EXISTS next_dates          DATE[],         -- next 4 upcoming occurrence dates
  ADD COLUMN IF NOT EXISTS price               INTEGER,        -- NIS; 0 = free; NULL = unknown
  ADD COLUMN IF NOT EXISTS price_notes         TEXT,           -- "First session free"
  ADD COLUMN IF NOT EXISTS is_free             BOOLEAN GENERATED ALWAYS AS (price = 0) STORED,
  ADD COLUMN IF NOT EXISTS stroller_accessible BOOLEAN,
  ADD COLUMN IF NOT EXISTS address             TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood        TEXT,           -- "Florentin", "Old North"
  ADD COLUMN IF NOT EXISTS organizer_name      TEXT,
  ADD COLUMN IF NOT EXISTS organizer_whatsapp  TEXT,
  ADD COLUMN IF NOT EXISTS baby_age_max        INTEGER;        -- weeks; completes the baby_age_min range
