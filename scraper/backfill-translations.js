#!/usr/bin/env node
// Fill English translations (name_en / description_en) for any activity missing them.
// Runs AFTER scraping — the cron scrapers insert raw Hebrew, this translates it once.
// Idempotent: only touches rows where name_en IS NULL. Re-run any time.
//
// Uses the Anthropic Message Batches API: one async batch at 50% of the standard
// per-call price. Most batches finish in minutes; we cap the wait and bail
// gracefully (untranslated rows simply get picked up on the next run).
//
//   node scraper/backfill-translations.js          # translate all missing
//   node scraper/backfill-translations.js 50       # cap at 50 (cost control)

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import {
  TRANSLATE_MODEL,
  TRANSLATE_MAX_TOKENS,
  TRANSLATE_SYSTEM,
  buildTranslateUserMsg,
  parseTranslation,
} from './translate.js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const limit = Number(process.argv[2]) || null;
const POLL_INTERVAL_MS = 15_000;
const MAX_WAIT_MS = 18 * 60_000; // leave headroom under the CI job timeout

const { data: rows, error } = await supabase
  .from('activities')
  .select('id, name, description, language')
  .is('name_en', null)
  .order('created_at', { ascending: false });

if (error) { console.error('Failed to fetch activities:', error.message); process.exit(1); }

const todo = limit ? rows.slice(0, limit) : rows;
if (todo.length === 0) { console.log('Nothing to translate.'); process.exit(0); }
console.log(`Translating ${todo.length}${limit ? ` (of ${rows.length})` : ''} activities…`);

let ok = 0, failed = 0;

async function applyTranslation(id, name_en, description_en) {
  const { error: updateErr } = await supabase
    .from('activities')
    .update({ name_en, description_en })
    .eq('id', id);
  if (updateErr) { console.log(`  ✗ ${id} — DB error: ${updateErr.message}`); failed++; }
  else { ok++; }
}

// Already-English rows don't need a model call — just mirror the source.
const englishRows = todo.filter(a => a.language === 'en');
const toTranslate  = todo.filter(a => a.language !== 'en');

for (const a of englishRows) {
  await applyTranslation(a.id, a.name, a.description);
}

if (toTranslate.length) {
  const rowById = new Map(toTranslate.map(a => [a.id, a]));
  const requests = toTranslate.map(a => ({
    custom_id: a.id, // activity UUID — unique, ≤64 chars, valid custom_id
    params: {
      model: TRANSLATE_MODEL,
      max_tokens: TRANSLATE_MAX_TOKENS,
      system: TRANSLATE_SYSTEM,
      messages: [{ role: 'user', content: buildTranslateUserMsg(a) }],
    },
  }));

  console.log(`Submitting batch of ${requests.length} translations (50% off vs. live calls)…`);
  let batch = await client.messages.batches.create({ requests });

  const startedAt = Date.now();
  while (batch.processing_status !== 'ended') {
    if (Date.now() - startedAt > MAX_WAIT_MS) {
      console.log(`Batch ${batch.id} still ${batch.processing_status} after ${Math.round(MAX_WAIT_MS / 60000)}m — leaving remaining rows for the next run.`);
      break;
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    batch = await client.messages.batches.retrieve(batch.id);
    const c = batch.request_counts;
    console.log(`  status=${batch.processing_status} succeeded=${c.succeeded} errored=${c.errored} processing=${c.processing}`);
  }

  if (batch.processing_status === 'ended') {
    for await (const result of await client.messages.batches.results(batch.id)) {
      const a = rowById.get(result.custom_id);
      if (!a) continue;
      if (result.result.type !== 'succeeded') {
        console.log(`  ✗ ${a.name} — batch ${result.result.type}`);
        failed++;
        continue;
      }
      const text = result.result.message.content.find(b => b.type === 'text')?.text ?? '';
      const out = parseTranslation(text, a);
      await applyTranslation(a.id, out.name_en, out.description_en);
    }
  }
}

console.log(`\nDone: ${ok} translated, ${failed} failed`);
