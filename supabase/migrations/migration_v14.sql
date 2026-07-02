-- Migration v14: stable content dedup key + one-time duplicate merge
--
-- Problem: the same real class (e.g. Ra'agim's "birth to 1 year" developmental
-- play) was stored dozens of times. Two causes compounded:
--   1. SmartTicket issues a new /event/<id> URL per weekly session, so the
--      source_url-only dedup never collapsed them.
--   2. Haiku re-transliterated the Hebrew name differently each run
--      (Ra'agim / Ra'gim / Raagim / Rasgeim …), so each looked "new".
--
-- Fix: a transliteration-insensitive content key derived from the HEBREW name +
-- city, enforced in the scraper pipeline (see scraper/db.js + match_activity_id)
-- so re-running never recreates dupes — plus this one-time merge of what's
-- already in the DB. The whole migration is idempotent: once each key has a
-- single row, re-running is a no-op.
--
-- Note on the key: it is `normalized-name | city`, NOT name+venue+area. The
-- venue string is unreliable here — the legacy rows carry the specific sub-venue
-- ("משחקיית ר\"געים") while the current scraper emits the generic community
-- centre ("מרכז קהילתי בית עמנואל"), so keying on venue would re-split the same
-- class. City + a venue-suffix-stripped, age-bucketed name is the stable signal.

-- ── 1. Normalisation helpers (immutable, so a generated column can use them) ──

-- Collapse a Hebrew activity name to a dedup token: strip punctuation/gershayim,
-- remove the Ra'agim venue-suffix noise and filler words, then bucket the age
-- phrase ("לידה עד שנה" → age012, "שנה עד שלוש" → age1236) so weekly sessions
-- whose titles drift slightly still land on the same token.
CREATE OR REPLACE FUNCTION mamaout_norm_name(p_name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9א-ת]+', ' ', 'g'),
          '(ר ?געים)( משחקיי?ה התפתחותית)?|משחקיי?ה התפתחותית', ' ', 'g'),
        '\m(גילאי|גיל|לגילאי|ל)\M', ' ', 'g'),
      '\s+', ' ', 'g'),
    'מלידה עד שנה|לידה עד שנה', ' age012 ', 'g'),
  'שנה עד שלוש|הליכה עד שלוש|שנה עד גיל שלוש', ' age1236 ', 'g')
$$;

