/**
 * One-off/repair pass: recompute baby_age_min/baby_age_max for every activity
 * from its Hebrew name (see sources/hebrew-ages.js) and delete rows that are
 * out of scope for a 0–12-month audience (min age ≥ 1 year, birthday promos).
 *
 *   node scraper/backfill-ages.js            # apply
 *   node scraper/backfill-ages.js --dry-run  # print what would change
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { ageRangeFromName, isOutOfScopeForBabies } from './sources/hebrew-ages.js';

const dryRun = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: rows, error } = await supabase
  .from('activities')
  .select('id, name, baby_age_min, baby_age_max');
if (error) throw error;

let updated = 0, deleted = 0, unchanged = 0;

for (const row of rows) {
  if (isOutOfScopeForBabies(row.name)) {
    console.log(`DELETE  ${row.name}`);
    if (!dryRun) {
      const { error: e } = await supabase.from('activities').delete().eq('id', row.id);
      if (e) { console.error(`  ✗ ${e.message}`); continue; }
    }
    deleted++;
    continue;
  }

  const { min, max } = ageRangeFromName(row.name);
  if (min === (row.baby_age_min ?? 0) && (max ?? null) === (row.baby_age_max ?? null)) {
    unchanged++;
    continue;
  }

  console.log(`UPDATE  [${row.baby_age_min}–${row.baby_age_max}] → [${min}–${max}]  ${row.name}`);
  if (!dryRun) {
    const { error: e } = await supabase.from('activities')
      .update({ baby_age_min: min, baby_age_max: max })
      .eq('id', row.id);
    if (e) { console.error(`  ✗ ${e.message}`); continue; }
  }
  updated++;
}

console.log(`\n${dryRun ? '[dry-run] ' : ''}updated: ${updated}, deleted: ${deleted}, unchanged: ${unchanged}`);
