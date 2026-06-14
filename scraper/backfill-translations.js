#!/usr/bin/env node
// Fill English translations (name_en / description_en) for any activity missing them.
// Runs AFTER scraping — the cron scrapers insert raw Hebrew, this translates it once.
// Idempotent: only touches rows where name_en IS NULL. Re-run any time.
//
//   node scraper/backfill-translations.js          # translate all missing
//   node scraper/backfill-translations.js 50       # cap at 50 (cost control)

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { translateActivity } from './translate.js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
);

const limit = Number(process.argv[2]) || null;
const CONCURRENCY = 5;

const { data: rows, error } = await supabase
  .from('activities')
  .select('id, name, description, language')
  .is('name_en', null)
  .order('created_at', { ascending: false });

if (error) { console.error('Failed to fetch activities:', error.message); process.exit(1); }

const todo = limit ? rows.slice(0, limit) : rows;
console.log(`Translating ${todo.length}${limit ? ` (of ${rows.length})` : ''} activities…\n`);

let ok = 0, failed = 0;

async function handle(a) {
  try {
    // Already-English rows don't need a model call — just mirror the source.
    const out = a.language === 'en'
      ? { name_en: a.name, description_en: a.description }
      : await translateActivity({ name: a.name, description: a.description });

    const { error: updateErr } = await supabase
      .from('activities')
      .update({ name_en: out.name_en, description_en: out.description_en })
      .eq('id', a.id);

    if (updateErr) { console.log(`  ✗ ${a.name} — DB error: ${updateErr.message}`); failed++; }
    else { console.log(`  ✓ ${a.name} → ${out.name_en}`); ok++; }
  } catch (err) {
    console.log(`  ✗ ${a.name} — ${err.message}`);
    failed++;
  }
}

// Process in small concurrent batches to stay well within rate limits.
for (let i = 0; i < todo.length; i += CONCURRENCY) {
  await Promise.all(todo.slice(i, i + CONCURRENCY).map(handle));
}

console.log(`\nDone: ${ok} translated, ${failed} failed`);
