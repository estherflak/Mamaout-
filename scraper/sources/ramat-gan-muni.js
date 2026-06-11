/**
 * Ramat Gan Municipality — kids & early-childhood events via their REST API.
 *
 * Primary endpoint:  /api/EventLobby//event-lobbies/kids-and-infants  (pre-filtered)
 * Secondary endpoint: /api/EventLobby/he/event-lobby  (all events — filter client-side)
 *
 * Deduplicates on detailsLink.url before returning.
 */

const API_BASE   = 'https://api-m.ramat-gan.muni.il';
const SITE_BASE  = 'https://www.ramat-gan.muni.il';
const PRIMARY    = `${API_BASE}/api/EventLobby//event-lobbies/kids-and-infants`;
const SECONDARY  = `${API_BASE}/api/EventLobby/he/event-lobby`;
const SOURCE_NAME = 'Ramat Gan Municipality';

const HEADERS = {
  'Accept': 'application/json',
  'Accept-Language': 'he-IL,he;q=0.9',
  'User-Agent': 'MamaOut-scraper/1.0',
};

// Keep event if it targets babies/toddlers or whole-family in a kids category
function isRelevant(event) {
  const audiences = (event.audienceType ?? []).map(a => a.name);
  const catName   = event.category?.name ?? '';
  const clusterNames = (event.cluster ?? []).map(c => c.name);

  if (audiences.some(a => a.includes('הגיל הרך'))) return true;
  if (clusterNames.some(c => c.includes('גיל הרך'))) return true;
  if (
    audiences.includes('לכל המשפחה') &&
    (catName.includes('ילדים') || catName.includes('גיל הרך') || catName.includes('סיפור'))
  ) return true;
  return false;
}

// Extract HH:MM from the `hour` field (only the time part is reliable — date part is junk)
function parseTime(hourIso) {
  if (!hourIso) return null;
  const match = hourIso.match(/T(\d{2}:\d{2})/);
  if (!match) return null;
  // hour is stored as UTC; Israel summer is UTC+3
  const [hh, mm] = match[1].split(':').map(Number);
  const localH = (hh + 3) % 24;
  return `${String(localH).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function mapCategory(catName = '') {
  if (catName.includes('סיפור')) return 'wellness';
  if (catName.includes('תרבות') || catName.includes('תיאטרון')) return 'wellness';
  return 'baby-focused';
}

function mapEvent(e) {
  const dateStr   = e.date?.split('T')[0] ?? null;   // "2026-06-22"
  const timeStart = parseTime(e.hour);
  const isFree    = e.priceType === 3 || e.priceType === 0;
  const priceNis  = isFree ? 0 : null;
  const priceNotes = e.priceType === 3 ? 'Free entry'
    : e.priceType === 0 ? 'Free for Ramat Gan residents'
    : 'Registration required';

  const address     = e.eventLocation?.address || '';
  const venueName   = e.eventLocation?.name || e.location || '';
  const sourceUrl   = e.detailsLink?.url
    ? `${SITE_BASE}${e.detailsLink.url}`
    : null;

  const audiences    = (e.audienceType ?? []).map(a => a.name);
  const hasEarlyAge  = audiences.some(a => a.includes('הגיל הרך'));
  const ageMinWeeks  = 0;
  const ageMaxWeeks  = hasEarlyAge ? 156 : 624;   // 3 yrs or 12 yrs in weeks

  const scheduleLabel = dateStr && timeStart
    ? `${new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IL', { weekday: 'short', day: 'numeric', month: 'short' })} · ${timeStart}`
    : dateStr || null;

  return {
    name:             e.title,
    description:      e.shortTitle || '',
    location:         'Ramat Gan',
    venue:            venueName,
    address,
    neighborhood:     e.neighborhood || 'Ramat Gan',
    source_url:       sourceUrl,
    source_name:      SOURCE_NAME,
    category:         mapCategory(e.category?.name),
    schedule_type:    'one-time',
    schedule_label:   scheduleLabel,
    next_dates:       dateStr ? [dateStr] : [],
    time_start:       timeStart,
    price:            priceNis,
    price_notes:      priceNotes,
    stroller_accessible: e.accessible ?? false,
    baby_age_min:     ageMinWeeks,
    baby_age_max:     ageMaxWeeks,
    is_verified:      true,
    language:         'he',
  };
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

export async function scrapeRamatGanMuni() {
  const seen   = new Map();   // source_url → mapped event
  const today  = new Date().toISOString().split('T')[0];

  // --- Primary endpoint (pre-filtered kids lobby) ---
  try {
    const data    = await fetchJson(PRIMARY);
    const content = data.content ?? data;
    const events  = [
      ...(content.closeEvents ?? []),
      ...(content.eventLobbyCategories ?? []).flatMap(c => c.events ?? []),
    ];
    for (const e of events) {
      const url = e.detailsLink?.url;
      if (!url || seen.has(url)) continue;
      if ((e.date ?? '') < today) continue;
      seen.set(url, mapEvent(e));
    }
    console.log(`[ramat-gan-muni] primary: ${seen.size} events`);
  } catch (err) {
    console.warn(`[ramat-gan-muni] primary endpoint failed: ${err.message}`);
  }

  // --- Secondary endpoint (all events — filter for early childhood) ---
  try {
    const data = await fetchJson(SECONDARY);
    const all  = Array.isArray(data) ? data
      : (data.content?.events ?? data.events ?? []);

    let added = 0;
    for (const e of all) {
      const url = e.detailsLink?.url;
      if (!url || seen.has(url)) continue;
      if ((e.date ?? '') < today) continue;
      if (!isRelevant(e)) continue;
      seen.set(url, mapEvent(e));
      added++;
    }
    console.log(`[ramat-gan-muni] secondary added ${added} more early-childhood events`);
  } catch (err) {
    console.warn(`[ramat-gan-muni] secondary endpoint failed: ${err.message}`);
  }

  const results = [...seen.values()].filter(e => e.source_url);
  console.log(`[ramat-gan-muni] total: ${results.length} unique upcoming events`);
  return results;
}
