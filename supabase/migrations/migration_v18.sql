-- Migration v18: Hebrew notes for places
--
-- places.notes is stored in English (the app's canonical content language);
-- the Hebrew UI needs its own text. notes_he is filled by the nightly
-- translation backfill (scraper/backfill-translations.js) for any place
-- where notes is set and notes_he is missing — clear notes_he after editing
-- notes to get it retranslated.

ALTER TABLE places ADD COLUMN IF NOT EXISTS notes_he text;
