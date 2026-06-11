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

const CATEGORY_LABEL = {
  movement:       'Movement',
  wellness:       'Wellness',
  creative:       'Creative',
  social:         'Social',
  'baby-focused': 'Baby',
};

export function normalizeSupabaseActivity(a) {
  const raw = (a.location || '').toLowerCase();
  const city = raw.includes('ramat gan') || raw.includes('רמת גן')
    ? 'Ramat Gan'
    : 'Tel Aviv';

  // Prefer the new dedicated neighborhood column, then venue, then location prefix
  const neighborhood = a.neighborhood?.trim() ||
    a.venue?.trim() ||
    a.location?.split(',')[0]?.trim() ||
    city;

  const catKey = a.category?.toLowerCase() || 'social';

  // Prefer English translations for name/description (app UI is English)
  const displayName = a.name_en || a.name || 'Unnamed Activity';
  const displayDesc = a.description_en || a.description || '';

  // Age label — show range when both min and max are known
  const ageMin = a.baby_age_min ?? null;
  const ageMax = a.baby_age_max ?? null;
  const ageLabel = (() => {
    if (ageMin == null && ageMax == null) return 'All ages';
    const fmt = w => w <= 4 ? 'newborn' : w < 20 ? `${w}w` : `${Math.round(w / 4.3)}mo`;
    if (ageMin != null && ageMax != null) return `${fmt(ageMin)}–${fmt(ageMax)}`;
    if (ageMin != null) return ageMin <= 4 ? 'From birth' : `From ${fmt(ageMin)}`;
    return `Up to ${fmt(ageMax)}`;
  })();

  // Price — prefer the new integer NIS column, fall back to tier string
  const priceNis = a.price ?? null;
  const isFree = a.is_free ?? (priceNis === 0) ?? (a.price_range?.toLowerCase() === 'free');
  const priceDisplay = (() => {
    if (isFree) return 'Free';
    if (priceNis != null) return `₪${priceNis}`;
    const p = (a.price_range || '').toLowerCase().trim();
    if (p === '₪')   return 'Low cost';
    if (p === '₪₪')  return 'Paid';
    if (p === '₪₪₪') return 'Pricey';
    return a.price_range || null;
  })();

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
    nextDates: a.next_dates || [],
    timeStart: a.time_start ? a.time_start.slice(0, 5) : null,   // "10:00"
    timeEnd:   a.time_end   ? a.time_end.slice(0, 5)   : null,
    price: priceDisplay,
    priceNis,
    isFree,
    ageFrom: ageMin ?? 0,
    ageTo: ageMax,
    ageLabel,
    strollerAccessible: a.stroller_accessible ?? null,
    address: a.address?.trim() || null,
    organizerName: a.organizer_name?.trim() || null,
    organizerWhatsapp: a.organizer_whatsapp?.trim() || null,
    eventDate: a.event_date ? new Date(a.event_date) : null,
    tags: [],
    friendsGoing: [],
    emoji: CATEGORY_EMOJI[catKey] || '🌸',
    sourceUrl: a.source_url,
    sourceName: a.source_name,
    isVerified: a.is_verified,
    ctaLabel: a.cta_label || 'More info',
    latitude: a.latitude ?? null,
    longitude: a.longitude ?? null,
    language: a.language || 'he',
  };
}

export function useActivities() {
  const [activities, setActivities] = useState(MOCK_ACTIVITIES);
  const [loading, setLoading] = useState(isConfigured);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('mock');

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
        } else if (data?.length > 0) {
          setActivities(data.map(normalizeSupabaseActivity));
          setDataSource('supabase');
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { activities, loading, error, dataSource };
}
