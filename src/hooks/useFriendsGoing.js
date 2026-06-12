import { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

/**
 * Which of the current user's friends are Interested / Going, grouped by activity.
 * Returns a map: { [activityId]: [{ id, name, status }] }.
 *
 * This powers the "👯 Friends are going" section on Discover and the friend pill
 * on activity cards. `friends` is passed in (from useFriends) to reuse the
 * friendships query rather than re-fetching it.
 */
export function useFriendsGoing(friends = []) {
  const { user } = useAuthContext();
  const [map, setMap] = useState({});

  const friendIds = friends.map(f => f.id).filter(Boolean);
  const friendKey = friendIds.slice().sort().join(',');

  useEffect(() => {
    if (!isConfigured || !supabase || !user || friendIds.length === 0) {
      setMap({});
      return;
    }
    let cancelled = false;

    supabase
      .from('activity_participants')
      .select('activity_id, status, user_id, profiles(name)')
      .in('user_id', friendIds)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const next = {};
        for (const r of data) {
          if (!r.activity_id) continue;
          const list = next[r.activity_id] || (next[r.activity_id] = []);
          list.push({
            id: r.user_id,
            name: r.profiles?.name || 'A friend',
            status: r.status,
          });
        }
        setMap(next);
      });

    return () => { cancelled = true; };
  }, [user, friendKey]);

  return map;
}
