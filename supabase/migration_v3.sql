-- V3 Migration: map, auth, social features
-- Run in Supabase SQL Editor

-- ── 1. Extend activities table ──────────────────────────────────────────────
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS cta_label text;

-- ── 2. Profiles ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name          text,
  phone         text UNIQUE,
  neighborhood  text,
  baby_birthdate date,
  photo_url     text,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can read own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ── 3. Friendships ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles ON DELETE CASCADE,
  friend_id  uuid REFERENCES profiles ON DELETE CASCADE,
  status     text CHECK (status IN ('pending','accepted','declined')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, friend_id)
);
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own friendships"    ON friendships;
DROP POLICY IF EXISTS "Users create friend requests" ON friendships;
DROP POLICY IF EXISTS "Recipient can update status"  ON friendships;
CREATE POLICY "Users see own friendships" ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users create friend requests" ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Recipient can update status" ON friendships FOR UPDATE
  USING (auth.uid() = friend_id);

-- ── 4. Activity participants ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_participants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles ON DELETE CASCADE,
  activity_id uuid REFERENCES activities ON DELETE CASCADE,
  status      text CHECK (status IN ('interested','going')) DEFAULT 'going',
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, activity_id)
);
ALTER TABLE activity_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read participants"        ON activity_participants;
DROP POLICY IF EXISTS "Users manage own participation"  ON activity_participants;
CREATE POLICY "Public read participants" ON activity_participants FOR SELECT USING (true);
CREATE POLICY "Users manage own participation" ON activity_participants FOR ALL
  USING (auth.uid() = user_id);

-- ── 5. Favorites ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles ON DELETE CASCADE,
  activity_id uuid REFERENCES activities ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, activity_id)
);
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own favorites" ON favorites;
CREATE POLICY "Users manage own favorites" ON favorites FOR ALL
  USING (auth.uid() = user_id);

-- ── 6. Activity clicks ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_clicks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles ON DELETE SET NULL,
  activity_id uuid REFERENCES activities ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE activity_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users insert own clicks" ON activity_clicks;
DROP POLICY IF EXISTS "Users read own clicks"   ON activity_clicks;
CREATE POLICY "Users insert own clicks" ON activity_clicks FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users read own clicks" ON activity_clicks FOR SELECT
  USING (auth.uid() = user_id);
