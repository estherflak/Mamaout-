/**
 * MamaOut scraper — run directly for a one-off scrape:
 *   node scraper/index.js
 */
import 'dotenv/config';
import { scrapeBeitEmanuel } from './sources/beit-emanuel.js';
import { scrapeDigitaf } from './sources/digitaf.js';
import { scrapeRamatGanMuni } from './sources/ramat-gan-muni.js';
import { scrapeMommyJogger } from './sources/mommy-jogger.js';
import { classifyActivity } from './classifier.js';
import { geocodeActivity } from './sources/geocode.js';
import { insertIfNew, getExistingSourceUrls } from './db.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function looksLikeDate(text) {
  if (!text || text.trim().length < 4) return true;
  const t = text.trim();
  // Pure numbers / date separators
  if (/^[\d\s.\/\-,]+$/.test(t)) return true;
  // DD.MM.YYYY or DD/MM/YYYY
  if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(t)) return true;
  // ISO date
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return true;
  // Hebrew month names with numbers
  if (/\d.*(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר)/.test(t)) return true;
  return false;
}

function dedupeRaw(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item.source_url || seen.has(item.source_url)) return false;
    seen.add(item.source_url);
    return true;
  });
}

// ── Keyword pre-filter ─────────────────────────────────────────────────────
// Runs BEFORE classifyActivity() to avoid wasting Claude API calls on
// clearly irrelevant results (bar events, adult theater, kids 3+, etc.)

const HARD_INCLUDE = [
  'חופשת לידה', 'אמהות עם תינוקות', 'קטנטנים', 'לאחר לידה',
  'התפתחות תינוקות', 'עיסוי תינוקות', 'מעגל אמהות', 'מפגש אמהות',
  'שיקום לאחר לידה', 'רצפת האגן', 'postpartum', 'postnatal',
  'mom and baby', 'maternity leave', 'baby massage', 'newborn class',
  'dance baby', 'דאנס בייבי', 'ביכורי תינוקות',
];

const SOFT_INCLUDE = [
  'תינוק', 'תינוקות', 'בייבי', 'ביבי', 'baby', 'infant',
  'אמא ותינוק', 'הורים ותינוקות', 'פעוט',
];

const AGE_QUALIFIERS = [
  'חודשים', 'שבועות', 'עד גיל שנה', 'עד שנה', '0-12', '0-18',
  'מלידה', 'מגיל לידה', 'לידה עד', 'גיל לידה',
];

const HARD_EXCLUDE = [
  'מגיל 3', 'מגיל 4', 'מגיל 5', 'מגיל שלוש', 'מגיל ארבע',
  'בית ספר', 'בר מצווה', 'בת מצווה', 'חתונה', 'מבוגרים בלבד', '18+',
  'סטנדאפ', 'stand-up', 'standup',
];

function passesKeywordFilter(raw) {
  const text = [raw.name, raw.description, raw.venue]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Verified sources bypass keyword filtering entirely — trust the source
  if (raw._verified) return true;

  // Kill immediately on hard exclusion
  if (HARD_EXCLUDE.some(kw => text.includes(kw.toLowerCase()))) return false;

  // Pass immediately on hard inclusion
  if (HARD_INCLUDE.some(kw => text.includes(kw.toLowerCase()))) return true;

  // Soft inclusion only passes if accompanied by an age qualifier
  const hasSoft = SOFT_INCLUDE.some(kw => text.includes(kw.toLowerCase()));
  const hasAge  = AGE_QUALIFIERS.some(kw => text.includes(kw.toLowerCase()));
  if (hasSoft && hasAge) return true;

  // Soft inclusion alone: still send to Claude (it might have baby context
  // in the URL or other fields the text check misses)
  return hasSoft;
}

export async function runScrape() {
  console.log(`\n[scraper] Starting scrape — ${new Date().toISOString()}`);

  // Priority sources run first — authoritative, is_verified: true
  const prioritySources = [
    { name: 'Beit Emanuel Ramat Gan',          fn: scrapeBeitEmanuel,   verified: true },
    { name: 'Tel Aviv Municipality (Digitaf)', fn: scrapeDigitaf,        verified: true },
    { name: 'Ramat Gan Municipality',          fn: scrapeRamatGanMuni,  verified: true },
    { name: 'Mommy Jogger',                    fn: scrapeMommyJogger,   verified: true },
  ];

  // Supplementary aggregator sources were dropped after a quality audit:
  // Eventbrite/Time Out/Secret TLV/iShow carried no baby-0–12mo content, and
  // Makore (good content) is Cloudflare-blocked from CI IPs — its scraper is
  // kept in sources/makore.js, parked until routed through a residential proxy.
  // The focus is now direct, high-relevance sources instead.
  const supplementarySources = [];

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
  // Pull the source_urls we already have so we never pay Claude to re-classify
  // a row that's already in the DB. Recurring classes (verified weekly sessions)
  // dominate the scrape, so this is the difference between classifying ~200
  // items every run and classifying only the genuinely new handful.
  const existingUrls = await getExistingSourceUrls();
  console.log(`[scraper] ${existingUrls.size} source_urls already in DB — these skip Claude`);

  let inserted = 0;
  let skipped = 0;
  let refreshed = 0;
  let irrelevant = 0;
  let errors = 0;

  for (const raw of allRaw) {
    try {
      // Already stored → no AI call needed. Just refresh the volatile schedule
      // fields (insertIfNew patches next_dates/times/price for existing rows)
      // so recurring classes keep rolling forward, then move on.
      if (raw.source_url && existingUrls.has(raw.source_url)) {
        await insertIfNew(raw);
        refreshed++;
        continue;
      }

      // Skip items where the extracted "name" is clearly a date, not an activity title
      if (looksLikeDate(raw.name)) {
        irrelevant++;
        continue;
      }

      // Skip template placeholders left by scrapers on broken/empty pages
      const nameTrimmed = raw.name?.trim() ?? '';
      if (!nameTrimmed || /^\[.*\]$/.test(nameTrimmed) || nameTrimmed.length < 4) {
        irrelevant++;
        continue;
      }

      // Keyword pre-filter — skip obvious non-matches before calling Claude
      if (!passesKeywordFilter(raw)) {
        irrelevant++;
        continue;
      }

      const classified = await classifyActivity(raw);

      // Verified sources are curated baby/mom venues — we already trust them
      // enough to bypass the keyword filter, so don't let Claude's relevance
      // call drop one. Only unverified items are gated on is_relevant.
      if (!raw._verified && !classified.is_relevant) {
        irrelevant++;
        continue;
      }

      // Use precise coords from source if provided (e.g. Eventbrite API venue lat/lng);
      // otherwise geocode via Nominatim.
      let coords = null;
      if (raw.latitude && raw.longitude) {
        coords = { latitude: raw.latitude, longitude: raw.longitude };
      } else {
        const venueForGeo = classified.venue || raw.venue || '';
        coords = venueForGeo
          ? await geocodeActivity(venueForGeo, raw.location || 'Tel Aviv')
          : null;
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
        cta_label:       classified.cta_label || 'More info',
        language:        classified.language || 'he',
        latitude:        coords?.latitude ?? null,
        longitude:       coords?.longitude ?? null,
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
  console.log(`  Refreshed:  ${refreshed} (already in DB — no Claude call)`);
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
