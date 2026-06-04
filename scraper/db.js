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
 * If the row already exists and name_en is null, it will be updated with the new data.
 * Returns { row, isNew } where isNew is true if a fresh insert happened.
 */
export async function insertIfNew(activity) {
  // Check if it already exists with a proper English name
  const { data: existing } = await supabase
    .from('activities')
    .select('id, name_en')
    .eq('source_url', activity.source_url)
    .maybeSingle();

  // Already up-to-date — skip
  if (existing?.name_en) return null;

  if (existing) {
    // Row exists but is missing name_en — update it
    const { data, error } = await supabase
      .from('activities')
      .update(activity)
      .eq('source_url', activity.source_url)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Fresh insert
  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single();

  if (error) throw error;
  return data;
}
