import { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

/**
 * Aggregate RSVP counts per activity for the list cards.
 * Returns a map: { [activityId]: { interested, going } }.
 * activity_participants is publicly readable, so we aggregate client-side
 * in a single query rather than per-card requests.
 */
export function useRsvpCounts() {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!isConfigured || !supabase) return;
    let cancelled = false;

    supabase
      .from('activity_participants')
      .select('activity_id, status')
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const map = {};
        for (const { activity_id, status } of data) {
          if (!activity_id) continue;
          const c = map[activity_id] || (map[activity_id] = { interested: 0, going: 0 });
          if (status === 'interested') c.interested += 1;
          else if (status === 'going') c.going += 1;
        }
        setCounts(map);
      });

    return () => { cancelled = true; };
  }, []);

  return counts;
}
