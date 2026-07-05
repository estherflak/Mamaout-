#!/usr/bin/env node
// Delete activities whose every listed date is in the past.
// Keeps date-less / ongoing listings (empty next_dates) and anything with at
// least one upcoming date. Runs daily so the table never accumulates stale
// rows — and closes the Beit Emanuel edge where a recurring class leaves a
// past-only row behind once its earliest session rolls off.
//
//   node scraper/cleanup-past.js          # delete past-only rows
//   node scraper/cleanup-past.js --dry    # report only, delete nothing
//
// NOTE: favorites / participants / clicks reference activities with ON DELETE
// CASCADE, so a deleted past event also clears those rows. Past-only events
// have no attendable session left, so this is intended.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Service-role key bypasses RLS — there is no public DELETE policy on activities.
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
);

const dryRun = process.argv.includes('--dry');
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD, compares fine as string

const { data: rows, error } = await supabase
  .from('activities')
  .select('id, name, next_dates, source_url');

if (error) { console.error('Failed to fetch activities:', error.message); process.exit(1); }

// Past-only = has at least one date AND the latest of them is before today.
const stale = rows.filter(a => {
  const dates = a.next_dates;
  if (!Array.isArray(dates) || dates.length === 0) return false; // ongoing / date-less → keep
  return dates.every(d => d < today);
});

// Date-less rows can still go stale: SmartTicket show pages 404 once the run
// ends, leaving cards that link nowhere. Probe them and treat 404/410 as stale.
const dateless = rows.filter(a =>
  (!Array.isArray(a.next_dates) || a.next_dates.length === 0) &&
  a.source_url && /smarticket\.co\.il/.test(a.source_url)
);
console.log(`Probing ${dateless.length} date-less SmartTicket links for 404s…`);
for (const a of dateless) {
  try {
    const res = await fetch(a.source_url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.status === 404 || res.status === 410) stale.push(a);
  } catch { /* network hiccup — leave the row alone, try again tomorrow */ }
  await new Promise(r => setTimeout(r, 150));
}

console.log(`${rows.length} activities · ${stale.length} past-only${dryRun ? ' (dry run)' : ''}`);

if (stale.length === 0 || dryRun) {
  stale.forEach(a => console.log(`  – ${a.name}`));
  process.exit(0);
}

// Delete in chunks to keep the request size sane.
const ids = stale.map(a => a.id);
let deleted = 0;
for (let i = 0; i < ids.length; i += 100) {
  const chunk = ids.slice(i, i + 100);
  const { error: delErr } = await supabase.from('activities').delete().in('id', chunk);
  if (delErr) { console.error(`  ✗ chunk failed: ${delErr.message}`); continue; }
  deleted += chunk.length;
}

console.log(`Deleted ${deleted} past-only activities.`);
