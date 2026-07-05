/**
 * Beit Emanuel Ramat Gan — baby/toddler events via Smarticket calendar API.
 * Fetches a rolling 60-day window and keyword-filters for baby relevance.
 */

import { ageRangeFromName, isOutOfScopeForBabies } from './hebrew-ages.js';

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
  if (!name) return false;
  // Toddler-only classes (start at 1y+) and birthday promos are out of scope
  // for a 0–12-month app even though they keyword-match.
  if (isOutOfScopeForBabies(name)) return false;
  return BABY_KEYWORDS.some(k => name.includes(k));
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

// A recurring class shows up in the calendar API as one event per session
// (same name + start_time, different start_date/id). Collapse those into a
// single record so one weekly class = one DB row, not 50. The merged record
// keeps every upcoming date in `next_dates` and links to the soonest session.
function groupSessions(events) {
  const groups = new Map(); // `${name}|${start_time}` → session events
  for (const e of events) {
    const key = `${e.name}|${e.start_time || ''}`;
    (groups.get(key) ?? groups.set(key, []).get(key)).push(e);
  }

  return [...groups.values()].map(sessions => {
    const sorted = sessions
      .slice()
      .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    const rep   = sorted[0]; // earliest upcoming session = canonical / bookable link
    const dates = [...new Set(sorted.map(e => e.start_date).filter(Boolean))].sort();
    return { rep, dates };
  });
}

function mapToMamaOut({ rep, dates }, addressCache) {
  const price  = rep.website_pricelist?.[0]?.price ?? null;
  const isFree = price === 0;
  const addr   = addressCache[rep.name];
  const time   = rep.start_time ? rep.start_time.slice(0, 5) : null;

  return {
    name:          rep.name,
    location:      'Ramat Gan',
    venue:         addr?.venue   || null,
    address:       addr?.address || null,
    neighborhood:  'Ramat Gan',
    next_dates:    dates,
    time_start:    rep.start_time  || null,
    time_end:      rep.end_time    || null,
    schedule_type: dates.length > 1 ? 'recurring' : 'one-time',
    schedule_label: dates.length > 1
      ? `${dates.length} upcoming sessions${time ? ` · ${time}` : ''}`
      : null,
    price:         price,
    price_notes:   isFree ? 'Free (registration required)' : null,
    stroller_accessible: null,
    baby_age_min:  ageRangeFromName(rep.name).min,
    baby_age_max:  ageRangeFromName(rep.name).max,
    category:      mapCategory(rep.name),
    source_name:   SOURCE_NAME,
    source_url:    `${BASE_URL}/event/${rep.id}`,
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

  const grouped = groupSessions(babyEvents);
  console.log(`[beit-emanuel-rg] grouped ${babyEvents.length} sessions → ${grouped.length} classes`);
  const results = grouped.map(g => mapToMamaOut(g, addressCache));
  console.log(`[beit-emanuel-rg] mapped ${results.length} events`);
  return results;
}
