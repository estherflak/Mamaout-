/**
 * Time Out Tel Aviv — family/kids and things-to-do sections.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const PAGES = [
  'https://www.timeout.com/israel/things-to-do/things-to-do-with-kids-in-tel-aviv',
  'https://www.timeout.com/israel/family',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function scrapeTimeout() {
  const results = [];

  for (const pageUrl of PAGES) {
    try {
      const { data } = await axios.get(pageUrl, { headers: HEADERS, timeout: 12000 });
      const $ = cheerio.load(data);

      // Time Out article/listing cards
      $('article, [class*="tile"], [class*="card"], li[class*="listing"]').each((_, el) => {
        const name = $(el).find('h2, h3, h4, [class*="title"]').first().text().trim();
        const description = $(el).find('p, [class*="description"], [class*="summary"]').first().text().trim();
        const linkEl = $(el).find('a[href]').first();
        const href = linkEl.attr('href') || '';

        if (!name || name.length < 5 || !href) return;

        const fullUrl = href.startsWith('http') ? href : `https://www.timeout.com${href}`;
        if (!fullUrl.includes('timeout.com')) return;

        results.push({
          name: name.slice(0, 120),
          description: description.slice(0, 400),
          location: 'Tel Aviv',
          source_url: fullUrl.split('?')[0],
          source_name: 'Time Out Tel Aviv',
        });
      });

      await sleep(2000);
    } catch (err) {
      console.warn(`[timeout] ${pageUrl} failed:`, err.message);
    }
  }

  return results;
}
