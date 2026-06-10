-- ============================================================
-- MamaOut — Data Cleanup v1
-- Run this in the Supabase SQL Editor (dashboard).
-- Review each DELETE before running in production.
-- ============================================================

-- 1. Non-activities: marketing copy, testimonials, FAQ content, gift cards
--    Identified by anchor-fragment source URLs from Mommy Jogger homepage
DELETE FROM activities
WHERE source_url ~ '#(5|8|9|10|11)$';

--    Question-shaped names (FAQ / marketing headlines, not bookable events)
DELETE FROM activities
WHERE name ~ '^(מה|האם|Have you|What|Why|How|Do you|Can you|Is it)'
  AND is_verified = false;

--    Gift cards / product pages
DELETE FROM activities
WHERE name ILIKE '%גיפט קארד%'
   OR name ILIKE '%gift card%'
   OR name ILIKE '%מתנה ליולדת%';

-- 2. Web directory / aggregator pages — not real providers
DELETE FROM activities
WHERE source_url ILIKE '%easy.co.il/list/%'
   OR source_url ILIKE '%secrettelaviv.com/best/%'
   OR source_url ILIKE '%intently.co%'
   OR source_url ILIKE '%alternabe.co.il%'
   OR source_url ILIKE '%findglocal.com%'
   OR source_url ILIKE '%atly.com%'
   OR source_url ILIKE '%near-place.com%'
   OR source_url ILIKE '%birthdaywishcards.com%';

-- 3. Out-of-area providers
DELETE FROM activities
WHERE source_url ILIKE '%waterbabiesusa.com%'    -- American company
   OR source_url ILIKE '%Jerusalem%'              -- Jerusalem
   OR source_url ILIKE '%swim-west.com%';         -- Ramat Hasharon

-- 4a. Deduplicate Michal Alon — keep the one with the real address
DELETE FROM activities
WHERE name ILIKE '%michal alon%'
  AND venue NOT ILIKE '%rabbi moshe%'
  AND venue NOT ILIKE '%ben ezra%';

-- 4b. Deduplicate Pilates (stroller) from easy.co.il — keep one
DELETE FROM activities a
USING activities b
WHERE a.name = b.name
  AND a.id > b.id
  AND a.source_url ILIKE '%easy.co.il%';

-- 4c. Baby Massage Workshop — Tel Aviv Municipality: keep one
DELETE FROM activities a
USING activities b
WHERE a.name ILIKE '%baby massage workshop%'
  AND b.name ILIKE '%baby massage workshop%'
  AND a.id > b.id;

-- 4d. "What They Didn't Tell Us About Maternity Leave" — marketing copy, delete all
DELETE FROM activities
WHERE name ILIKE '%what they didn%t tell%'
   OR name ILIKE '%מה לא סיפרו לנו%';

-- 4e. "What's Special About Mommy Jogger" — marketing copy, delete all
DELETE FROM activities
WHERE name ILIKE '%what%s special about mommy jogger%';

-- 4f. Dyada baby massage duplicates — keep the one with the most complete description
DELETE FROM activities a
USING activities b
WHERE a.name ILIKE '%dyada%'
  AND b.name ILIKE '%dyada%'
  AND a.id > b.id;

-- 4g. Mammy Lis Club — Hebrew + English rows: merge to one. Keep English row, update it with Hebrew name.
-- First, copy Hebrew name into the English row
UPDATE activities a
SET name = (SELECT b.name FROM activities b WHERE b.name NOT ILIKE '%mammy lis%english%' AND b.name ILIKE '%mammy lis%' AND b.language = 'he' LIMIT 1)
WHERE a.name ILIKE '%mammy lis%'
  AND a.language = 'en';
-- Then delete the Hebrew-only duplicate
DELETE FROM activities a
USING activities b
WHERE a.name ILIKE '%mammy lis%'
  AND b.name ILIKE '%mammy lis%'
  AND a.language = 'he'
  AND b.language = 'en'
  AND a.id != b.id;

-- 5. Outdated one-time events (past event_date, not recurring)
DELETE FROM activities
WHERE event_date IS NOT NULL
  AND event_date < NOW()
  AND (schedule_type IS NULL OR schedule_type = 'one-time');

-- ============================================================
-- After running the above, verify remaining count:
-- SELECT count(*), source_name FROM activities GROUP BY source_name ORDER BY count DESC;
-- Target: 25–35 high-quality rows
-- ============================================================
