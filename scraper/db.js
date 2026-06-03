import { createClient } from '@supabase/supabase-js';

function getClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
  return createClient(url, key);
}

let _supabase;
const supabase = new Proxy({}, {
  get(_, prop) {
    _supabase = _supabase ?? getClient();
    return _supabase[prop];
  },
});

/**
 * Insert an activity only if its source_url hasn't been seen before.
 * Returns the inserted row, or null if it was a duplicate.
 */
export async function insertIfNew(activity) {
  // Deduplicate by source_url
  const { data: existing } = await supabase
    .from('activities')
    .select('id')
    .eq('source_url', activity.source_url)
    .maybeSingle();

  if (existing) return null;

  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single();

  if (error) throw error;
  return data;
}
