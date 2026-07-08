/**
 * SmartTicket venues — baby/postpartum events via the Smarticket calendar API.
 *
 * Smarticket is the ticketing platform used by many Israeli community centers
 * (מתנ"סים) and municipal culture departments. Every tenant exposes the same
 * unauthenticated calendar API at
 *   https://{tenant}.smarticket.co.il/api/show_theater/get_events_calendar
 * so ONE integration covers every venue; a venue is configured by its tenant
 * subdomain plus display metadata.
 *
 * Generalized from the original beit-emanuel-rg.js single-venue source — the
 * mbe-rg source_urls are unchanged, so existing DB rows keep refreshing.
 *
 * IMPORTANT: this source feeds the Vercel cron pipeline, which inserts rows
 * WITHOUT the Claude relevance gate — the keyword filter below is the only
 * quality barrier, so it is deliberately strict (see isBabyRelevant).
 */

import { ageRangeFromName, isOutOfScopeForBabies } from './hebrew-ages.js';

const TENANTS = [
  {
    tenant: 'mbe-rg',
    sourceName: 'Beit Emanuel Ramat Gan',
    city: 'Ramat Gan',
    organizer: 'בית עמנואל רמת גן',
    // The Ra'agim gymboree's own open-play sessions, promo pages, and services
    // are a PLACE (see the places table), not activities — only the distinct
    // classes and workshops hosted there belong in the activities feed.
    exclude: [
      /משחקיי?ה התפתחותית/,  // "developmental playroom" open-play sessions
      /יעוץ פרטני/,           // private consultation service page
      /^גילאי לידה עד שנה$/,  // bare age-category page
    ],
  },
  {
    tenant: 'ramathasharon',
    sourceName: 'Ramat Hasharon Municipality',
    city: 'Ramat Hasharon',
    organizer: 'עיריית רמת השרון',
  },
  {
    tenant: 'makefet',
    sourceName: 'Makefet Petah Tikva',
    city: 'Petah Tikva',
    organizer: 'מקפת - מרכזים קהילתיים פתח תקווה',
  },
  {
    tenant: 'herzliya',
    sourceName: 'Herzliya Municipality',
    city: 'Herzliya',
    organizer: 'עיריית הרצליה - תנו״ס',
  },
];

// ─── Relevance filter ────────────────────────────────────────────────────────
// Two tiers. STRONG keywords are baby-specific and pass on their own (the age
// guard still drops toddler-only classes). WEAK keywords (parents, moms…) show
// up on teen workshops and adult lectures at municipal tenants, so they pass
// only when the title also carries a parseable age signal.
//
// Milestone words like עמידה/הליכה are intentionally NOT listed: standalone
// they are ambiguous ("הליכה נורדית" is a seniors' class), but as part of a
// range ("לידה עד עמידה") the age parser reads them, so relevant classes come
// through the WEAK path or another STRONG keyword.

const STRONG_PATTERNS = [
  /תינוק/,   // baby (matches תינוקות too)
  /בייבי/,   // "baby" transliterated
  /קטנט/,    // tiny ones — no final ן so קטנטנים/קטנטנות (regular נ) match too
  /זחיל/,    // crawling (זחילה)
  // birth/postpartum. Left boundary + optional single-letter Hebrew prefix
  // (מלידה "from birth", בלידה, הלידה…) so גלידה (ice cream) can't match.
  /(?:^|[^א-ת])[מבלהוכש]?לידה/,
  /עיסוי/,   // massage
  /התפתחות/, // development
  /משחקיה/,  // playroom
  /הנקה/,    // breastfeeding — prefixed forms (בהנקה, להנקה…) are all still on-topic
  // starting solids. Plural only ("מעבר למוצקים", "ביסוס מוצקים") — the bare
  // stem מוצק would also match kids' states-of-matter workshops ("מוצק, נוזל וגז").
  /מוצקים/,
];

// WEAK words appear on teen/adult/toddler events too. גיל הרך lives here
// because municipal tenants embed it in venue and department names
// ("מרכז לגיל הרך", "האגף לחינוך הגיל הרך") on kindergarten-prep and
// diaper-weaning workshops.
const WEAK_PATTERNS = [
  /אמא/, /אמהות/, /אימהות/,
  /הורים/,
  /פעוט/,
  /מגע/,
  /גיל הרך/,
  /לגיל/,   // "לגילאי 4 חודשים…" — the age-signal requirement does the real work
];

