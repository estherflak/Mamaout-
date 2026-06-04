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
 * Upsert an activity by source_url.
 * If the row already exists with name_en populated, it is skipped (returns null).
 * Otherwise inserts or updates via a single atomic ON CONFLICT operation.
 */
export async function insertIfNew(activity) {
  const { data: existing } = await supabase
    .from('activities')
    .select('name_en')
    .eq('source_url', activity.source_url)
    .maybeSingle();

  if (existing?.name_en) return null;

  const { data, error } = await supabase
    .from('activities')
    .upsert(activity, { onConflict: 'source_url', ignoreDuplicates: false })
    .select()
    .single();

  if (error) throw error;
  return data;
}
