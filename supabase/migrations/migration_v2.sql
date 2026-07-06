-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- Adds V2 columns for translations, event dates, and venue info

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS name_en        text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS event_date     timestamptz,
  ADD COLUMN IF NOT EXISTS venue          text;
