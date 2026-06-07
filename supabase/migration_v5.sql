-- V4: interests, schedule preferences, and onboarding tracking
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS interests       text[],
  ADD COLUMN IF NOT EXISTS free_days       text[],
  ADD COLUMN IF NOT EXISTS onboarding_done boolean DEFAULT false;

-- Existing users: mark onboarding_done so they see the new flow once on next login
-- (comment this line out if you want ALL existing users to re-do onboarding)
-- UPDATE profiles SET onboarding_done = true WHERE name IS NOT NULL;
