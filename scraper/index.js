/**
 * MamaOut scraper — run directly for a one-off scrape:
 *   node scraper/index.js
 */
import 'dotenv/config';
import { scrapeBeitEmanuel } from './sources/beit-emanuel.js';
import { scrapeDigitaf } from './sources/digitaf.js';
import { scrapeGoogle } from './sources/google.js';
import { scrapeEventbrite } from './sources/eventbrite.js';
import { scrapeTimeout } from './sources/timeout.js';
import { scrapeGoOut } from './sources/goout.js';
import { classifyActivity } from './classifier.js';
import { insertIfNew } from './db.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

  // Priority sources run first — authoritative, is_verified: true
  const prioritySources = [
    { name: 'Beit Emanuel Ramat Gan', fn: scrapeBeitEmanuel, verified: true },
    { name: 'Tel Aviv Municipality (Digitaf)', fn: scrapeDigitaf, verified: true },
  ];

  // Supplementary sources
  const supplementarySources = [
    { name: 'DuckDuckGo/Google', fn: scrapeGoogle, verified: false },
    { name: 'Eventbrite',        fn: scrapeEventbrite, verified: false },
    { name: 'Time Out Tel Aviv', fn: scrapeTimeout, verified: false },
    { name: 'GoOut',             fn: scrapeGoOut, verified: false },
  ];

  let allRaw = [];

  for (const { name, fn, verified } of [...prioritySources, ...supplementarySources]) {
    console.log(`[scraper] Scraping ${name}…`);
    try {
      const results = await fn();
      // Tag each result with its verified status
      const tagged = results.map(r => ({ ...r, _verified: verified }));
      console.log(`[scraper]   → ${tagged.length} raw results`);
      allRaw.push(...tagged);
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
        name:            classified.name,
        name_en:         classified.name_en || null,
        description:     classified.description,
        description_en:  classified.description_en || null,
        location:        raw.location,
        venue:           classified.venue || raw.venue || null,
        category:        classified.category,
        price_range:     classified.price_range,
        baby_age_min:    classified.baby_age_min ?? null,
        event_date:      classified.event_date || null,
        language:        classified.language || 'he',
        source_url:      raw.source_url,
        source_name:     raw.source_name,
        is_verified:     raw._verified ?? false,
      };

      const row = await insertIfNew(activity);
      if (row) {
        inserted++;
        const label = raw._verified ? '✓' : '+';
        console.log(`[scraper]   ${label} "${activity.name_en || activity.name}" (${activity.category})`);
      } else {
        skipped++;
      }

      await sleep(300);
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

if (process.argv[1]?.endsWith('scraper/index.js')) {
  runScrape().catch(err => {
    console.error('[scraper] Fatal error:', err);
    process.exit(1);
  });
}
