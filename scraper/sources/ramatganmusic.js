/**
 * Ramat Gan Conservatory — babies & toddlers classes.
 * Single static page; axios + cheerio only.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const PAGE_URL = 'https://www.ramatganmusic.com/babies';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
};

function toAbsolute(href, base = 'https://www.ramatganmusic.com') {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  return `${base}${href.startsWith('/') ? '' : '/'}${href}`;
}

export async function scrapeRamatGanMusic() {
  let html;
  try {
    const { data } = await axios.get(PAGE_URL, { headers: HEADERS, timeout: 12000 });
    html = data;
  } catch (err) {
    console.warn(`[ramatganmusic] fetch failed: ${err.message}`);
    return [];
  }

  const $ = cheerio.load(html);
  const results = [];

  const selectors = ['.class-item', '.course-item', '.schedule-item', 'article', 'li'];
  let $items = $();
  for (const sel of selectors) {
    const found = $(sel).filter((_, el) => $(el).text().trim().length > 20);
    if (found.length > 0) { $items = found; break; }
  }

  $items.each((i, el) => {
    if (results.length >= 20) return false;
    const $el = $(el);

    const name = (
      $el.find('h2, h3, strong').first().text() ||
      $el.text().trim().split('\n')[0]
    ).trim().slice(0, 80);

    if (!name || name.length < 4) return;

    const description = $el.find('p').first().text().trim().slice(0, 300);
    const rawDate     = $el.find('time, [class*="date"], [class*="time"]').first().text().trim();
    const href        = $el.find('a[href]').first().attr('href') || '';
    const source_url  = toAbsolute(href) || `${PAGE_URL}#${i}`;

    results.push({
      name,
      description,
      location: 'רמת גן',
      venue: 'קונסרבטוריון רמת גן',
      source_url,
      source_name: 'Ramat Gan Conservatory',
      raw_date: rawDate,
    });
  });

  console.log(`[ramatganmusic] ${results.length} results`);
  return results;
}
