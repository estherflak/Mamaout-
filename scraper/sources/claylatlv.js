/**
 * ClaylaTLV — independent ceramics studio in Tel Aviv (שי"ר 6, corner of
 * Dizengoff 187) that runs occasional "Mommy & Me" workshops for moms on
 * maternity leave, alongside unrelated programming (sip & paint nights,
 * movie nights, generic pottery workshops).
 *
 * Platform: Wix Stores. Every event is a "product" at
 *   https://www.claylatlv.com/product-page/{slug}
 * The events category page (`/אירועים`) server-renders links to every
 * current product — no JS needed, confirmed via plain fetch.
 *
 * Each product page has no separate structured date/time/venue fields —
 * Wix's template dumps everything (name, description, "מתי?" date/time,
 * "איפה?" venue/address, "מחיר:" price) into a single unbroken Hebrew blob
 * inside the `og:description` meta tag. We regex that blob for date/time;
 * price comes from the cleaner `product:price:amount` meta tag; venue/
 * address are hardcoded since this is a single-location studio and parsing
 * them out of the same run-on blob is fragile for no benefit.
 *
 * IMPORTANT: this feeds the Vercel cron pipeline directly (no Claude
 * relevance gate) — the keyword filter below is the only thing standing
 * between "Mommy & Me" and this studio's much larger non-baby catalog.
 */

const BASE = 'https://www.claylatlv.com';
// /אירועים (Events), pre-encoded so plain fetch() doesn't need extra escaping.
const EVENTS_PATH = '/%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D';

const VENUE = 'ClaylaTLV קליילה';
const ADDRESS = 'שי"ר 6, פינת דיזינגוף 187, תל אביב';

// STRONG only — this source has no WEAK/age-qualifier tier because the
// studio's non-baby events (sip & paint, movie nights, generic workshops)
// never carry any of these words, so there's no ambiguous middle ground
// to gate with an age check the way smartticket.js needs to.
const STRONG_PATTERNS = [
  /mommy\s*&?\s*me/i,
  /תינוק/,          // baby / babies
  /בייבי/,          // "baby" transliterated
  /baby/i,
  /טביעת (כף )?רגל/, // footprint keepsake — this studio's signature baby event
  /חופשת לידה/,      // maternity leave
  /לידה/,           // birth / postpartum
];

function isBabyRelevant(name, description) {
  const text = `${name} ${description}`;
  return STRONG_PATTERNS.some(re => re.test(text));
}

function decodeEntities(s = '') {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// Handles both meta tag attribute orders Wix emits
// (<meta property="x" content="y"> and <meta content="y" property="x">).
function extractMeta(html, prop) {
  const escaped = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let m = html.match(new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'));
  if (!m) m = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["']`, 'i'));
  return m ? decodeEntities(m[1]) : null;
}

// The "מתי?" block is "DD.MM" or "DD.MM.YY" run directly into whatever
// follows (a time, or another Hebrew label) with no separator, e.g.
//   "מתי?07.07.2610:00-12:00"   → day 07, month 07, year 26, time 10:00-12:00
//   "מתי?16.0619:00- התכנסות…"  → day 16, month 06, NO year, time 19:00
// The year group only matches when a literal "." precedes it, so a time
// like "19:00" right after "16.06" is never mistaken for a year.
function parseDate(description) {
  const m = description.match(/מתי\?(\d{1,2})\.(\d{1,2})(?:\.(\d{2}))?/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const now = new Date();
  const year = m[3] ? 2000 + parseInt(m[3], 10) : now.getFullYear();
  let date = new Date(Date.UTC(year, month - 1, day));
  // No explicit year and the month/day has already passed this year →
  // it must be next year's occurrence.
  if (!m[3] && date < new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))) {
    date = new Date(Date.UTC(year + 1, month - 1, day));
  }
  return date.toISOString().slice(0, 10);
}

function parseTimeRange(description) {
  const range = description.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (range) return { start: range[1], end: range[2] };
  const single = description.match(/(\d{1,2}:\d{2})/);
  return { start: single?.[1] ?? null, end: null };
}

async function fetchProduct(slug) {
  const url = `${BASE}/product-page/${encodeURI(slug)}`;
  let html;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MamaOutBot/1.0)' } });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  const availability = extractMeta(html, 'og:availability');
  if (availability === 'OutOfStock') return null; // sold out — don't surface

  const rawTitle = extractMeta(html, 'og:title') || '';
  const name = rawTitle.replace(/\s*\|\s*ClaylaTLV.*$/i, '').trim();
  const description = extractMeta(html, 'og:description') || '';
  const priceStr = extractMeta(html, 'product:price:amount');
  const price = priceStr ? parseFloat(priceStr) : null;

  if (!name || !isBabyRelevant(name, description)) return null;

  const event_date = parseDate(description);
  const { start, end } = parseTimeRange(description);

  return {
    name,
    location: 'Tel Aviv',
    venue: VENUE,
    address: ADDRESS,
    neighborhood: 'Tel Aviv',
    next_dates: event_date ? [event_date] : [],
    time_start: start,
    time_end: end,
    schedule_type: 'one-time',
    schedule_label: null,
    price,
    price_notes: null,
    stroller_accessible: null,
    baby_age_min: 0,
    baby_age_max: null,
    category: 'creative',
    source_name: 'ClaylaTLV',
    source_url: url,
    organizer_name: VENUE,
    is_verified: true,
    language: 'he',
  };
}

async function fetchProductSlugs() {
  const res = await fetch(`${BASE}${EVENTS_PATH}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MamaOutBot/1.0)' },
  });
  const html = await res.text();
  const slugs = new Set();
  for (const m of html.matchAll(/\/product-page\/([^"'?#\s]+)/g)) {
    try {
      slugs.add(decodeURIComponent(m[1]));
    } catch {
      slugs.add(m[1]);
    }
  }
  return [...slugs];
}

export async function scrapeClaylaTLV() {
  console.log('[claylatlv] fetching events page…');
  const slugs = await fetchProductSlugs();
  console.log(`[claylatlv] ${slugs.length} product pages found`);

  const results = [];
  const BATCH = 5;
  for (let i = 0; i < slugs.length; i += BATCH) {
    const batch = slugs.slice(i, i + BATCH);
    const settled = await Promise.all(batch.map(slug => fetchProduct(slug).catch(() => null)));
    results.push(...settled.filter(Boolean));
    if (i + BATCH < slugs.length) await new Promise(r => setTimeout(r, 200));
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = results.filter(r => !r.next_dates.length || r.next_dates[0] >= today);

  console.log(`[claylatlv] ${upcoming.length} upcoming baby-relevant events`);
  return upcoming;
}
