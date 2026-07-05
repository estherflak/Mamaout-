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

export function cityLabel(name, lang) {
  if (!name) return name;
  return lang === 'he' ? (CITY_HE[name] || name) : name;
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