function isBabyRelevant(name, cfg) {
  if (!name) return false;
  if ((cfg.exclude ?? []).some(re => re.test(name))) return false;
  // Toddler-only classes (start at 1y+) and birthday promos are out of scope
  // for a 0–12-month app even though they keyword-match.
  if (isOutOfScopeForBabies(name)) return false;

  if (STRONG_PATTERNS.some(re => re.test(name))) return true;

  if (WEAK_PATTERNS.some(re => re.test(name))) {
    // WEAK words need a real age signal ("3-6 חודשים", "לידה עד עמידה"…) —
    // otherwise "סדנה להורים" style adult/teen events slip through.
    const { min, max } = ageRangeFromName(name);
    return min > 0 || max !== null;
  }

  return false;
}

function mapCategory(name = '') {
  if (name.includes('יוגה') || name.includes('פילאטיס') || name.includes('ריקוד') || name.includes('תנועה') || name.includes('כושר')) return 'movement';
  if (name.includes('עיסוי') || name.includes('מגע')) return 'wellness';
  if (name.includes('סדנ') || name.includes('התפתחות') || name.includes('מרפאה')) return 'wellness';
  if (name.includes('שירה') || name.includes('מוזיקה') || name.includes('מוסיקה')) return 'wellness';
  if (name.includes('יצירה') || name.includes('אמנות')) return 'creative';
  return 'baby-focused';
}

// ─── Address enrichment ──────────────────────────────────────────────────────

async function fetchShowAddress(baseUrl, eventId) {
  try {
    const res  = await fetch(`${baseUrl}/event/${eventId}`, {
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
async function buildAddressCache(baseUrl, babyEvents) {
  const seen = new Map(); // name → representative event id
  for (const e of babyEvents) {
    if (!seen.has(e.name)) seen.set(e.name, e.id);
  }

  const entries = [...seen.entries()]; // [[name, id], ...]
  const cache   = {};
  const BATCH   = 5;

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch   = entries.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(([, id]) => fetchShowAddress(baseUrl, id)));
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

function mapToMamaOut({ rep, dates }, cfg, baseUrl, addressCache) {
  const price  = rep.website_pricelist?.[0]?.price ?? null;
  const isFree = price === 0;
  const addr   = addressCache[rep.name];
  const time   = rep.start_time ? rep.start_time.slice(0, 5) : null;

  return {
    name:          rep.name,
    location:      cfg.city,
    venue:         addr?.venue   || null,
    address:       addr?.address || null,
    neighborhood:  cfg.city,
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
    source_name:   cfg.sourceName,
    source_url:    `${baseUrl}/event/${rep.id}`,
    organizer_name: cfg.organizer,
    is_verified:   true,
    language:      'he',
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

async function scrapeTenant(cfg) {
  const baseUrl = `https://${cfg.tenant}.smarticket.co.il`;
  const today = new Date();
  const start = today.toISOString().split('T')[0];
  const end   = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const url   = `${baseUrl}/api/show_theater/get_events_calendar?start=${start}&end=${end}`;

  console.log(`[smartticket:${cfg.tenant}] fetching ${start} → ${end}`);

  let allEvents;
  try {
    const res  = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    // Smarticket (PHP) serializes `result` as an array OR as an object keyed
    // by numeric index ({"0": {...}}) depending on internal filtering — both
    // shapes occur in the wild for the same tenant.
    const raw  = data.result ?? [];
    allEvents  = Array.isArray(raw) ? raw : Object.values(raw);
  } catch (err) {
    console.error(`[smartticket:${cfg.tenant}] calendar fetch failed: ${err.message}`);
    return [];
  }

  const babyEvents = allEvents.filter(e =>
    e.website_available === 1 &&
    e.start_date >= start &&
    isBabyRelevant(e.name, cfg)
  );

  console.log(`[smartticket:${cfg.tenant}] ${allEvents.length} events → ${babyEvents.length} baby-relevant`);

  const addressCache = await buildAddressCache(baseUrl, babyEvents);
  const grouped = groupSessions(babyEvents);
  const results = grouped.map(g => mapToMamaOut(g, cfg, baseUrl, addressCache));
  console.log(`[smartticket:${cfg.tenant}] grouped into ${results.length} classes`);
  return results;
}

export async function scrapeSmartTicket() {
  const all = [];
  for (const cfg of TENANTS) {
    try {
      all.push(...await scrapeTenant(cfg));
    } catch (err) {
      console.error(`[smartticket:${cfg.tenant}] failed: ${err.message}`);
    }
  }
  console.log(`[smartticket] total: ${all.length} classes across ${TENANTS.length} tenant(s)`);
  return all;
}
