/**
 * Beit Emanuel Ramat Gan — mbe-rg.smarticket.co.il
 * Scrapes three category pages plus their paginated continuations.
 * All events marked is_verified: true.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE = 'https://mbe-rg.smarticket.co.il';

// Category pages to seed from
const SEED_PATHS = [
  '/רמתגנצ_יק_page_47',
  '/ר_געים_משחקייה_התפתחותית',
  '/שבת_משפחה_קהילה_page_34',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
  'Referer': BASE,
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function extractEvents($, pageUrl) {
  const events = [];

  // SmartTicket uses a list/grid of event cards — try several selector strategies
  const cardSelectors = [
    '.event-item', '.schedule-item', '.activity-item',
    '[class*="event-card"]', '[class*="eventCard"]',
    '[class*="activity"]', '[class*="item"]',
    'article', 'li.item',
  ];

  let $cards = $();
  for (const sel of cardSelectors) {
    const found = $(sel);
    if (found.length > 0) { $cards = found; break; }
  }

  // Fallback: any <a> tags that point to event detail pages on the same domain
  if ($cards.length === 0) {
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const fullHref = href.startsWith('http') ? href : `${BASE}${href}`;
      if (!fullHref.startsWith(BASE)) return;
      if (href === '/' || href === '' || href === pageUrl) return;

      const title = $(el).text().trim();
      if (!title || title.length < 3) return;

      events.push({
        name: title.slice(0, 120),
        description: '',
        location: 'מרכז קהילתי בית עמנואל, רמת גן',
        venue: 'מרכז קהילתי בית עמנואל',
        source_url: fullHref,
        source_name: 'Beit Emanuel Ramat Gan',
        raw_date: '',
      });
    });
    return events;
  }

  $cards.each((_, el) => {
    const $el = $(el);

    // Title
    const title = (
      $el.find('h1,h2,h3,h4,[class*="title"],[class*="name"]').first().text() ||
      $el.find('a').first().text()
    ).trim();
    if (!title || title.length < 3) return;

    // Description
    const desc = $el.find('p,[class*="description"],[class*="summary"],[class*="details"],[class*="content"]')
      .first().text().trim();

    // Date / time
    const rawDate = $el.find(
      'time,[class*="date"],[class*="time"],[class*="when"],[data-date],[datetime]'
    ).first().text().trim();

    // Venue
    const venue = $el.find('[class*="venue"],[class*="location"],[class*="place"],[class*="address"]')
      .first().text().trim();

    // Link
    const href = $el.find('a[href]').first().attr('href') || '';
    const fullUrl = href.startsWith('http') ? href : href ? `${BASE}${href}` : '';

    events.push({
      name: title.slice(0, 120),
      description: desc.slice(0, 400),
      location: venue || 'מרכז קהילתי בית עמנואל, רמת גן',
      venue: venue || 'מרכז קהילתי בית עמנואל',
      source_url: fullUrl || `${BASE}${pageUrl}#${encodeURIComponent(title)}`,
      source_name: 'Beit Emanuel Ramat Gan',
      raw_date: rawDate,
    });
  });

  return events;
}

/** Find pagination links on the current page, return unique paths not yet visited */
function findNextPages($, visitedPaths) {
  const paths = new Set();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    // SmartTicket pagination: paths ending in _page_N or containing sub_page
    if (/_page_\d+/.test(href) || /sub_page_\d+/.test(href) || /[?&]page=\d+/.test(href)) {
      const path = href.startsWith('http') ? new URL(href).pathname + new URL(href).search : href;
      if (!visitedPaths.has(path)) paths.add(path);
    }
  });

  return [...paths];
}

async function scrapeCategoryPath(seedPath) {
  const results = [];
  const visited = new Set();
  const queue = [seedPath];
  const MAX_PAGES = 10;

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const path = queue.shift();
    if (visited.has(path)) continue;
    visited.add(path);

    const url = `${BASE}${path}`;
    try {
      const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const $ = cheerio.load(data);

      const pageEvents = extractEvents($, path);
      console.log(`[beit-emanuel]   ${url} → ${pageEvents.length} events`);
      results.push(...pageEvents);

      const nextPages = findNextPages($, visited);
      queue.push(...nextPages);

      await sleep(1500);
    } catch (err) {
      console.warn(`[beit-emanuel] ${url} failed:`, err.message);
    }
  }

  return results;
}

export async function scrapeBeitEmanuel() {
  const allResults = [];

  for (const path of SEED_PATHS) {
    console.log(`[beit-emanuel] Scraping category: ${path}`);
    try {
      const results = await scrapeCategoryPath(path);
      allResults.push(...results);
    } catch (err) {
      console.warn(`[beit-emanuel] Category ${path} failed:`, err.message);
    }
    await sleep(2000);
  }

  // Deduplicate within source by source_url
  const seen = new Set();
  return allResults.filter(r => {
    if (seen.has(r.source_url)) return false;
    seen.add(r.source_url);
    return true;
  });
}