-- Map a free-text location to a canonical city token (mirrors resolveCity in
-- src/hooks/useActivities.js for the metro cities we actually ingest).
CREATE OR REPLACE FUNCTION mamaout_city(p_location text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lower(coalesce(p_location, '')) ~ 'רמת גן|ramat gan'         THEN 'ramat gan'
    WHEN lower(coalesce(p_location, '')) ~ 'תל אביב|tel aviv|jaffa|יפו' THEN 'tel aviv'
    WHEN lower(coalesce(p_location, '')) ~ 'גבעתיים|givatayim'        THEN 'givatayim'
    ELSE trim(lower(coalesce(p_location, '')))
  END
$$;

CREATE OR REPLACE FUNCTION mamaout_dedup_key(p_name text, p_location text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(regexp_replace(mamaout_norm_name(p_name), '\s+', ' ', 'g'))
         || ' | ' || mamaout_city(p_location)
$$;

-- ── 2. Generated dedup_key column + lookup index ─────────────────────────────

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS dedup_key text
  GENERATED ALWAYS AS (mamaout_dedup_key(name, location)) STORED;

CREATE INDEX IF NOT EXISTS activities_dedup_key_idx ON activities (dedup_key);

-- ── 3. Pipeline lookup the scraper calls before inserting a new URL ──────────

CREATE OR REPLACE FUNCTION match_activity_id(p_name text, p_location text)
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT id FROM activities
  WHERE dedup_key = mamaout_dedup_key(p_name, p_location)
  ORDER BY created_at ASC
  LIMIT 1
$$;

-- ── 4. One-time merge of existing duplicates ────────────────────────────────
-- Survivor per key = most-complete row (has translation > has desc translation
-- > geocoded > verified > oldest). Order matters: merge sessions FIRST (before
-- losers are deleted), then repoint child rows, then delete losers.

-- 4a. Fold every duplicate's upcoming sessions into the survivor's next_dates.
UPDATE activities a
SET next_dates = sub.dates
FROM (
  SELECT keep.id AS keep_id,
    ARRAY(
      SELECT DISTINCT d
      FROM activities x, unnest(coalesce(x.next_dates, '{}'::date[])) d
      WHERE x.dedup_key = keep.dedup_key AND d >= current_date
      ORDER BY d
      LIMIT 8
    ) AS dates
  FROM (
    SELECT DISTINCT ON (dedup_key) id, dedup_key
    FROM activities
    ORDER BY dedup_key,
      (name_en IS NOT NULL) DESC, (description_en IS NOT NULL) DESC,
      (latitude IS NOT NULL) DESC, is_verified DESC, created_at ASC
  ) keep
) sub
WHERE a.id = sub.keep_id;

-- 4b. Repoint child rows from losers to survivors, skipping rows that would
-- violate the (user_id, activity_id[, sent_on]) uniqueness, then drop leftovers.
DO $$
DECLARE
  keep_sql CONSTANT text :=
    'SELECT a.id AS loser_id, k.keep_id
       FROM activities a
       JOIN (SELECT DISTINCT ON (dedup_key) id AS keep_id, dedup_key
               FROM activities
               ORDER BY dedup_key, (name_en IS NOT NULL) DESC,
                 (description_en IS NOT NULL) DESC, (latitude IS NOT NULL) DESC,
                 is_verified DESC, created_at ASC) k
         ON k.dedup_key = a.dedup_key
      WHERE a.id <> k.keep_id';
BEGIN
  -- favorites: unique (user_id, activity_id)
  EXECUTE format($f$
    WITH map AS (%s)
    UPDATE favorites f SET activity_id = m.keep_id
    FROM map m
    WHERE f.activity_id = m.loser_id
      AND NOT EXISTS (SELECT 1 FROM favorites f2
                      WHERE f2.user_id = f.user_id AND f2.activity_id = m.keep_id)$f$, keep_sql);

  -- activity_participants: unique (user_id, activity_id)
  EXECUTE format($f$
    WITH map AS (%s)
    UPDATE activity_participants p SET activity_id = m.keep_id
    FROM map m
    WHERE p.activity_id = m.loser_id
      AND NOT EXISTS (SELECT 1 FROM activity_participants p2
                      WHERE p2.user_id = p.user_id AND p2.activity_id = m.keep_id)$f$, keep_sql);

  -- reminders_sent: unique (user_id, activity_id, sent_on)
  EXECUTE format($f$
    WITH map AS (%s)
    UPDATE reminders_sent r SET activity_id = m.keep_id
    FROM map m
    WHERE r.activity_id = m.loser_id
      AND NOT EXISTS (SELECT 1 FROM reminders_sent r2
                      WHERE r2.user_id = r.user_id AND r2.activity_id = m.keep_id
                        AND r2.sent_on = r.sent_on)$f$, keep_sql);

  -- activity_clicks: no uniqueness — repoint everything.
  EXECUTE format($f$
    WITH map AS (%s)
    UPDATE activity_clicks c SET activity_id = m.keep_id
    FROM map m WHERE c.activity_id = m.loser_id$f$, keep_sql);

  -- Any child rows still pointing at a loser are collisions we intentionally
  -- skipped (the survivor already has an equivalent row). Drop them so the
  -- loser activity can be deleted regardless of FK ON DELETE behaviour.
  EXECUTE format($f$WITH map AS (%s)
    DELETE FROM favorites f USING map m WHERE f.activity_id = m.loser_id$f$, keep_sql);
  EXECUTE format($f$WITH map AS (%s)
    DELETE FROM activity_participants p USING map m WHERE p.activity_id = m.loser_id$f$, keep_sql);
  EXECUTE format($f$WITH map AS (%s)
    DELETE FROM reminders_sent r USING map m WHERE r.activity_id = m.loser_id$f$, keep_sql);
END $$;

-- 4c. Delete the duplicate (loser) activity rows. Anything still referencing a
-- loser (a collision we skipped above) cascades or is gone; child FKs are now
-- pointed at survivors. Re-running finds no losers → deletes nothing.
WITH keep AS (
  SELECT DISTINCT ON (dedup_key) id AS keep_id, dedup_key
  FROM activities
  ORDER BY dedup_key, (name_en IS NOT NULL) DESC, (description_en IS NOT NULL) DESC,
    (latitude IS NOT NULL) DESC, is_verified DESC, created_at ASC
)
DELETE FROM activities a
USING keep k
WHERE k.dedup_key = a.dedup_key AND a.id <> k.keep_id;
