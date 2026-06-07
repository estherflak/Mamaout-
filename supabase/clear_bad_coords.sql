-- Clear coordinates that were geocoded to generic city/town centroids.
-- These activities will be re-geocoded on the next backfill-coords run.
--
-- Tel Aviv city centre (Nominatim "Tel Aviv, Israel" result)
UPDATE activities SET latitude = NULL, longitude = NULL
WHERE latitude  BETWEEN 32.082 AND 32.090
  AND longitude BETWEEN 34.778 AND 34.786;

-- Ramat Gan city centre
UPDATE activities SET latitude = NULL, longitude = NULL
WHERE latitude  BETWEEN 32.078 AND 32.084
  AND longitude BETWEEN 34.820 AND 34.828;

-- Confirm how many were cleared
SELECT COUNT(*) AS still_missing FROM activities WHERE latitude IS NULL;
