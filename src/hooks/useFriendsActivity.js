import { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { normalizeSupabaseActivity } from './useActivities';

/**
 * Phase 6.2 — friends activity feed.
 * Given the current user's friends, returns the activities those friends have
 * marked Interested / Going (most recent first). When the user has no friends
 * yet, returns an anonymous aggregate hint to suggest the value of adding some.
 *
 * `friends` is passed in (from useFriends) to avoid a duplicate friendships query.
 */
export function useFriendsActivity(friends = []) {
  const { user } = useAuthContext();
  const [feed, setFeed] = useState([]);
  const [hint, setHint] = useState(null);

  const friendIds = friends.map(f => f.id).filter(Boolean);
  const friendKey = friendIds.slice().sort().join(',');

  useEffect(() => {
    if (!isConfigured || !supabase || !user) return;
    let cancelled = false;

    async function run() {
      if (friendIds.length > 0) {
        const { data } = await supabase
          .from('activity_participants')
          .select('id, status, created_at, activity_id, activities(*), profiles(name)')
          .in('user_id', friendIds)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!cancelled) {
          setFeed((data || [])
            .filter(r => r.activities)
            .map(r => ({
              id: r.id,
              status: r.status,
              date: r.created_at,
              friendName: r.profiles?.name || 'A friend',
              activity: normalizeSupabaseActivity(r.activities),
            })));
          setHint(null);
        }
      } else {
        // No friends yet — surface an anonymous "X moms saved Y this week" hint
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from('activity_participants')
          .select('activity_id, activities(name, location)')
          .gte('created_at', weekAgo);

        if (!cancelled) {
          const counts = {};
          for (const r of (data || [])) {
            if (!r.activities) continue;
            const c = counts[r.activity_id]
              || (counts[r.activity_id] = { n: 0, name: r.activities.name, loc: r.activities.location || '' });
            c.n += 1;
          }
          const top = Object.values(counts).sort((a, b) => b.n - a.n)[0];
          if (top) {
            const city = top.loc.toLowerCase().includes('ramat gan') ? 'Ramat Gan' : 'Tel Aviv';
            setHint(`${top.n} ${top.n === 1 ? 'mom' : 'moms'} in ${city} saved ${top.name} this week`);
          } else {
            setHint(null);
          }
          setFeed([]);
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [user, friendKey]);

  return { feed, hint };
}

// "2h ago" / "3d ago" / "just now" for feed timestamps
export function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IL', { day: 'numeric', month: 'short' });
}
