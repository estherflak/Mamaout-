import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { normalizeSupabaseActivity } from './useActivities';

// Favorites live in a single shared context so every heart button — feed card,
// detail sheet, saved screen — reads and updates the same state. (Previously
// each component had its own hook instance: hearts went out of sync and every
// card fired its own fetch.)
const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuthContext();
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [favoritedActivities, setFavoritedActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user || !supabase) {
      setFavoriteIds(new Set());
      setFavoritedActivities([]);
      return;
    }
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
    if (!user || !supabase) return false;
    const isFav = favoriteIds.has(activityId);

    // Optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(activityId); else next.add(activityId);
      return next;
    });

    const { error } = isFav
      ? await supabase.from('favorites').delete()
          .eq('user_id', user.id).eq('activity_id', activityId)
      : await supabase.from('favorites').insert({ user_id: user.id, activity_id: activityId });

    if (error) {
      console.error('Favorite toggle failed:', error.message);
      // Revert the optimistic update so the heart reflects reality
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (isFav) next.add(activityId); else next.delete(activityId);
        return next;
      });
      return false;
    }

    load();
    return true;
  }

  return (
    <FavoritesContext.Provider value={{ favoriteIds, favoritedActivities, loading, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext) || {
    favoriteIds: new Set(),
    favoritedActivities: [],
    loading: false,
    toggle: () => false,
  };
}
