import { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

export function usePlaces() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    supabase
      .from('places')
      .select('*')
      .order('name')
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setPlaces(data || []);
        setLoading(false);
      });
  }, []);

  return { places, loading, error };
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function isOpenNow(openingHours) {
  if (!openingHours) return false;
  const dayKey = DAY_KEYS[new Date().getDay()];
  const hoursStr = openingHours[dayKey];
  if (!hoursStr) return false;
  const [open, close] = hoursStr.split('-');
  const toMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  return now >= toMins(open) && now < toMins(close);
}

export function getTodayHours(openingHours) {
  if (!openingHours) return null;
  const dayKey = DAY_KEYS[new Date().getDay()];
  return openingHours[dayKey] || null;
}
