/**
 * Mommy Jogger — postpartum running groups & fitness sessions.
 * Single static page; axios + cheerio only.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const PAGE_URL = 'https://www.mommy-jogger.com';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
};

const ACTIVITY_KEYWORDS = ['אימון', 'מפגש', 'סדנה', 'קבוצה', 'שיעור'];

function toAbsolute(href, base = PAGE_URL) {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  return `${base}${href.startsWith('/') ? '' : '/'}${href}`;
}

export async function scrapeMommyJogger() {
  let html;
  try {
    const { data } = await axios.get(PAGE_URL, { headers: HEADERS, timeout: 12000 });
    html = data;
  } catch (err) {
    console.warn(`[mommy-jogger] fetch failed: ${err.message}`);
    return [];
  }

  const $ = cheerio.load(html);
  const results = [];

  // Strategy 1: structural selectors
  const selectors = ['.event', '.session', '.schedule', 'article', 'section'];
  let $items = $();
  for (const sel of selectors) {
    const found = $(sel).filter((_, el) => $(el).text().trim().length > 20);
    if (found.length > 0) { $items = found; break; }
  }

  // Strategy 2: elements containing activity keywords
  if ($items.length === 0) {
    $items = $('p, li, div').filter((_, el) => {
      const text = $(el).text();
      return ACTIVITY_KEYWORDS.some(kw => text.includes(kw));
    });
  }

  $items.each((i, el) => {
    if (results.length >= 15) return false;
    const $el = $(el);

    const name = (
      $el.find('h2, h3, strong').first().text() ||
      $el.text().trim().split('\n')[0]
    ).trim().slice(0, 80);

    if (!name || name.length < 4) return;

    const description = $el.find('p').first().text().trim().slice(0, 300);
    const rawDate     = $el.find('time, [class*="date"], [class*="time"]').first().text().trim();
    const href        = $el.find('a[href]').first().attr('href') || '';
    const source_url  = toAbsolute(href);

    // Single-page site: skip sections with no real link (headings, testimonials).
    // Synthesizing `${PAGE_URL}#i` URLs turned page fragments into fake activities.
    if (!source_url || source_url.includes('#')) return;

    const venueEl = $el.find('[class*="address"], [class*="location"], address').first();
    const venue   = venueEl.text().trim().slice(0, 100);

    results.push({
      name,
      description,
      location: 'תל אביב',
      venue,
      source_url,
      source_name: 'Mommy Jogger',
      raw_date: rawDate,
      language: 'en',
    });
  });

  console.log(`[mommy-jogger] ${results.length} results`);
  return results;
}
