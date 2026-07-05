/**
 * Arbox studios — mom & baby classes via Arbox's public booking API.
 *
 * Arbox is the dominant Israeli boutique-studio booking platform. Its
 * white-label widget (`https://{sub}.web.arboxapp.com/group?...`) is backed by
 * an unauthenticated public schedule API, so ONE integration covers every
 * Arbox venue. A venue is configured by a single string: its subdomain.
 *
 *   1. GET  site/box/{subdomain}            → box id + locations
 *   2. POST site/schedule/betweenDates      → sessions (headers: boxFk, identifier=subdomain)
 *
 * We keep only baby/postnatal class categories, collapse each recurring class
 * (same series_fk) into one row with every upcoming date in `next_dates`.
 */

import { ageRangeFromName, isOutOfScopeForBabies } from './hebrew-ages.js';

const API = 'https://apiappv2.arboxapp.com/api/v2';
const WINDOW_DAYS = 56;        // total look-ahead
const CHUNK_DAYS = 14;         // per-request range (larger windows 504 on the API)

// Venues to scrape. `whitelabel` is optional — only used to build the booking
// deep-link URL, not required by the API.
const VENUES = [
  { subdomain: 'prana', name: 'Prana Yoga', whitelabel: 'FranaYogaPilates' },
  // Discovered 2026-07-05 via booking link on iampilates.co.il — subdomains are
  // often opaque ids like this, so discovery goes through studio sites, not
  // guessing. Postpartum reformer + strength classes in Givatayim (2 locations).
  { subdomain: 'MAx8cAGU1616934318', name: 'I.AM Pilates', whitelabel: 'Arbox' },
];

// A class category is baby-relevant if its (Hebrew) name signals infants /
// postpartum. Covers common spellings incl. תניקות (a frequent typo of תינוקות)
// and א.לידה (an abbreviation of אחרי לידה seen on schedule-grid labels).
const BABY_CATEGORY = /תינוק|תניק|בייבי|baby|babies|אמהות\s*\+|postnatal|postpartum|אחרי\s*לידה|לאחר\s*לידה|א\.\s*לידה|מצנן|דולה/i;

function isBabyCategory(name = '') {
  return BABY_CATEGORY.test(name);
}

function mapCategory(name = '') {
  if (/יוגה|פילאטיס|פ\.\s*מכ|מכשירים|כוח|תנועה|ריקוד|מחול|barre|בר|ספורט|אימון/i.test(name)) return 'movement';
  if (/עיסוי|מגע|רצפת האגן|שיקום/i.test(name)) return 'wellness';
  if (/סדנ|הרצא|התפתחות/i.test(name)) return 'wellness';
  return 'baby-focused';
}

