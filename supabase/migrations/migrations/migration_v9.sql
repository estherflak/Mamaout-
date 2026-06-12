-- Migration v9: profile language preference and notification opt-in

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS language          TEXT CHECK (language IN ('hebrew','english','both')),
  ADD COLUMN IF NOT EXISTS notification_pref TEXT CHECK (notification_pref IN ('whatsapp','none'));
