import { useState, useEffect, useCallback } from 'react';
import { supabase, supabaseUrl, supabaseKey, isConfigured } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

export function useParticipants(activityId) {
  const { user } = useAuthContext();
  const [participants, setParticipants] = useState([]);
  const [myStatus, setMyStatus] = useState(null);

  const load = useCallback(async () => {
    if (!activityId || !supabase) return;

    const { data } = await supabase
      .from('activity_participants')
      .select('*, profiles(id, name, photo_url)')
      .eq('activity_id', activityId);

    if (data) {
      setParticipants(data);
      if (user) {
        const mine = data.find(p => p.user_id === user.id);
        setMyStatus(mine?.status ?? null);
      }
    }
  }, [activityId, user]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(status) {
    if (!user || !supabase) return;

    if (myStatus) {
      if (status === null) {
        await supabase.from('activity_participants')
          .delete().eq('user_id', user.id).eq('activity_id', activityId);
      } else {
        await supabase.from('activity_participants')
          .update({ status }).eq('user_id', user.id).eq('activity_id', activityId);
      }
    } else if (status) {
      await supabase.from('activity_participants')
        .insert({ user_id: user.id, activity_id: activityId, status });
    }

    setMyStatus(status);
    load();
  }

  return { participants, myStatus, setStatus };
}

export function logClick(userId, activityId) {
  if (!isConfigured) return;
  fetch(`${supabaseUrl}/rest/v1/activity_clicks`, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ user_id: userId ?? null, activity_id: activityId }),
  });
}
