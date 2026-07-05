-- Migration v16: one-time data repair (applied to production 2026-07-05 via
-- MCP as "v16_data_cleanup_remerge_ages_scope" — kept here for the record).
--
-- The v14 merge ran on Jul 2 but the deployed Vercel crons were still running
-- pre-v14 code and re-inserted per-session duplicates on Jul 3–5. This
-- re-runs the merge, drops rows out of the app's 0–12-month scope, and fixes
-- the hardcoded 0–156-week age ranges.
--
-- NOTE: superseded in part by scraper/backfill-ages.js, which recomputes ages
-- from Hebrew names with the shared parser (scraper/sources/hebrew-ages.js)
-- and was run right after this migration.

DELETE FROM activities
WHERE name ~ 'שנה (עד|וחצי[ -]?עד)? ?[- ]?שלוש'
   OR name ~ 'שנה וחצי[- ]שלוש'
   OR name ~ 'הליכה ?[-–] ?שלוש|הליכה עד שלוש'
   OR name LIKE '%יום הולדת%';

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

WITH keep AS (
  SELECT DISTINCT ON (dedup_key) id AS keep_id, dedup_key
  FROM activities
  ORDER BY dedup_key, (name_en IS NOT NULL) DESC, (description_en IS NOT NULL) DESC,
    (latitude IS NOT NULL) DESC, is_verified DESC, created_at ASC
)
DELETE FROM activities a
USING keep k
WHERE k.dedup_key = a.dedup_key AND a.id <> k.keep_id;

UPDATE activities SET baby_age_max = 52
WHERE name ~ 'לידה עד (גיל )?שנה' AND (baby_age_max IS NULL OR baby_age_max > 52);

UPDATE activities SET baby_age_max = 17
WHERE name ~ 'לידה ?(עד|[-–]) ?4 חודשים' AND (baby_age_max IS NULL OR baby_age_max > 17);

UPDATE activities SET baby_age_min = 26
WHERE name ~ '(מ?זחילה)' AND name !~ 'לידה' AND coalesce(baby_age_min, 0) < 26;

UPDATE activities SET baby_age_max = 78
WHERE name ~ 'עד שנה וחצי|[-–] ?שנה וחצי' AND (baby_age_max IS NULL OR baby_age_max > 78);

UPDATE activities SET baby_age_max = NULL WHERE baby_age_max = 156;

UPDATE activities
SET next_dates = ARRAY(SELECT d FROM unnest(next_dates) d WHERE d >= current_date ORDER BY d)
WHERE next_dates IS NOT NULL
  AND EXISTS (SELECT 1 FROM unnest(next_dates) d WHERE d < current_date);

DELETE FROM activities
WHERE schedule_type = 'one-time'
  AND event_date IS NULL
  AND next_dates IS NOT NULL AND next_dates = '{}';
