/**
 * Makore — Israeli activities & classes marketplace (makore.co.il).
 *
 * ⚠️ PARKED: this scraper works from residential IPs but Makore is behind
 * Cloudflare, which 403s datacenter IPs (incl. GitHub Actions runners), so it
 * is not wired into the pipeline. Re-enable by routing requests through a
 * residential proxy / Web Unlocker, then re-add it to scraper/index.js.
 *
 * Makore is an app-router Next.js site, so the old __NEXT_DATA__ blob is gone.
 * Instead every listing page embeds a clean JSON-LD `ItemList` of Event objects
 * with name, description, full address, city, geo-coordinates, date and the
 * event URL — far more reliable than scraping CSS.
 *
 * We query the "Gush Dan" district (גוש דן = the Tel Aviv metro: TLV, Ramat Gan,
 * Givatayim, Bnei Brak, Bat Yam, Petah Tikva…) under the kids-and-family
 * category, then keep only adjacent-metro cities with baby-relevant content.
 * Final 0–12mo relevance is decided downstream by the classifier.
 */
import axios from 'axios';

const BASE = 'https://www.makore.co.il';
// District "גוש-דן" + category "ילדים-ומשפחה", URL-encoded.
const DISTRICT_PATH =
  '/browse/district/%D7%92%D7%95%D7%A9-%D7%93%D7%9F/category/%D7%99%D7%9C%D7%93%D7%99%D7%9D-%D7%95%D7%9E%D7%A9%D7%A4%D7%97%D7%94';
const MAX_PAGES = 5;
const MAX_RESULTS = 60;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Adjacent Tel Aviv-metro cities we surface (Makore's region tag is unreliable,
// so we match on the actual city / addressLocality). Excludes far-flung places
// that also appear in the district feed (Netanya, Modiin, Rehovot, Jerusalem…).
const ADJACENT_CITIES = [
  'תל אביב', 'תל אביב-יפו', 'יפו',
  'רמת גן', 'גבעתיים', 'בני ברק',
  'בת ים', 'חולון',
  'פתח תקווה', 'גבעת שמואל', 'גני תקווה',
  'קרית אונו', 'יהוד', 'אור יהודה', 'רמת השרון', 'הרצליה',
];

// Broad baby pre-filter to avoid sending obvious non-baby items (toddler theater,
// pool parties, trivia) to the classifier. The classifier still makes the final
// 0–12mo call, so this stays deliberately inclusive.
const BABY_KEYWORDS = [
  'תינוק', 'תינוקות', 'בייבי', 'baby',
  'לידה', 'זחיל', 'זחילה', 'עמידה', 'הליכה',
  'גיל הרך', 'הורה ותינוק', 'אמא ותינוק', 'הורים ותינוק',
  'עיסוי תינוק', 'התפתחות', 'התפתחותי', 'מנשא', 'נשיאה',
  'הנקה', 'קטנטן', 'קטנטנים', 'עד שנה', 'חודשים', 'מגיל לידה',
];

function cityAllowed(city) {
  if (!city) return false;
  return ADJACENT_CITIES.some(c => city.includes(c));
}

function isBabyRelevant(text) {
  const t = (text || '').toLowerCase();
  return BABY_KEYWORDS.some(k => t.includes(k.toLowerCase()));
}

// Pull the JSON-LD ItemList of events out of a listing page's HTML.
function extractEvents(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    let data;
    try { data = JSON.parse(m[1]); } catch { continue; }
    for (const node of (Array.isArray(data) ? data : [data])) {
      if (node['@type'] !== 'ItemList') continue;
      for (const el of node.itemListElement || []) {
        const ev = el.item;
        if (ev?.['@type'] === 'Event' && ev.name) out.push(ev);
      }
    }
  }
  return out;
}

function mapEvent(ev) {
  const loc   = ev.location || {};
  const addr  = loc.address || {};
  const city  = addr.addressLocality || '';
  const geo   = loc.geo || {};
  const lat   = typeof geo.latitude  === 'number' ? geo.latitude  : null;
  const lng   = typeof geo.longitude === 'number' ? geo.longitude : null;

  return {
    name:        (ev.name || '').slice(0, 120),
    description: (ev.description || '').slice(0, 400),
    location:    city || 'גוש דן',
    venue:       (loc.name || '').slice(0, 120),  // full street address string
    source_url:  ev.url || '',
    source_name: 'Makore',
    raw_date:    ev.startDate || '',
    latitude:    lat,
    longitude:   lng,
  };
}

export async function scrapeMakore() {
  const results = [];
  const seen = new Set();

  for (let page = 1; page <= MAX_PAGES && results.length < MAX_RESULTS; page++) {
    const url = `${BASE}${DISTRICT_PATH}?pages=${page}`;
    let html;
    try {
      ({ data: html } = await axios.get(url, { headers: HEADERS, timeout: 15000 }));
    } catch (err) {
      console.warn(`[makore] page ${page} failed: ${err.message}`);
      break;
    }

    const events = extractEvents(html);
    if (events.length === 0) break; // ran past the last page

    let kept = 0;
    for (const ev of events) {
      const mapped = mapEvent(ev);
      if (!mapped.source_url || seen.has(mapped.source_url)) continue;
      const city = ev.location?.address?.addressLocality;
      if (!cityAllowed(city)) continue;
      if (!isBabyRelevant(`${mapped.name} ${mapped.description}`)) continue;
      seen.add(mapped.source_url);
      results.push(mapped);
      kept++;
      if (results.length >= MAX_RESULTS) break;
    }
    console.log(`[makore] page ${page}: ${events.length} events → ${kept} adjacent-city baby items`);

    await sleep(1500);
  }

  console.log(`[makore] ${results.length} results`);
  return results;
}
