/**
 * Beit Emanuel Ramat Gan — baby/toddler events via Smarticket calendar API.
 * Fetches a rolling 60-day window and keyword-filters for baby relevance.
 */

const BASE_URL   = 'https://mbe-rg.smarticket.co.il';
const SOURCE_NAME = 'Beit Emanuel Ramat Gan';

const BABY_KEYWORDS = [
  'תינוק', 'תינוקות',
  'גיל הרך',
  'הורים',
  'אמא', 'אמהות',
  'פעוט', 'פעוטות',
  'זחיל', 'זחילה',
  'עמידה',
  'הליכה',
  'לידה',
  'לגיל',
  'גיל שנה',
  'מגע',
  'התפתחות',
  'משחקיה',
  'קטנטן', 'קטנטנים',
];

function isBabyRelevant(name) {
  return BABY_KEYWORDS.some(k => name?.includes(k));
}

function mapCategory(name = '') {
  if (name.includes('יוגה') || name.includes('פילאטיס') || name.includes('ריקוד') || name.includes('תנועה')) return 'movement';
  if (name.includes('עיסוי') || name.includes('מגע')) return 'wellness';
  if (name.includes('סדנ') || name.includes('התפתחות') || name.includes('מרפאה')) return 'wellness';
  if (name.includes('שירה') || name.includes('מוזיקה') || name.includes('מוסיקה')) return 'wellness';
  if (name.includes('יצירה') || name.includes('אמנות')) return 'creative';
  return 'baby-focused';
}

// ─── Address enrichment ──────────────────────────────────────────────────────

async function fetchShowAddress(eventId) {
  try {
    const res  = await fetch(`${BASE_URL}/event/${eventId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MamaOutBot/1.0)' },
    });
    const html = await res.text();
    const match = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return null;
    const schema = JSON.parse(match[1]);
    return {
      venue:   schema.location?.name?.replace(/\.\s*$/, '').trim() || null,
      address: schema.location?.address?.streetAddress
            || schema.location?.streetAddress
            || null,
    };
  } catch { return null; }
}

// One fetch per unique show name; 5 concurrent, 100ms between batches.
async function buildAddressCache(babyEvents) {
  const seen    = new Map(); // name → representative event id
  for (const e of babyEvents) {
    if (!seen.has(e.name)) seen.set(e.name, e.id);
  }

  const entries = [...seen.entries()]; // [[name, id], ...]
  const cache   = {};
  const BATCH   = 5;

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch   = entries.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(([, id]) => fetchShowAddress(id)));
    batch.forEach(([name], j) => { cache[name] = results[j]; });
    if (i + BATCH < entries.length) await new Promise(r => setTimeout(r, 100));
  }

  return cache;
}

// ─── Field mapping ───────────────────────────────────────────────────────────

function mapToMamaOut(event, addressCache) {
  const price  = event.website_pricelist?.[0]?.price ?? null;
  const isFree = price === 0;
  const addr   = addressCache[event.name];

  return {
    name:          event.name,
    location:      'Ramat Gan',
    venue:         addr?.venue   || null,
    address:       addr?.address || null,
    neighborhood:  'Ramat Gan',
    next_dates:    [event.start_date],
    time_start:    event.start_time  || null,
    time_end:      event.end_time    || null,
    price:         price,
    price_notes:   isFree ? 'Free (registration required)' : null,
    stroller_accessible: null,
    baby_age_min:  0,
    baby_age_max:  156,
    category:      mapCategory(event.name),
    source_name:   SOURCE_NAME,
    source_url:    `${BASE_URL}/event/${event.id}`,
    organizer_name: 'בית עמנואל רמת גן',
    is_verified:   true,
    language:      'he',
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function scrapeBeitEmanuelRG() {
  const today = new Date();
  const start = today.toISOString().split('T')[0];
  const end   = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const url   = `${BASE_URL}/api/show_theater/get_events_calendar?start=${start}&end=${end}`;

  console.log(`[beit-emanuel-rg] fetching ${start} → ${end}`);

  let allEvents;
  try {
    const res  = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    allEvents  = data.result ?? [];
  } catch (err) {
    console.error(`[beit-emanuel-rg] calendar fetch failed: ${err.message}`);
    return [];
  }

  console.log(`[beit-emanuel-rg] total events in window: ${allEvents.length}`);

  const babyEvents = allEvents.filter(e =>
    e.website_available === 1 &&
    e.start_date >= start &&
    isBabyRelevant(e.name)
  );

  console.log(`[beit-emanuel-rg] baby-relevant: ${babyEvents.length}`);

  const uniqueShows = new Set(babyEvents.map(e => e.name)).size;
  console.log(`[beit-emanuel-rg] fetching addresses for ${uniqueShows} unique shows...`);
  const addressCache = await buildAddressCache(babyEvents);
  const hit = Object.values(addressCache).filter(Boolean).length;
  console.log(`[beit-emanuel-rg] address cache: ${hit}/${uniqueShows} resolved`);

  const results = babyEvents.map(e => mapToMamaOut(e, addressCache));
  console.log(`[beit-emanuel-rg] mapped ${results.length} events`);
  return results;
}
