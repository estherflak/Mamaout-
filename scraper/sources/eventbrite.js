/**
 * Eventbrite public search for baby+mom events in Israel.
 * Uses Eventbrite's search HTML endpoint — no API key required for public events.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const SEARCH_URLS = [
  'https://www.eventbrite.com/d/israel--tel-aviv/baby-yoga/',
  'https://www.eventbrite.com/d/israel--tel-aviv/baby-class/',
  'https://www.eventbrite.com/d/israel--tel-aviv/postnatal/',
  'https://www.eventbrite.com/d/israel--ramat-gan/baby/',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function scrapeEventbrite() {
  const results = [];

  for (const searchUrl of SEARCH_URLS) {
    try {
      const { data } = await axios.get(searchUrl, { headers: HEADERS, timeout: 12000 });
      const $ = cheerio.load(data);

      // Eventbrite event cards — selectors may need updating if Eventbrite changes markup
      $('article[data-testid="event-card"], .eds-event-card, [class*="event-card"]').each((_, el) => {
        const name = $(el).find('h2, h3, [class*="event-name"], [data-spec="event-name"]').first().text().trim();
        const description = $(el).find('p, [class*="summary"]').first().text().trim();
        const linkEl = $(el).find('a[href*="/e/"]').first();
        const href = linkEl.attr('href') || '';
        const location = $(el).find('[class*="location"], [data-spec="location"]').first().text().trim();

        if (!name || !href) return;

        const fullUrl = href.startsWith('http') ? href : `https://www.eventbrite.com${href}`;
        results.push({
          name: name.slice(0, 120),
          description: description.slice(0, 400),
          location: location || 'Tel Aviv area',
          source_url: fullUrl.split('?')[0], // strip tracking params
          source_name: 'Eventbrite',
        });
      });

      await sleep(2500);
    } catch (err) {
      console.warn(`[eventbrite] ${searchUrl} failed:`, err.message);
    }
  }

  return results;
}
