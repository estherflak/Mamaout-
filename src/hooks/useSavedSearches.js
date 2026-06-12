import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

export function useSavedSearches() {
  const { user } = useAuthContext();
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user || !supabase) { setSearches([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSearches(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Returns { saved: true } on success, { duplicate: true } if already saved,
  // or { error } / { signedOut: true } so the caller can show feedback.
  async function add({ query, area, label }) {
    if (!user || !supabase) return { signedOut: true };
    const q = (query || '').trim();
    const a = area || 'all';
    if (searches.some(s => (s.query || '') === q && (s.area || 'all') === a)) {
      return { duplicate: true };
    }
    const { error } = await supabase.from('saved_searches').insert({
      user_id: user.id,
      query: q || null,
      area: a,
      label,
    });
    if (error) return { error };
    await load();
    return { saved: true };
  }

  async function remove(id) {
    if (!user || !supabase) return;
    setSearches(prev => prev.filter(s => s.id !== id)); // optimistic
    await supabase.from('saved_searches').delete().eq('id', id).eq('user_id', user.id);
    load();
  }

  return { searches, loading, add, remove };
}
