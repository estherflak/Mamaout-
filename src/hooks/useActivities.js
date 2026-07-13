import { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { ACTIVITIES as MOCK_ACTIVITIES } from '../data/activities';

const CATEGORY_EMOJI = {
  movement:       '🤸',
  wellness:       '🌸',
  creative:       '🎨',
  social:         '☕',
  'baby-focused': '🌈',
};

// Internal grouping key only (matches the mock-data `category` field) — never
// rendered directly; use categoryLabel() from lib/localize.js for user-facing text.
const CATEGORY_LABEL = {
  movement:       'Movement',
  wellness:       'Wellness',
  creative:       'Creative',
  social:         'Social',
  'baby-focused': 'Baby',
};

// Canonical city resolution from a free-text location / address string.
// Covers the Tel Aviv (Gush Dan) metro in Hebrew and English. Order matters:
// more specific names are listed so a partial string resolves correctly.
const CITY_PATTERNS = [
  ['Tel Aviv',       ['tel aviv', 'tel-aviv', 'תל אביב', 'תל־אביב', 'יפו', 'jaffa']],
  ['Ramat Gan',      ['ramat gan', 'רמת גן']],
  ['Givatayim',      ['givatayim', 'גבעתיים']],
  ['Petah Tikva',    ['petah tikva', 'petach tikva', 'פתח תקווה', 'פתח תקוה']],
  ['Bnei Brak',      ['bnei brak', 'בני ברק']],
  ['Bat Yam',        ['bat yam', 'בת ים']],
  ['Holon',          ['holon', 'חולון']],
  ['Ganei Tikva',    ['ganei tikva', 'גני תקווה', 'גני תקוה']],
  ['Givat Shmuel',   ['givat shmuel', 'גבעת שמואל']],
  ['Kiryat Ono',     ['kiryat ono', 'קרית אונו', 'קריית אונו']],
  ['Yehud',          ['yehud', 'יהוד']],
  ['Or Yehuda',      ['or yehuda', 'אור יהודה']],
  ['Ramat HaSharon', ['ramat hasharon', 'רמת השרון']],
  ['Herzliya',       ['herzliya', 'הרצליה']],
];

export function resolveCity(location) {
  const s = (location || '').toLowerCase();
  for (const [city, patterns] of CITY_PATTERNS) {
    if (patterns.some(p => s.includes(p))) return city;
  }
  return 'Tel Aviv'; // default for unrecognised metro locations
}

export function normalizeSupabaseActivity(a) {
  const city = resolveCity(a.location);

  // Prefer the new dedicated neighborhood column, then venue, then location prefix
  const neighborhood = a.neighborhood?.trim() ||
    a.venue?.trim() ||
    a.location?.split(',')[0]?.trim() ||
    city;

  const catKey = a.category?.toLowerCase() || 'social';

  // Prefer English translations for name/description (app UI is English)
  const displayName = a.name_en || a.name || 'Unnamed Activity';
  const displayDesc = a.description_en || a.description || '';

  // Age range — weeks (shared with Places). Display text is language-dependent,
  // so it's formatted at render time via formatAge.js, not baked in here.
  const ageMin = a.baby_age_min ?? null;
  const ageMax = a.baby_age_max ?? null;

  // Price — prefer the new integer NIS column, fall back to a raw tier code
  // ('low'/'paid'/'pricey') translated at render time.
  const priceNis = a.price ?? null;
  const isFree = a.is_free
    ?? (priceNis != null ? priceNis === 0 : a.price_range?.toLowerCase() === 'free');
  const priceTier = (() => {
    if (isFree || priceNis != null) return null;
    const p = (a.price_range || '').toLowerCase().trim();
    if (p === '₪')   return 'low';
    if (p === '₪₪')  return 'paid';
    if (p === '₪₪₪') return 'pricey';
    return a.price_range || null;
  })();

  // Past dates are useless on a card and made stale rows look "next: last week"
  const todayStr = new Date().toISOString().slice(0, 10);
  const allDates = a.next_dates || [];
  const nextDates = allDates.filter(d => d >= todayStr);
  // A session-based row whose every date has passed is over — its booking link
  // is likely already dead. Flag it so the feed can drop it (nightly cleanup
  // deletes it properly server-side).
  const isExpired = allDates.length > 0 && nextDates.length === 0 && !a.event_date;

  return {
    id: a.id,
    name: displayName,
    nameHe: a.name,
    categoryKey: catKey,
    category: CATEGORY_LABEL[catKey] || 'Social',
    neighborhood,
    city,
    description: displayDesc,
    descriptionHe: a.description,
    scheduleLabel: a.schedule_label || null,
    scheduleType: a.schedule_type || null,
    nextDates,
    timeStart: a.time_start ? a.time_start.slice(0, 5) : null,   // "10:00"
    timeEnd:   a.time_end   ? a.time_end.slice(0, 5)   : null,
    priceTier,
    priceNis,
    isFree,
    ageFrom: ageMin ?? 0,
    ageTo: ageMax,
    strollerAccessible: a.stroller_accessible ?? null,
    address: a.address?.trim() || null,
    organizerName: a.organizer_name?.trim() || null,
    organizerWhatsapp: a.organizer_whatsapp?.trim() || null,
    eventDate: a.event_date ? new Date(a.event_date) : null,
    tags: [],
    friendsGoing: [],
    emoji: CATEGORY_EMOJI[catKey] || '🌸',
    priceNotes: a.price_notes?.trim() || null,
    sourceUrl: a.source_url,
    sourceName: a.source_name,
    isVerified: a.is_verified,
    ctaLabel: a.cta_label || null,
    venue: a.venue?.trim() || null,
    location: a.location?.trim() || null,
    latitude: a.latitude ?? null,
    longitude: a.longitude ?? null,
    language: a.language || 'he',
    isExpired,
  };
}

export function useActivities() {
  // Mock data is a local-dev convenience only (no Supabase env configured).
  // In production we never show sample activities — a mom could try to attend one.
  const [activities, setActivities] = useState(isConfigured ? [] : MOCK_ACTIVITIES);
  const [loading, setLoading] = useState(isConfigured);
  const [error, setError] = useState(null);
  const dataSource = isConfigured ? 'supabase' : 'mock';

  useEffect(() => {
    if (!isConfigured) return;

    let cancelled = false;
    setLoading(true);

    supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
        } else {
          // Safety nets: never surface toddler-only content (starts above 12
          // months) or rows whose every session already passed, whatever the
          // scraper let through.
          setActivities(
            (data || []).map(normalizeSupabaseActivity)
              .filter(a => (a.ageFrom ?? 0) <= 52 && !a.isExpired)
          );
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { activities, loading, error, dataSource };
}
