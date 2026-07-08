/**
 * Coing communities — baby/postpartum events at Tel Aviv-Yafo municipal
 * community centers (מרכזים קהילתיים).
 *
 * Coing (coing.co — note .co, NOT .co.il) is the booking platform behind the
 * TLV municipality's community centers (all under organization_id 5). Every
 * "community" (tenant) exposes the same unauthenticated list API:
 *   https://external.coing.co/api/v2/communities/{id}/groups?page=N
 * so ONE integration covers every center; a tenant is configured by its slug
 * (https://www.coing.co/{slug}) plus its numeric community id (embedded in
 * the tenant page HTML as `var community = {"id":…}`).
 *
 * IMPORTANT API quirks (verified 2026-07):
 *  - The list API's activityBlock.date (display field) and location are
 *    EMPTY, but activityBlock.startDate/endDate ARE populated (UTC). Street
 *    address and price are server-rendered only on the detail page
 *    (record.resourceLink), which we fetch for records that pass the filter;
 *    the detail page stays the source of truth for dates too.
 *  - Group lists are ordered by activityBlock.startDate ASCENDING — verified
 *    across all 41 archive pages of community 5988 and every neighborhood
 *    tenant (NOT by id: ids only loosely correlate). Future events sit on the
 *    LAST pages, which is what makes the backward page walk below safe.
 *  - The list API intermittently answers HTTP 200 with zero records for a
 *    page that has records (the same page returns 50 on retry). Without a
 *    retry one blip nulls totalPages and silently truncates paging — the
 *    likely cause of the first production run's 17-vs-32 row variance.
 *  - Detail pages come in TWO layouts depending on the community theme:
 *    flat divs (activity-address / activity-date / activity-price) or an
 *    info-col layout (<span>כתובת</span>…<div class="info-col-value">). The
 *    parser below handles both generically.
 *  - pageSize is honored up to 50 (defaults to 10).
 *  - TLV_organization (the org-wide root community, id 5988) keeps an archive
 *    of PAST events (2024→), so the future-date gate below is load-bearing.
 *  - The same record can appear in several communities (e.g. a Neve Ofer
 *    event shows up in both the center's and the citywide listing) — records
 *    are deduped by record id per run, first tenant wins, so keep the
 *    specific neighborhood tenants BEFORE TLV_organization in TENANTS.
 *
 * IMPORTANT: this source feeds the Vercel cron pipeline, which inserts rows
 * WITHOUT the Claude relevance gate — the keyword filter below is the only
 * quality barrier. Community centers are full of kids-6+/seniors/adult
 * events, so it is deliberately strict (same tiers as smartticket.js).
 */

import { ageRangeFromName, isOutOfScopeForBabies } from './hebrew-ages.js';

const API_BASE = 'https://external.coing.co/api/v2';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; MamaOutBot/1.0)' };

// Neighborhood tenants first — TLV_organization aggregates the whole city and
// must stay LAST so shared records get attributed to their own center.
const TENANTS = [
  {
    slug: 'TLV_NeveOfer',
    communityId: 2832,
    sourceName: 'Neve Ofer Community Center',
    organizer: 'מרכז קהילתי נווה עופר',
  },
  {
    slug: 'TLV_NeveOfer_toddlers',
    communityId: 2979,
    sourceName: 'Neve Ofer Early Childhood Center',
    organizer: 'הבית לגיל הרך בנווה עופר',
  },
  {
    slug: 'TLV_Kalisher-5',
    communityId: 2898,
    sourceName: 'Kalisher 5 Community Center',
    organizer: 'מרכז קהילתי קלישר 5',
  },
  {
    // Early-childhood sub-tenant ("קליקט - פעילויות לקטנטנים"). Its groups API
    // currently returns ZERO records (content seems tag-driven on the site),
    // but the call is cheap — keep it so new groups get picked up.
    slug: 'TLV_Kalisher-5_Taf',
    communityId: 3337,
    sourceName: 'Kalisher 5 Early Childhood',
    organizer: 'קליקט - מרכז קהילתי קלישר 5',
  },
  {
    slug: 'TLV_NeveSharet',
    communityId: 3449,
    sourceName: 'Neve Sharet Community Center',
    organizer: 'קאנטרי קהילתי נווה שרת',
  },
  {
    // Currently zero baby items — included on purpose, expect churn.
    slug: 'TLV_RamatAviv',
    communityId: 2375,
    sourceName: 'Ramat Aviv Community Center',
    organizer: 'המרכז הקהילתי רמת אביב',
  },
  {
    // Org-wide root community (organization 5 → mainCommunityId). Citywide
    // baby programming (מרחב הורה ילד וילדה, המרחב התפתחותי…) lives here.
    slug: 'TLV_organization',
    communityId: 5988,
    sourceName: 'Tel Aviv Community Centers',
    organizer: 'עיריית תל אביב-יפו - מרכזים קהילתיים',
  },
];

