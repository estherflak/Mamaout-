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

  // Prefer venue as neighborhood if available; fall back to first part of location
  const neighborhood = a.venue?.trim() ||
    a.location?.split(',')[0]?.trim() ||
    a.location || city;

  const catKey = a.category?.toLowerCase() || 'social';

  // Prefer English translations for name/description (app UI is English)
  const displayName = a.name_en || a.name || 'Unnamed Activity';
  const displayDesc = a.description_en || a.description || '';

  return {
    id: a.id,
    name: displayName,
    nameHe: a.name,
    category: CATEGORY_LABEL[catKey] || 'Social',
    neighborhood,
    city,
    description: displayDesc,
    descriptionHe: a.description,
    price: a.price_range || '₪',
    priceLabel: a.price_range === 'free' ? 'Free' : 'Paid',
    ageFrom: a.baby_age_min ?? 0,
    ageTo: null,
    ageLabel: a.baby_age_min
      ? a.baby_age_min <= 4
        ? 'From birth'
        : `From ${a.baby_age_min} weeks`
      : 'All ages',
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
