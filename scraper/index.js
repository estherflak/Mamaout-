/**
 * MamaOut scraper — run directly for a one-off scrape:
 *   node scraper/index.js
 */
import 'dotenv/config';
import { scrapeGoogle } from './sources/google.js';
import { scrapeEventbrite } from './sources/eventbrite.js';
import { scrapeTimeout } from './sources/timeout.js';
import { scrapeGoOut } from './sources/goout.js';
import { classifyActivity } from './classifier.js';
import { insertIfNew } from './db.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Deduplicate raw results by source_url within a single scrape run */
function dedupeRaw(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item.source_url || seen.has(item.source_url)) return false;
    seen.add(item.source_url);
    return true;
  });
}

export async function runScrape() {
  console.log(`\n[scraper] Starting scrape — ${new Date().toISOString()}`);

  // ── Collect raw results from all sources ──────────────────────────────────
  const sources = [
    { name: 'DuckDuckGo/Google', fn: scrapeGoogle },
    { name: 'Eventbrite',        fn: scrapeEventbrite },
    { name: 'Time Out Tel Aviv', fn: scrapeTimeout },
    { name: 'GoOut',             fn: scrapeGoOut },
  ];

  let allRaw = [];
  for (const { name, fn } of sources) {
    console.log(`[scraper] Scraping ${name}…`);
    try {
      const results = await fn();
      console.log(`[scraper]   → ${results.length} raw results`);
      allRaw.push(...results);
    } catch (err) {
      console.error(`[scraper]   ✗ ${name} failed:`, err.message);
    }
    await sleep(1000);
  }

  allRaw = dedupeRaw(allRaw);
  console.log(`[scraper] ${allRaw.length} unique raw results after in-run dedup`);

  // ── Classify with Claude and insert into Supabase ─────────────────────────
  let inserted = 0;
  let skipped = 0;
  let irrelevant = 0;
  let errors = 0;

  for (const raw of allRaw) {
    try {
      const classified = await classifyActivity(raw);

      if (!classified.is_relevant) {
        irrelevant++;
        continue;
      }

      const activity = {
        name:         classified.name,
        description:  classified.description,
        location:     raw.location,
        category:     classified.category,
        price_range:  classified.price_range,
        baby_age_min: classified.baby_age_min ?? null,
        language:     classified.language || 'he',
        source_url:   raw.source_url,
        source_name:  raw.source_name,
        is_verified:  false,
      };

      const row = await insertIfNew(activity);
      if (row) {
        inserted++;
        console.log(`[scraper]   + "${activity.name}" (${activity.category})`);
      } else {
        skipped++;
      }

      await sleep(300); // small pause to respect Supabase rate limits
    } catch (err) {
      errors++;
      console.warn(`[scraper]   ✗ "${raw.name}" — ${err.message}`);
    }
  }

  console.log(`\n[scraper] Done.`);
  console.log(`  Inserted:   ${inserted}`);
  console.log(`  Duplicates: ${skipped}`);
  console.log(`  Irrelevant: ${irrelevant}`);
  console.log(`  Errors:     ${errors}`);
}

// Allow direct execution: node scraper/index.js
if (process.argv[1].endsWith('scraper/index.js')) {
  runScrape().catch(err => {
    console.error('[scraper] Fatal error:', err);
    process.exit(1);
  });
}
