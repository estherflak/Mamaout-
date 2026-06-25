import { createClient } from '@supabase/supabase-js';

function getClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Prefer service role key for server-side writes (bypasses RLS)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  return createClient(url, key);
}

let _supabase;
const supabase = new Proxy({}, {
  get(_, prop) {
    _supabase = _supabase ?? getClient();
    return _supabase[prop];
  },
});

// Schedule fields that change between scrapes and must stay fresh on every run.
// Everything else (incl. the enriched name_en/description_en/lat/long added
// later by the backfills) is left untouched when a row already exists.
const VOLATILE_FIELDS = [
  'next_dates', 'time_start', 'time_end',
  'schedule_type', 'schedule_label', 'price', 'price_notes',
];

/**
 * Upsert an activity by source_url.
 *
 * - Brand-new source_url → insert the full payload, return the new row.
 * - Existing source_url → refresh only the volatile schedule fields so
 *   recurring classes keep rolling forward, while preserving the already
 *   translated/geocoded columns. Returns null (not a new activity).
 *
 * The previous version skipped any already-translated row entirely, which
 * froze recurring events' next_dates until cleanup-past trimmed them away.
 */
export async function insertIfNew(activity) {
  const { data: existing } = await supabase
    .from('activities')
    .select('id')
    .eq('source_url', activity.source_url)
    .maybeSingle();

  if (existing) {
    const patch = {};
    for (const f of VOLATILE_FIELDS) {
      if (activity[f] !== undefined) patch[f] = activity[f];
    }
    if (Object.keys(patch).length) {
      const { error } = await supabase
        .from('activities')
        .update(patch)
        .eq('id', existing.id);
      if (error) throw error;
    }
    return null;
  }

  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single();

  if (error) throw error;
  return data;
}
