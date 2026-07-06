/**
 * Vercel cron job — runs daily at 01:30 UTC (04:30 Israel).
 * Fetches "Mommy & Me" ceramics workshops from the ClaylaTLV studio
 * (Wix Stores) and upserts into Supabase.
 */
import { scrapeClaylaTLV } from '../../scraper/sources/claylatlv.js';
import { insertIfNew } from '../../scraper/db.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const events = await scrapeClaylaTLV();

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
    console.log('[cron] claylatlv done', summary);
    return res.status(200).json(summary);
  } catch (err) {
    console.error('[cron] claylatlv error:', err);
    return res.status(500).json({ error: err.message });
  }
}
