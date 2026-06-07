#!/usr/bin/env node
// One-time script: geocode all activities that are missing lat/lng
// Run with: node scraper/backfill-coords.js
// Nominatim limit: 1 req/s — ~100 activities takes ~2 minutes

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { geocodeActivity } from './sources/geocode.js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
);

const { data: activities, error } = await supabase
  .from('activities')
  .select('id, venue, location, name_en')
  .is('latitude', null)
  .order('created_at', { ascending: false });

if (error) { console.error('Failed to fetch activities:', error.message); process.exit(1); }

console.log(`Geocoding ${activities.length} activities without coordinates…\n`);

let ok = 0, failed = 0;

for (const a of activities) {
  // Strategy 1: venue + location (only if venue looks like a real place, not the activity name)
  // Strategy 2: location alone (neighborhood / address string)
  // geocodeActivity already adds ", Israel" and enforces the bounding box

  const hasRealVenue = a.venue?.trim() && a.venue.trim() !== a.name_en;
  const coords =
    (hasRealVenue ? await geocodeActivity(a.venue.trim(), a.location) : null) ||
    (a.location   ? await geocodeActivity(a.location, '')              : null);

  if (coords) {
    const { error: updateErr } = await supabase
      .from('activities')
      .update({ latitude: coords.latitude, longitude: coords.longitude })
      .eq('id', a.id);

    if (updateErr) {
      console.log(`  ✗ ${a.name_en} — DB error: ${updateErr.message}`);
      failed++;
    } else {
      console.log(`  ✓ ${a.name_en} → ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
      ok++;
    }
  } else {
    console.log(`  – ${a.name_en} — no result`);
    failed++;
  }
}

console.log(`\nDone: ${ok} geocoded, ${failed} failed`);
