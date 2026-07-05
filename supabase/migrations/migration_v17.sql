-- Migration v17: allow Gush Dan metro cities in places.area (applied to
-- production 2026-07-05 via MCP as "v17_places_area_gush_dan").
-- The old CHECK constraint only allowed tel_aviv / ramat_gan, which made it
-- impossible to add Givatayim places.
ALTER TABLE places DROP CONSTRAINT IF EXISTS places_area_check;
ALTER TABLE places ADD CONSTRAINT places_area_check
  CHECK (area IN ('tel_aviv', 'ramat_gan', 'givatayim', 'bnei_brak', 'holon'));
