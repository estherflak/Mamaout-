/**
 * Vercel cron job — runs daily at 01:00 UTC (04:00 Israel).
 * Fetches baby/postpartum events from Tel Aviv-Yafo community centers on the
 * Coing platform and upserts into Supabase.
 */
import { scrapeCoing } from '../../scraper/sources/coing.js';
import { insertIfNew, translateNewRows } from '../../scraper/db.js';

// Must match vercel.json — the full Coing pagination takes ~163s.
export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const events = await scrapeCoing();

    let inserted = 0, skipped = 0, failed = 0;
    const newRows = [];
    for (const event of events) {
      if (!event.source_url) { skipped++; continue; }
      try {
        const result = await insertIfNew(event);
        if (result) { inserted++; newRows.push(result); } else { skipped++; }
      } catch (err) {
        console.error(`[cron] failed to upsert ${event.source_url}: ${err.message}`);
        failed++;
      }
    }

    // Translate the just-inserted rows now, so new listings never sit in Hebrew
    // until the next daily backfill. Bounded + best-effort — leftovers are still
    // caught by scraper/backfill-translations.js.
    const translated = await translateNewRows(newRows);

    const summary = { total: events.length, inserted, skipped, failed, translated };
    console.log('[cron] coing done', summary);
    return res.status(200).json(summary);
  } catch (err) {
    console.error('[cron] coing error:', err);
    return res.status(500).json({ error: err.message });
  }
}
