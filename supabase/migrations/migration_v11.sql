-- Migration v11: seed the places directory (Phase 4)
-- Real indoor playgrounds (משחקיות) and libraries (ספריות) in Tel Aviv & Ramat Gan.
--
-- ⚠️  VERIFY BEFORE RELYING ON THIS: names, neighborhoods and types are real,
-- but opening_hours, phone/WhatsApp numbers and prices are best-effort and
-- should be confirmed against each venue's official page before launch.
-- "Open now" in the app is derived from opening_hours, so wrong hours = wrong badge.
--
-- Idempotent: a unique index on name lets this be re-run safely.

CREATE UNIQUE INDEX IF NOT EXISTS places_name_uniq ON places (name);

INSERT INTO places
  (name, place_type, address, neighborhood, area, age_min_months, age_max_months,
   opening_hours, price, phone, whatsapp, instagram, story_hour_schedule, notes)
VALUES
  -- ── Indoor playgrounds ──────────────────────────────────────────────
  ('Funky Monkey · פאנקי מאנקי', 'playground',
   'Nemal Tel Aviv (Tel Aviv Port)', 'Tel Aviv Port', 'tel_aviv', 0, NULL,
   '{"sun":"10:00-19:00","mon":"10:00-19:00","tue":"10:00-19:00","wed":"10:00-19:00","thu":"10:00-19:00","fri":"09:30-15:00","sat":"10:00-19:00"}',
   NULL, NULL, NULL, NULL, NULL,
   'Soft-play & activity park at the Tel Aviv Port. Confirm hours/price before visiting.'),

  ('Beit Tami · בית תמי', 'playground',
   'Sheinkin area', 'Lev Tel Aviv', 'tel_aviv', 0, 108,
   '{"sun":"09:00-13:00","mon":"09:00-13:00","tue":"09:00-13:00","wed":"09:00-13:00","thu":"09:00-13:00"}',
   NULL, NULL, NULL, NULL, NULL,
   'Cultural center with daily baby & toddler activities — reservation recommended.'),

  ('Regaem Developmental Playground · ר״געים', 'playground',
   'Beit Emanuel, Ramat Gan', 'Beit Emanuel', 'ramat_gan', 0, 72,
   '{"sun":"09:30-18:30","mon":"09:30-18:30","tue":"09:30-18:30","wed":"09:30-18:30","thu":"09:30-18:30","fri":"09:00-13:30","sat":"09:30-12:00"}',
   NULL, NULL, '972525367240', NULL, NULL,
   'Developmental soft-play at Beit Emanuel. Socks required, no shoes. Newborns to age 6.'),

  ('Gymboree Parparim · ג׳ימבורי פרפרים', 'playground',
   'Ramat Gan', 'Ramat Gan', 'ramat_gan', 6, 72,
   '{"sun":"09:00-18:00","mon":"09:00-18:00","tue":"09:00-18:00","wed":"09:00-18:00","thu":"09:00-18:00","fri":"09:00-13:00"}',
   NULL, NULL, '972542002020', NULL, NULL,
   'Sensory & motor-development play, café for parents, birthday parties. From 6 months.'),

  ('Pealton · פעלטון (Ayalon Mall)', 'playground',
   'Ayalon Mall (Azrieli), Ramat Gan', 'Ayalon Mall', 'ramat_gan', 0, 108,
   '{"sun":"10:00-20:00","mon":"10:00-20:00","tue":"10:00-20:00","wed":"10:00-20:00","thu":"10:00-20:00","fri":"09:00-15:00","sat":"10:00-20:00"}',
   NULL, NULL, NULL, NULL, NULL,
   'Indoor playground on the food-court level of Ayalon Mall. Ages 0–9.'),

  -- ── Libraries ───────────────────────────────────────────────────────
  ('Beit Ariela · בית אריאלה (Sha''ar Zion)', 'library',
   'Sha''ul HaMelech Blvd 25', 'HaKirya', 'tel_aviv', 0, NULL,
   '{"sun":"09:00-19:00","mon":"09:00-19:00","tue":"09:00-19:00","wed":"09:00-19:00","thu":"09:00-19:00","fri":"09:00-13:00"}',
   0, NULL, NULL, NULL, 'Toddler story hours — check the library schedule',
   'Tel Aviv''s central library with a dedicated children''s library. Membership free for residents.'),

  ('Ramat Aviv Gimel Library · ספריית רמת אביב ג׳', 'library',
   'Ramat Aviv Gimel', 'Ramat Aviv', 'tel_aviv', 0, NULL,
   '{"sun":"09:00-19:00","mon":"09:00-19:00","tue":"09:00-19:00","wed":"09:00-19:00","thu":"09:00-19:00"}',
   0, NULL, NULL, NULL, 'Weekly toddler story hour — check schedule',
   'Neighborhood branch of the Tel Aviv library network. Free for city residents.'),

  ('Ramat Gan Central Library · הספרייה העירונית רמת גן', 'library',
   'Ramat Gan', 'City Center', 'ramat_gan', 0, NULL,
   '{"sun":"09:00-19:00","mon":"09:00-19:00","tue":"09:00-19:00","wed":"09:00-19:00","thu":"09:00-19:00","fri":"09:00-13:00"}',
   0, NULL, NULL, NULL, 'Monthly story hours for tots — check schedule',
   'Hub of the Ramat Gan municipal library network (16 branches citywide).')
ON CONFLICT (name) DO NOTHING;
