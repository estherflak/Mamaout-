import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

export function useFriends() {
  const { user } = useAuthContext();
  const [friends, setFriends]   = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);

    // Accepted friendships where I am either side
    const { data: accepted } = await supabase
      .from('friendships')
      .select('*, user:profiles!friendships_user_id_fkey(*), friend:profiles!friendships_friend_id_fkey(*)')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted');

    // Incoming pending requests (I am friend_id)
    const { data: pending } = await supabase
      .from('friendships')
      .select('*, user:profiles!friendships_user_id_fkey(*)')
      .eq('friend_id', user.id)
      .eq('status', 'pending');

    if (accepted) {
      setFriends(accepted.map(f =>
        f.user_id === user.id ? f.friend : f.user
      ).filter(Boolean));
    }
    if (pending) setRequests(pending);

    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  function normalizePhone(raw) {
    let p = raw.replace(/[\s\-().]/g, '');
    if (p.startsWith('+972')) p = '0' + p.slice(4);
    if (p.startsWith('00972')) p = '0' + p.slice(5);
    return p;
  }

  async function sendRequest(phone) {
    if (!supabase) throw new Error('not_configured');
    const normPhone = normalizePhone(phone);

    // RLS hides other users' profile rows, so the lookup goes through a
    // SECURITY DEFINER RPC that returns only id + name for an exact phone match.
    const { data: matches, error: lookupErr } = await supabase
      .rpc('find_profile_by_phone', { p_phone: normPhone });

    if (lookupErr) throw new Error(lookupErr.message);
    const target = matches?.[0];
    if (!target) throw new Error('no_user_found');
    if (target.id === user.id) throw new Error('own_number');

    const { error } = await supabase.from('friendships').insert({
      user_id: user.id,
      friend_id: target.id,
      status: 'pending',
    });

    if (error?.code === '23505') throw new Error('already_sent');
    if (error) throw new Error(error.message);
  }

  async function respond(friendshipId, accepted) {
    if (!supabase) return;
    await supabase.from('friendships').update({
      status: accepted ? 'accepted' : 'declined',
    }).eq('id', friendshipId);
    load();
  }

  return { friends, requests, loading, sendRequest, respond, reload: load };
}