// Safety valve for the cron budget: candidates are pre-filtered to listings
// the API still shows as current (see listedAsEnded), so this cap should
// rarely bind — it only guards against a platform-side date blowup. Candidates
// are sorted by record id descending (newer first) before the cap.
const MAX_DETAIL_FETCHES = 200;

// ─── Relevance filter ────────────────────────────────────────────────────────
// Same two tiers as smartticket.js. STRONG keywords are baby-specific and pass
// on their own (the age guard still drops toddler-only classes). WEAK keywords
// (parents, moms…) show up on teen workshops and adult lectures, so they pass
// only when the title also carries a parseable age signal.

const STRONG_PATTERNS = [
  /תינוק/,   // baby (matches תינוקות too)
  /בייבי/,   // "baby" transliterated
  /קטנט/,    // tiny ones — no final ן so קטנטנים/קטנטנות (regular נ) match too
  /זחיל/,    // crawling (זחילה)
  // birth/postpartum. Left boundary + optional single-letter Hebrew prefix
  // (מלידה "from birth", בלידה, הלידה…) so גלידה (ice cream) can't match.
  /(?:^|[^א-ת])[מבלהוכש]?לידה/,
  /עיסוי/,   // massage
  /התפתחות/, // development (matches התפתחותי too)
  /משחקיה/,  // playroom
  /חל["״']ד/, // maternity leave (חופשת לידה) — "אימון לאימהות בחל"ד" etc.
  /הנקה/,    // breastfeeding — prefixed forms (בהנקה, להנקה…) are all still on-topic
  // starting solids. Plural only ("מעבר למוצקים", "ביסוס מוצקים") — the bare
  // stem מוצק would also match kids' states-of-matter workshops ("מוצק, נוזל וגז").
  /מוצקים/,
];

const WEAK_PATTERNS = [
  /אמא/, /אמהות/, /אימהות/,
  /הורים/,
  /פעוט/,
  /מגע/,
  /גיל הרך/,
  /לגיל/,   // "לגילאי 4 חודשים…" — the age-signal requirement does the real work
];

// Canceled events (בוטל/התבטל, sometimes starred "**בוטל**") and interest-list
// stubs (רשימת התעניינות) are listed like normal groups — drop them by name.
const EXCLUDE_PATTERNS = [
  /בוטל/,
  /התבטל/,
  /רשימת התעניינות/,
];

function isBabyRelevant(name) {
  if (!name) return false;
  if (EXCLUDE_PATTERNS.some(re => re.test(name))) return false;
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
  if (name.includes('יוגה') || name.includes('פילאטיס') || name.includes('ריקוד') || name.includes('תנועה') || name.includes('כושר') || name.includes('אימון')) return 'movement';
  if (name.includes('עיסוי') || name.includes('מגע')) return 'wellness';
  if (name.includes('סדנ') || name.includes('התפתחות') || name.includes('מרפאה')) return 'wellness';
  if (name.includes('שירה') || name.includes('מוזיקה') || name.includes('מוסיקה')) return 'wellness';
  if (name.includes('יצירה') || name.includes('אמנות')) return 'creative';
  return 'baby-focused';
}

// ─── List API ────────────────────────────────────────────────────────────────

// The list API's own startDate/endDate are enough to prove a record already
// ended — no point burning a detail fetch on it. Records missing both dates
// prove nothing and stay in (the detail-page future-date gate remains the
// real barrier). Cutoff carries a day of slack because these fields are UTC
// while event dates are Israel-local.
function listedAsEnded(record, pastCutoff) {
  const end = (record.activityBlock?.endDate ?? record.activityBlock?.startDate ?? '').slice(0, 10);
  return Boolean(end) && end < pastCutoff;
}

// Blips are per-request random, NOT CDN caching (responses are cf DYNAMIC; the
// same page can fail, succeed on immediate retry, then fail again) — but they
// burst for several seconds under load, so back off progressively rather than
// hammering the same window.
const PAGE_RETRY_DELAYS_MS = [500, 1500, 4000];

async function fetchGroupsPage(cfg, page) {
  for (let attempt = 0; ; attempt++) {
    const url = `${API_BASE}/communities/${cfg.communityId}/groups?page=${page}&pageSize=50`;
    const res = await fetch(url, { headers: { Accept: 'application/json', ...UA } });
    const data = await res.json().catch(() => null);
    const pagination = data?.data?.pagination;
    const raw = data?.data?.records ?? [];
    // PHP-style serialization: array OR object keyed by numeric index.
    const records = Array.isArray(raw) ? raw : Object.values(raw);
    // A truly empty community reports totalResults 0 (e.g. TLV_Kalisher-5_Taf);
    // zero records DESPITE a nonzero total (or no pagination at all) is a blip.
    if (records.length > 0 || pagination?.totalResults === 0) return { records, pagination };
    if (attempt >= PAGE_RETRY_DELAYS_MS.length) {
      console.error(`[coing:${cfg.slug}] page ${page} empty after ${attempt + 1} attempts`);
      return { records, pagination };
    }
    await new Promise(r => setTimeout(r, PAGE_RETRY_DELAYS_MS[attempt]));
  }
}

// Lists are startDate-ascending (see header), so future events sit on the
// LAST pages while TLV_organization's ~40-page archive fills the front. Walk
// backwards from the last page and stop once a page holds only records that
// already ended — every earlier page can only be older. A page with any
// undated record (or an empty blip) proves nothing, so the walk continues.
async function fetchAllGroups(cfg, pastCutoff) {
  const first = await fetchGroupsPage(cfg, 1);
  const totalPages = Math.min(first.pagination?.totalPages ?? 0, 60); // hard stop, ~3000 records
  const records = [...first.records];
  const blippedPages = [];
  for (let page = totalPages; page >= 2; page--) {
    const { records: pageRecords } = await fetchGroupsPage(cfg, page);
    if (pageRecords.length === 0) blippedPages.push(page); // never triggers the stop below
    records.push(...pageRecords);
    if (pageRecords.length > 0 && pageRecords.every(r => listedAsEnded(r, pastCutoff))) break;
    if (page > 2) await new Promise(r => setTimeout(r, 100));
  }
  // Second chance for pages that stayed empty through the retry ladder: by the
  // time the walk finishes the blip burst has passed, so one more ladder
  // usually recovers them (a page lost here = its ~50 records silently gone).
  for (const page of blippedPages) {
    const { records: pageRecords } = await fetchGroupsPage(cfg, page);
    records.push(...pageRecords);
  }
  return records;
}

// ─── Detail page parsing ─────────────────────────────────────────────────────

// "100 ש"ח" / "10-20 ש"ח" / "320₪" / free-text. First number wins; explicit
// free wording maps to 0; anything unparseable stays null (unknown).
function parsePrice(text) {
  if (!text) return null;
  if (/חינם|ללא עלות|ללא תשלום|כניסה חופשית/.test(text)) return 0;
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:ש["״']?ח|₪|שקל)/) || text.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
  return m ? parseFloat(m[1]) : null;
}

function ddmmyyyyToIso(s) {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

// Multi-session workshops list extra dates in the description free text, e.g.
// "בתאריכים -7,14,21,28.7 בימי שלישי" (days list, then .month). Best-effort:
// the structured header date stays the primary; these only enrich next_dates.
function descriptionDates(html, year) {
  const m = html.match(/בתאריכים\s*[-–]?\s*((?:\d{1,2}\s*,\s*)*\d{1,2})\s*\.\s*(\d{1,2})(?!\d)/);
  if (!m) return [];
  const month = String(parseInt(m[2], 10)).padStart(2, '0');
  if (+month < 1 || +month > 12) return [];
  return m[1].split(',').map(d => {
    const day = String(parseInt(d.trim(), 10)).padStart(2, '0');
    return +day >= 1 && +day <= 31 ? `${year}-${month}-${day}` : null;
  }).filter(Boolean);
}

/**
 * Detail pages come in two layouts (theme-dependent):
 *   A) <div class="activity-address">…</div><div class="activity-date …">07/07/2026</div>
 *      <div class="activity-time …">11:00 - 12:00</div><div class="activity-price …">100 ש"ח</div>
 *   B) <span>כתובת</span>…<div class="info-col-value">רחוב …</div>
 *      <span>תאריך האירוע</span>…<div dir="rtl">יום ג׳ 07/07/2026</div>
 *      <span>מחיר</span>…<div class="info-col-value"><div>100 ש"ח</div></div>
 * Both confine the facts to the section-activity-info block, so we slice that
 * and pattern-match generically.
 */
function parseDetail(html) {
  const start = html.indexOf('section-activity-info');
  if (start === -1) return null;
  const endRel = html.indexOf('activity-buttons', start);
  const info = html.slice(start, endRel === -1 ? start + 6000 : endRel);

  const dateIso = ddmmyyyyToIso(info);

  const time = info.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);

  const address =
    info.match(/activity-address"[^>]*>([^<]+)</)?.[1]?.trim() ||
    info.match(/כתובת<\/span><\/div><div class="info-col-value">([^<]+)</)?.[1]?.trim() ||
    null;

  const priceText =
    info.match(/activity-price[^>]*>([^<]+)</)?.[1] ||
    info.match(/מחיר<\/span><\/div><div class="info-col-value">(?:<div>)?([^<]+)</)?.[1] ||
    null;

  const venue =
    html.match(/activity-author-name"[^>]*>([^<]+)</)?.[1]?.trim() || null;

  return {
    date: dateIso,
    timeStart: time ? time[1].padStart(5, '0') : null,
    timeEnd: time ? time[2].padStart(5, '0') : null,
    address,
    price: parsePrice(priceText),
    venue,
    extraDates: dateIso ? descriptionDates(html, dateIso.slice(0, 4)) : [],
  };
}

async function fetchDetail(resourceLink) {
  try {
    const res = await fetch(resourceLink, { headers: UA });
    if (!res.ok) return null;
    return parseDetail(await res.text());
  } catch {
    return null;
  }
}

// ─── Field mapping ───────────────────────────────────────────────────────────

function mapToMamaOut(record, detail, cfg, today) {
  const dates = [...new Set([detail.date, ...detail.extraDates])]
    .filter(d => d && d >= today)
    .sort();

  // Prefer the detail page's numeric price; fall back to the list API's
  // free-text paymentText ("100 ש\"ח", "אירוע בתשלום"…).
  const price = detail.price ?? parsePrice(record.paymentText);
  const { min, max } = ageRangeFromName(record.name);

  // The detail page's author is sometimes the venue ("מרכז קהילתי נווה עופר")
  // and sometimes just the instructor — only trust it when it isn't the
  // group leader's personal name.
  const venue = detail.venue && detail.venue !== record.leader?.name ? detail.venue : null;

  return {
    name:          record.name.trim(),
    location:      'Tel Aviv',
    venue,
    address:       detail.address,
    neighborhood:  'Tel Aviv',
    next_dates:    dates,
    time_start:    detail.timeStart,
    time_end:      detail.timeEnd,
    schedule_type: dates.length > 1 ? 'recurring' : 'one-time',
    schedule_label: dates.length > 1
      ? `${dates.length} upcoming sessions${detail.timeStart ? ` · ${detail.timeStart}` : ''}`
      : null,
    price,
    price_notes:   price === 0 ? 'Free (registration required)' : null,
    stroller_accessible: null,
    baby_age_min:  min,
    baby_age_max:  max,
    category:      mapCategory(record.name),
    source_name:   cfg.sourceName,
    source_url:    record.resourceLink,
    organizer_name: cfg.organizer,
    is_verified:   true,
    language:      'he',
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function scrapeCoing() {
  const today = new Date().toISOString().slice(0, 10);
  const pastCutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const seenIds = new Set(); // shared records appear in several communities
  const candidates = [];     // { record, cfg }

  for (const cfg of TENANTS) {
    try {
      const records = await fetchAllGroups(cfg, pastCutoff);
      const relevant = records.filter(r =>
        r.type === 'regular' &&        // skip subcommunity/checking stubs
        !r.isEventFull &&
        r.resourceLink &&
        !listedAsEnded(r, pastCutoff) &&
        isBabyRelevant(r.name)
      );
      console.log(`[coing:${cfg.slug}] ${records.length} groups → ${relevant.length} baby-relevant`);
      for (const record of relevant) {
        if (seenIds.has(record.id)) continue;
        seenIds.add(record.id);
        candidates.push({ record, cfg });
      }
    } catch (err) {
      console.error(`[coing:${cfg.slug}] list fetch failed: ${err.message}`);
    }
  }

  // Newest first (higher id = newer), so the fetch cap only ever cuts stale
  // archive entries; then fetch detail pages politely in small batches.
  candidates.sort((a, b) => b.record.id - a.record.id);
  const toFetch = candidates.slice(0, MAX_DETAIL_FETCHES);
  if (candidates.length > toFetch.length) {
    console.log(`[coing] capping detail fetches: ${candidates.length} → ${toFetch.length}`);
  }

  const results = [];
  // The cron's console output is our only observability — count detail-fetch
  // failures per tenant so vanished rows are attributable, not silent.
  const stats = new Map(TENANTS.map(cfg => [cfg.slug, { fetched: 0, failed: 0, rows: 0 }]));
  const BATCH = 5;
  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch = toFetch.slice(i, i + BATCH);
    const details = await Promise.all(batch.map(c => fetchDetail(c.record.resourceLink)));
    batch.forEach(({ record, cfg }, j) => {
      const detail = details[j];
      const s = stats.get(cfg.slug);
      s.fetched++;
      if (!detail) { s.failed++; return; } // fetch error or unrecognized page layout
      // No parseable primary date, or a past one → archive entry, drop it.
      if (!detail.date || detail.date < today) return;
      s.rows++;
      results.push(mapToMamaOut(record, detail, cfg, today));
    });
    if (i + BATCH < toFetch.length) await new Promise(r => setTimeout(r, 150));
  }

  let totalFailed = 0;
  for (const cfg of TENANTS) {
    const s = stats.get(cfg.slug);
    totalFailed += s.failed;
    if (s.fetched === 0) continue;
    console.log(`[coing:${cfg.slug}] ${s.fetched} detail fetches → ${s.rows} rows (${s.failed} failed)`);
  }
  console.log(`[coing] total: ${results.length} upcoming baby events across ${TENANTS.length} tenant(s), ${totalFailed} detail fetch failure(s)`);
  return results;
}
