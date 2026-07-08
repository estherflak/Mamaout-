/**
 * Vercel cron job — runs daily at 02:00 UTC (05:00 Israel).
 * Fetches mom & baby classes from Arbox-based studios and upserts into Supabase.
 */
import { scrapeArbox } from '../../scraper/sources/arbox.js';
import { insertIfNew, translateNewRows } from '../../scraper/db.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const events = await scrapeArbox();

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
    console.log('[cron] arbox done', summary);
    return res.status(200).json(summary);
  } catch (err) {
    console.error('[cron] arbox error:', err);
    return res.status(500).json({ error: err.message });
  }
}
