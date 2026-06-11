/**
 * Vercel cron job — runs daily at 06:00 Israel time (03:00 UTC).
 * Fetches Ramat Gan kids events and upserts into Supabase.
 *
 * Triggered by vercel.json crons config.
 * Protected by CRON_SECRET env var.
 */
import { scrapeRamatGanMuni } from '../../scraper/sources/ramat-gan-muni.js';
import { insertIfNew } from '../../scraper/db.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  // Verify Vercel cron secret
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const events = await scrapeRamatGanMuni();

    let inserted = 0, skipped = 0, failed = 0;
    for (const event of events) {
      if (!event.source_url) { skipped++; continue; }
      try {
        const result = await insertIfNew(event);
        result ? inserted++ : skipped++;
      } catch (err) {
        console.error(`[cron] failed to upsert ${event.source_url}: ${err.message}`);
        failed++;
      }
    }

    const summary = { total: events.length, inserted, skipped, failed };
    console.log('[cron] ramat-gan done', summary);
    return res.status(200).json(summary);
  } catch (err) {
    console.error('[cron] ramat-gan error:', err);
    return res.status(500).json({ error: err.message });
  }
}
