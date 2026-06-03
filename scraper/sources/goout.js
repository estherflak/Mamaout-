/**
 * GoOut Israel — local activities and classes search.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const SEARCH_QUERIES = [
  { q: 'תינוק', city: 'תל-אביב' },
  { q: 'אמא ותינוק', city: 'תל-אביב' },
  { q: 'יוגה תינוק', city: 'תל-אביב' },
  { q: 'תינוק', city: 'רמת-גן' },
];

const BASE = 'https://goout.co.il';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function scrapeGoOut() {
  const results = [];

  for (const { q, city } of SEARCH_QUERIES) {
    try {
      const url = `${BASE}/search?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}`;
      const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
      const $ = cheerio.load(data);

      // GoOut event/class listing cards
      $('[class*="event"], [class*="activity"], [class*="card"], article').each((_, el) => {
        const name = $(el).find('h2, h3, h4, [class*="title"], [class*="name"]').first().text().trim();
        const description = $(el).find('p, [class*="description"], [class*="excerpt"]').first().text().trim();
        const linkEl = $(el).find('a[href]').first();
        const href = linkEl.attr('href') || '';
        const locationEl = $(el).find('[class*="location"], [class*="address"]').first().text().trim();

        if (!name || name.length < 4 || !href) return;

        const fullUrl = href.startsWith('http') ? href : `${BASE}${href}`;
        results.push({
          name: name.slice(0, 120),
          description: description.slice(0, 400),
          location: locationEl || city,
          source_url: fullUrl.split('?')[0],
          source_name: 'GoOut',
        });
      });

      await sleep(1500);
    } catch (err) {
      console.warn(`[goout] query "${q}" failed:`, err.message);
    }
  }

  return results;
}
