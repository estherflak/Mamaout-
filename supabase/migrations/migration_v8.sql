-- Migration v8: provider submissions table

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  address TEXT,
  neighborhood TEXT,
  schedule_type TEXT,
  schedule_label TEXT,
  time_start TIME,
  time_end TIME,
  recurrence_days TEXT[],
  one_time_date DATE,
  price INTEGER,
  stroller_accessible BOOLEAN,
  age_range TEXT[],
  language TEXT,
  organizer_name TEXT,
  organizer_whatsapp TEXT,
  organizer_instagram TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit" ON submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can read submissions" ON submissions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can update submissions" ON submissions FOR UPDATE USING (auth.role() = 'authenticated');
