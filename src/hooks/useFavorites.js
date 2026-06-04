import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { normalizeSupabaseActivity } from './useActivities';

export function useFavorites() {
  const { user } = useAuthContext();
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [favoritedActivities, setFavoritedActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from('favorites')
      .select('activity_id, activities(*)')
      .eq('user_id', user.id);

    if (data) {
      setFavoriteIds(new Set(data.map(f => f.activity_id)));
      setFavoritedActivities(data.map(f => f.activities).filter(Boolean).map(normalizeSupabaseActivity));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function toggle(activityId) {
    if (!user || !supabase) return;
    const isFav = favoriteIds.has(activityId);

    // Optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(activityId); else next.add(activityId);
      return next;
    });

    if (isFav) {
      await supabase.from('favorites').delete()
        .eq('user_id', user.id).eq('activity_id', activityId);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, activity_id: activityId });
    }
    load();
  }

  return { favoriteIds, favoritedActivities, loading, toggle };
}
