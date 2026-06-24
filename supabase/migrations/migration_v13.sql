-- V13: community activity submissions
-- Adds type tagging, mom attribution, and a source URL to the submissions table.

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'organizer'
    CHECK (submission_type IN ('organizer', 'community')),
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_url TEXT;