// Resolve a city (matching the app's existing city strings) from a location.
function cityFromLocation(loc, boxCity) {
  const t = `${loc?.location || ''} ${loc?.address || ''}`;
  if (/גבעתיים|givat/i.test(t)) return 'Givatayim';
  if (/רמת.?גן|ramat.?gan/i.test(t)) return 'Ramat Gan';
  if (/תל.?אביב|tel.?aviv/i.test(t)) return 'Tel Aviv';
  if (/הרצליה|herzl/i.test(t)) return 'Herzliya';
  if (/פתח.?תקו|petah/i.test(t)) return 'Petah Tikva';
  if (/גבעת.?שמואל/i.test(t)) return 'Givat Shmuel';
  return boxCity || 'Tel Aviv';
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function resolveBox(subdomain) {
  const data = await fetchJson(`${API}/site/box/${subdomain}`, {
    headers: { 'Accept': 'application/json', lang: 'he' },
  });
  return data.data ?? data; // endpoint returns the box object directly
}

const fmtDate = d => d.toISOString().split('T')[0];

async function fetchScheduleChunk(boxId, subdomain, from, to) {
  const data = await fetchJson(`${API}/site/schedule/betweenDates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      boxFk: String(boxId),
      identifier: subdomain,
    },
    body: JSON.stringify({ from, to }),
  });
  return data.data ?? [];
}

// The API 504s on wide ranges, so walk the look-ahead in CHUNK_DAYS windows and
// merge, deduping sessions by id.
async function fetchSchedule(boxId, subdomain, start) {
  const byId = new Map();
  for (let offset = 0; offset < WINDOW_DAYS; offset += CHUNK_DAYS) {
    const from = fmtDate(new Date(start.getTime() + offset * 86400000));
    const to = fmtDate(new Date(start.getTime() + Math.min(offset + CHUNK_DAYS, WINDOW_DAYS) * 86400000));
    const chunk = await fetchScheduleChunk(boxId, subdomain, from, to);
    for (const s of chunk) byId.set(s.id, s);
  }
  return [...byId.values()];
}

// Collapse recurring sessions: one class (series_fk) at one location → one row.
function groupSessions(sessions) {
  const groups = new Map(); // `${series_fk}|${locationId}` → sessions
  for (const s of sessions) {
    const key = `${s.series_fk ?? s.id}|${s.locations_box_fk ?? ''}`;
    (groups.get(key) ?? groups.set(key, []).get(key)).push(s);
  }
  return [...groups.values()].map(group => {
    const sorted = group.slice().sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    const rep = sorted[0]; // earliest upcoming = canonical / bookable
    const dates = [...new Set(sorted.map(s => s.date).filter(Boolean))].sort();
    return { rep, dates };
  });
}

function bookingUrl(venue, rep) {
  const locId = rep.locations_box_fk ?? rep.locations_box?.id;
  const wl = venue.whitelabel ? `&whitelabel=${encodeURIComponent(venue.whitelabel)}` : '';
  const series = rep.series_fk ?? rep.id;
  return `https://${venue.subdomain}.web.arboxapp.com/group/${series}?lang=he${locId ? `&location=${locId}` : ''}${wl}`;
}

function mapToMamaOut({ rep, dates }, venue, boxCity) {
  const cat = (rep.box_categories?.name || '').replace(/\s*\*+\s*$/, '').trim();
  const age = ageRangeFromName(cat);
  const loc = rep.locations_box || {};
  const city = cityFromLocation(loc, boxCity);
  const coach = rep.coach
    ? `${rep.coach.first_name || ''} ${rep.coach.last_name || ''}`.trim()
    : null;
  const time = rep.time ? rep.time.slice(0, 5) : null;
  const price = rep.box_categories?.price ?? null;

  return {
    name:          cat || rep.name || 'שיעור',
    description:   coach ? `מדריכה: ${coach}` : '',
    location:      city,
    venue:         venue.name,
    // loc.address is often just a city label (Arbox default), not a street —
    // keep it only when it looks like a real address, else let geocoding use venue+city.
    address:       loc.address && /\d/.test(loc.address) ? loc.address : null,
    neighborhood:  city,
    next_dates:    dates,
    time_start:    time,
    time_end:      rep.end_time ? rep.end_time.slice(0, 5) : null,
    schedule_type: dates.length > 1 ? 'recurring' : 'one-time',
    schedule_label: dates.length > 1
      ? `${dates.length} upcoming sessions${time ? ` · ${time}` : ''}`
      : null,
    price:         typeof price === 'number' ? price : null,
    price_notes:   'Registration required',
    stroller_accessible: null,
    // Most Arbox categories carry no age ("יוגה עם תינוקות") — the parser
    // then returns {0, null}, i.e. "babies welcome, upper bound unknown",
    // which matches how the other sources encode it.
    baby_age_min:  age.min,
    baby_age_max:  age.max,
    category:      mapCategory(cat),
    source_name:   venue.name,
    source_url:    bookingUrl(venue, rep),
    organizer_name: rep.box?.name || venue.name,
    is_verified:   true,
    language:      'he',
  };
}

async function scrapeVenue(venue) {
  const today = new Date();
  const from = fmtDate(today);

  let box;
  try {
    box = await resolveBox(venue.subdomain);
  } catch (err) {
    console.error(`[arbox] ${venue.subdomain}: box resolve failed — ${err.message}`);
    return [];
  }

  let sessions;
  try {
    sessions = await fetchSchedule(box.id, venue.subdomain, today);
  } catch (err) {
    console.error(`[arbox] ${venue.subdomain}: schedule fetch failed — ${err.message}`);
    return [];
  }

  const upcoming = sessions.filter(s => s.date >= from);
  // Baby-signal match, minus categories whose own name says 1y+ ("בייבי דאנס
  // לגילאי שנה-שנתיים") — same out-of-scope rule the SmartTicket source uses.
  const baby = upcoming.filter(s =>
    isBabyCategory(s.box_categories?.name) &&
    !isOutOfScopeForBabies(s.box_categories?.name ?? ''));
  console.log(`[arbox] ${venue.name}: ${upcoming.length} sessions → ${baby.length} baby-relevant`);

  const grouped = groupSessions(baby);
  const rows = grouped
    .map(g => mapToMamaOut(g, venue, box.city))
    .filter(r => r.source_url && r.next_dates.length);
  console.log(`[arbox] ${venue.name}: grouped into ${rows.length} classes`);
  return rows;
}

export async function scrapeArbox() {
  const all = [];
  for (const venue of VENUES) {
    const rows = await scrapeVenue(venue);
    all.push(...rows);
  }
  console.log(`[arbox] total: ${all.length} classes across ${VENUES.length} venue(s)`);
  return all;
}
