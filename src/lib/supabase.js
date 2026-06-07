import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseUrl = url;
export const supabaseKey = key;
export const isConfigured = Boolean(url && key);

export const supabase = isConfigured
  ? createClient(url, key)
  : null;
