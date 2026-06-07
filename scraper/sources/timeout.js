/**
 * Time Out Israel — family/kids section.
 * timeout.com moved all Tel Aviv content to /israel/ path.
 * Tries JSON-LD structured data first, then CSS card selectors.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

// Verified working as of 2025 — all under /israel/ not /tel-aviv/
const PAGES = [
  'https://www.timeout.com/israel/things-to-do/family-friendly-things-to-do-in-tel-aviv',
  'https://www.timeout.com/israel/kids',
  'https://www.timeout.com/israel/things-to-do/things-to-do-with-kids-in-israel',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function parsePage(html, pageUrl) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();

  // Try JSON-LD first
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const type = item['@type'];
        if (!['Event', 'Place', 'TouristAttraction', 'EntertainmentBusiness'].includes(type)) continue;
        const name = item.name || '';
        const description = item.description || '';
        const url = item.url || item['@id'] || pageUrl;
        if (!name || seen.has(url)) continue;
        seen.add(url);
        results.push({
          name: name.slice(0, 120),
          description: description.slice(0, 400),
          location: 'Tel Aviv',
          source_url: url.split('?')[0],
          source_name: 'Time Out Israel',
          venue: '',
          raw_date: item.startDate || '',
        });
      }
    } catch { /* ignore */ }
  });

  if (results.length > 0) return results;

  // CSS fallback
  $('article, [class*="tile"], [class*="card"], li[class*="listing"], [class*="Tile"]').each((_, el) => {
    const name = $(el).find('h2, h3, h4, [class*="title"], [class*="Title"]').first().text().trim();
    const description = $(el).find('p, [class*="description"], [class*="summary"]').first().text().trim();
    const href = $(el).find('a[href]').first().attr('href') || '';

    if (!name || name.length < 5 || !href) return;

    const fullUrl = href.startsWith('http') ? href : `https://www.timeout.com${href}`;
    if (!fullUrl.includes('timeout.com')) return;
    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);

    results.push({
      name: name.slice(0, 120),
      description: description.slice(0, 400),
      location: 'Tel Aviv',
      source_url: fullUrl.split('?')[0],
      source_name: 'Time Out Israel',
      venue: '',
      raw_date: '',
    });
  });

  return results;
}

export async function scrapeTimeout() {
  for (const pageUrl of PAGES) {
    try {
      const { data } = await axios.get(pageUrl, { headers: HEADERS, timeout: 15000 });
      const results = parsePage(data, pageUrl);
      if (results.length >= 3) {
        console.log(`[timeout] Got ${results.length} results from ${pageUrl}`);
        return results;
      }
      console.log(`[timeout] ${pageUrl} → ${results.length} results, trying next…`);
    } catch (err) {
      console.warn(`[timeout] ${pageUrl} failed:`, err.message);
    }
    await sleep(2000);
  }
  return [];
}
