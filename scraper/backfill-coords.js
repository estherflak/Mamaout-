#!/usr/bin/env node
// Geocode all activities missing lat/lng.
// Run with: node scraper/backfill-coords.js
// Nominatim limit: 1 req/s — ~100 activities takes ~2 minutes

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { geocodeActivity } from './sources/geocode.js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
);

// Known venues / sources with fixed coordinates (avoids Nominatim fallback to city centre)
const KNOWN_COORDS = {
  'Beit Emanuel Ramat Gan': { latitude: 32.0779, longitude: 34.8197 },
};

// Neighbourhood → approximate coordinate lookup.
// Used as a last-resort fallback when Nominatim returns nothing.
const NEIGHBOURHOOD_COORDS = [
  // Tel Aviv
  { keywords: ['הצפון הישן', 'old north', 'צפון ישן'],           latitude: 32.0952, longitude: 34.7796 },
  { keywords: ['רמת אביב', 'ramat aviv'],                        latitude: 32.1182, longitude: 34.8027 },
  { keywords: ['פלורנטין', 'florentin'],                          latitude: 32.0584, longitude: 34.7648 },
  { keywords: ['נוה צדק', 'neve tzedek', 'neveh tzedek'],        latitude: 32.0638, longitude: 34.7630 },
  { keywords: ['יפו', 'jaffa', 'yafo'],                          latitude: 32.0547, longitude: 34.7515 },
  { keywords: ['דיזנגוף', 'dizengoff'],                           latitude: 32.0812, longitude: 34.7776 },
  { keywords: ['לב תל אביב', 'city center', 'city centre'],      latitude: 32.0706, longitude: 34.7795 },
  { keywords: ['הכרמל', 'carmel market', 'שוק הכרמל'],           latitude: 32.0666, longitude: 34.7724 },
  { keywords: ['התקווה', 'hatikva'],                              latitude: 32.0490, longitude: 34.7897 },
  { keywords: ['נווה שאנן', 'neve shaanan'],                      latitude: 32.0500, longitude: 34.7835 },
  { keywords: ['מונטיפיורי', 'montefiore'],                       latitude: 32.0640, longitude: 34.7740 },
  { keywords: ['הצפון החדש', 'new north', 'צפון חדש'],           latitude: 32.1000, longitude: 34.7750 },
  // Ramat Gan & nearby
  { keywords: ['רמת גן', 'ramat gan'],                           latitude: 32.0806, longitude: 34.8241 },
  { keywords: ['גבעתיים', 'givatayim'],                           latitude: 32.0693, longitude: 34.8128 },
  { keywords: ['בני ברק', 'bnei brak', 'bnei berak'],            latitude: 32.0841, longitude: 34.8336 },
  // South
  { keywords: ['בת ים', 'bat yam'],                              latitude: 32.0216, longitude: 34.7497 },
  { keywords: ['חולון', 'holon'],                                 latitude: 32.0109, longitude: 34.7793 },
  // North
  { keywords: ['הרצליה', 'herzliya'],                             latitude: 32.1663, longitude: 34.8494 },
  { keywords: ['כפר סבא', 'kfar saba'],                          latitude: 32.1768, longitude: 34.9073 },
];

function lookupNeighbourhood(venue, location) {
  const haystack = `${venue} ${location}`.toLowerCase();
  for (const entry of NEIGHBOURHOOD_COORDS) {
    if (entry.keywords.some(k => haystack.includes(k.toLowerCase()))) {
      return { latitude: entry.latitude, longitude: entry.longitude };
    }
  }
  return null;
}

const { data: activities, error } = await supabase
  .from('activities')
  .select('id, venue, location, name_en, source_name')
  .is('latitude', null)
  .order('created_at', { ascending: false });

if (error) { console.error('Failed to fetch activities:', error.message); process.exit(1); }

console.log(`Geocoding ${activities.length} activities without coordinates…\n`);

let ok = 0, failed = 0;

for (const a of activities) {
  // 1. Known source with fixed coordinates
  const knownBySource = a.source_name ? KNOWN_COORDS[a.source_name] : null;

  // 2. Venue query via Nominatim (only if venue isn't just the activity name)
  const hasRealVenue = a.venue?.trim() && a.venue.trim() !== a.name_en;

  // 3. Location query via Nominatim
  // 4. Neighbourhood keyword lookup (fast, no rate limit)
  const coords =
    knownBySource ||
    (hasRealVenue ? await geocodeActivity(a.venue.trim(), a.location) : null) ||
    (a.location   ? await geocodeActivity(a.location, '')              : null) ||
    lookupNeighbourhood(a.venue || '', a.location || '');

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
