/**
 * Cron scheduler — runs the scraper once every 24 hours.
 *   node scraper/scheduler.js
 */
import 'dotenv/config';
import cron from 'node-cron';
import { runScrape } from './index.js';

// Every day at 03:00 Israel time (UTC+3), well outside peak hours
const SCHEDULE = '0 3 * * *';

console.log(`[scheduler] MamaOut scraper scheduler starting…`);
console.log(`[scheduler] Will run daily at 03:00 (schedule: ${SCHEDULE})`);

// Run once immediately on startup so you don't have to wait 24 hours
console.log(`[scheduler] Running initial scrape now…`);
runScrape().catch(err => console.error('[scheduler] Initial scrape error:', err.message));

// Schedule subsequent runs
cron.schedule(SCHEDULE, () => {
  console.log(`\n[scheduler] Triggered scheduled scrape — ${new Date().toISOString()}`);
  runScrape().catch(err => console.error('[scheduler] Scheduled scrape error:', err.message));
}, {
  timezone: 'Asia/Jerusalem',
});

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('[scheduler] SIGTERM received, shutting down gracefully');
  process.exit(0);
});
