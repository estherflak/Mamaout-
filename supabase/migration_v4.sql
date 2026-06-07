-- V4: add baby_name to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS baby_name text;
