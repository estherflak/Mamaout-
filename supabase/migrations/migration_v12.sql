-- V12: track sent reminder emails so the daily cron never double-sends.
CREATE TABLE IF NOT EXISTS reminders_sent (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles ON DELETE CASCADE,
  activity_id uuid REFERENCES activities ON DELETE CASCADE,
  sent_on     date NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, activity_id, sent_on)
);

-- Only the service role (used by the cron) touches this table; lock it down.
ALTER TABLE reminders_sent ENABLE ROW LEVEL SECURITY;
