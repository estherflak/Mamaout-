// Pick the right text for an activity given the content language.
// Hebrew uses the source fields; English uses the translation-preferred fields
// (which already fall back to the source when no translation exists yet).

import { t } from '../i18n/strings';

export function localizedName(activity, lang) {
  return lang === 'he' ? (activity.nameHe || activity.name) : activity.name;
}

export function localizedDesc(activity, lang) {
  return lang === 'he' ? (activity.descriptionHe || activity.description) : activity.description;
}

// Normalizes both real Supabase data (categoryKey: movement/wellness/creative/
// social/baby-focused) and mock data (category: 'Movement'/'Wellness'/…, no
// categoryKey) to one translated display label.
const CATEGORY_ALIASES = {
  movement: 'movement',
  wellness: 'wellness',
  creative: 'creative',
  social: 'social',
  'baby-focused': 'baby',
  baby: 'baby',
};

export function categoryLabel(activity, lang) {
  const raw = (activity.categoryKey || activity.category || '').toLowerCase();
  const key = CATEGORY_ALIASES[raw] || 'social';
  return t(lang, `categories.${key}`);
}

// Canonical city names are stored in English ("Ramat Gan"); show Hebrew
// equivalents in the Hebrew UI. Unknown values pass through unchanged.
const CITY_HE = {
  'Tel Aviv': 'תל אביב',
  'Ramat Gan': 'רמת גן',
  'Givatayim': 'גבעתיים',
  'Petah Tikva': 'פתח תקווה',
  'Bnei Brak': 'בני ברק',
  'Bat Yam': 'בת ים',
  'Holon': 'חולון',
  'Ganei Tikva': 'גני תקווה',
  'Givat Shmuel': 'גבעת שמואל',
  'Kiryat Ono': 'קריית אונו',
  'Yehud': 'יהוד',
  'Or Yehuda': 'אור יהודה',
  'Ramat HaSharon': 'רמת השרון',
  'Herzliya': 'הרצליה',
};

// Reverse map so a Hebrew city name that slips through a scraper still shows
// in English in the English UI.
const CITY_FROM_HE = Object.fromEntries(Object.entries(CITY_HE).map(([en, he]) => [he, en]));

export function cityLabel(name, lang) {
  if (!name) return name;
  const trimmed = name.trim();
  if (lang === 'he') return CITY_HE[trimmed] || name;
  return CITY_FROM_HE[trimmed] || name;
}

// Known Hebrew venue names → English transliterations for the English UI.
// Venues are proper nouns the translation backfill doesn't cover; new scraped
// venues fall through unchanged (rendered with dir="auto") until added here.
const VENUE_EN = {
  'מרכז קהילתי בית עמנואל': 'Beit Emanuel Community Center',
  'מרכז תרבות וקהילה רמת יצחק': 'Ramat Yitzhak Culture & Community Center',
  'מרכז קהילתי רמת חן': 'Ramat Chen Community Center',
  'המרכז לגיל הרך רמת שקמה': 'Ramat Shikma Early Childhood Center',
};

function neighborhoodLabel(name, lang) {
  if (!name) return name;
  if (lang !== 'he') {
    // "venue, city" → translate each part if known
    const parts = name.split(',').map(p => {
      const s = p.trim();
      return VENUE_EN[s] || CITY_FROM_HE[s] || s;
    });
    return parts.join(', ');
  }
  return cityLabel(name, lang);
}

// "Neighborhood · City" line for cards/detail; collapses to just the city when
// the neighborhood IS the city (in either language).
export function locationLine(activity, lang) {
  let hood = neighborhoodLabel(activity.neighborhood, lang);
  const city = cityLabel(activity.city, lang);
  // Some scrapers store neighborhood as "venue, city" — drop the trailing city
  // so it doesn't repeat as "venue, city · city".
  if (hood && city && hood.endsWith(`, ${city}`)) {
    hood = hood.slice(0, -(city.length + 2));
  }
  if (!hood || hood === city) return city || '';
  return `${hood} · ${city}`;
}

// Canonical Gush Dan metro cities the app knows how to resolve/translate —
// primary cities first, then alphabetical. Used for pickers that must offer
// cities before any activity exists there yet.
export const METRO_CITIES = [
  'Tel Aviv',
  'Ramat Gan',
  ...Object.keys(CITY_HE).filter(c => c !== 'Tel Aviv' && c !== 'Ramat Gan').sort(),
];

// places.area ids → canonical city names (then translated via cityLabel).
const AREA_CITY = {
  tel_aviv: 'Tel Aviv',
  ramat_gan: 'Ramat Gan',
  givatayim: 'Givatayim',
  bnei_brak: 'Bnei Brak',
  holon: 'Holon',
};

export function areaLabel(areaId, lang) {
  return AREA_CITY[areaId] ? cityLabel(AREA_CITY[areaId], lang) : areaId;
}

// The scrapers store machine-generated English schedule labels
// ("8 upcoming sessions · 11:30", "One session · 10:00", "Wed, 8 Jul · 19:30").
// Localize the session-count patterns; return null for the English date
// pattern so callers fall back to their locale-aware date rendering.
const SESSIONS_RE = /^(One|\d+) (?:upcoming )?sessions?(?: · (.+))?$/;
const EN_DATE_RE = /^[A-Z][a-z]{2}, \d{1,2} [A-Z][a-z]{2}(?: · .+)?$/;

// Scraped price notes are Hebrew and follow a handful of patterns
// ("חינם (בהרשמה מראש)", "25 ₪ (במקום 58 ₪)"). price_notes is a volatile field
// (re-written on every scrape), so it's localized here at render time rather
// than translated in the DB. Unrecognized notes pass through unchanged.
const FREE_RE = /^חינם\s*(?:\(?\s*בהרשמה מראש\s*\)?)?\s*$/;
const DISCOUNT_RE = /^(\d+)\s*₪\s*\(במקום\s*(\d+)\s*₪\)$/;

export function localizedPriceNotes(activity, lang) {
  const notes = activity.priceNotes;
  if (!notes || lang === 'he') return notes || null;
  const trimmed = notes.trim();
  if (FREE_RE.test(trimmed)) {
    return trimmed.includes('בהרשמה') ? 'Free (advance registration)' : 'Free';
  }
  const m = trimmed.match(DISCOUNT_RE);
  if (m) return `₪${m[1]} (instead of ₪${m[2]})`;
  return notes;
}

export function localizedScheduleLabel(activity, lang) {
  const label = activity.scheduleLabel;
  if (!label) return null;
  const m = label.match(SESSIONS_RE);
  if (m) {
    const n = m[1] === 'One' ? 1 : parseInt(m[1], 10);
    const base = n === 1
      ? t(lang, 'schedule.oneSession')
      : t(lang, 'schedule.nSessions', { n });
    return m[2] ? `${base} · ${m[2]}` : base;
  }
  if (EN_DATE_RE.test(label) && activity.nextDates?.length) return null;
  return label;
}
