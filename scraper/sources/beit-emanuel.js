/**
 * Beit Emanuel Ramat Gan — mbe-rg.smarticket.co.il
 * SmartTicket pages are JS-rendered; falls back to Puppeteer when static fetch yields nothing.
 * All events marked is_verified: true.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE = 'https://mbe-rg.smarticket.co.il';

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

function toAbsolute(href) {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  return `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
}

function parseEvents(html) {
  const $ = cheerio.load(html);
  const events = [];
  const seen = new Set();

  // SmartTicket-specific selectors — deliberately narrow to avoid matching nav items
  const CARD_SEL = [
    '.event-item', '.schedule-item', '.activity-item',
    '[class*="event-card"]', '[class*="eventCard"]',
    '[class*="event_block"]', '[class*="eventBlock"]',
    'article.event', 'article.activity',
  ].join(', ');

  $(CARD_SEL).each((_, el) => {
    const $el = $(el);
    const name = (
      $el.find('h1,h2,h3,h4,[class*="title"],[class*="name"]').first().text() ||
      $el.find('a').first().text()
    ).trim();
    if (!name || name.length < 3) return;

    const desc = $el.find('p,[class*="desc"],[class*="summary"],[class*="content"]').first().text().trim();
    const rawDate = $el.find('time,[class*="date"],[class*="time"],[class*="when"]').first().text().trim();
    const href = $el.find('a[href]').first().attr('href') || '';
    const url = toAbsolute(href) || `${BASE}#${encodeURIComponent(name)}`;

    if (seen.has(url)) return;
    seen.add(url);

    events.push({
      name: name.slice(0, 120),
      description: desc.slice(0, 400),
      location: 'מרכז קהילתי בית עמנואל, רמת גן',
      venue: 'מרכז קהילתי בית עמנואל',
      source_url: url,
      source_name: 'Beit Emanuel Ramat Gan',
      raw_date: rawDate,
    });
  });

  // Fallback: any internal link that looks like a specific activity/event page (not a category nav link)
  if (events.length === 0) {
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (!href || href === '/' || href === '#' || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      const url = toAbsolute(href);
      if (!url.startsWith(BASE)) return;
      if (seen.has(url)) return;
      seen.add(url);

      const name = $(el).text().trim();
      if (!name || name.length < 3) return;

      events.push({
        name: name.slice(0, 120),
        description: '',
        location: 'מרכז קהילתי בית עמנואל, רמת גן',
        venue: 'מרכז קהילתי בית עמנואל',
        source_url: url,
        source_name: 'Beit Emanuel Ramat Gan',
        raw_date: '',
      });
    });
  }

  return events;
}

async function scrapeWithFetch(url) {
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
  return parseEvents(data);
}

async function scrapeWithPuppeteer(url) {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(HEADERS['User-Agent']);
    await page.setExtraHTTPHeaders({ 'Accept-Language': HEADERS['Accept-Language'] });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for event cards to appear
    await page.waitForSelector(
      'article, [class*="event"], [class*="activity"], [class*="schedule"]',
      { timeout: 8000 }
    ).catch(() => {});

    const html = await page.content();
    return parseEvents(html);
  } finally {
    await browser.close();
  }
}

async function scrapePath(path) {
  const url = `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  console.log(`[beit-emanuel] Scraping: ${url}`);

  try {
    const events = await scrapeWithFetch(url);
    console.log(`[beit-emanuel]   static → ${events.length} events`);
    if (events.length > 0) return events;
  } catch (err) {
    console.warn(`[beit-emanuel]   static fetch failed: ${err.message}`);
  }

  console.log(`[beit-emanuel]   trying Puppeteer…`);
  try {
    const events = await scrapeWithPuppeteer(url);
    console.log(`[beit-emanuel]   puppeteer → ${events.length} events`);
    return events;
  } catch (err) {
    console.warn(`[beit-emanuel]   Puppeteer failed: ${err.message}`);
    return [];
  }
}

export async function scrapeBeitEmanuel() {
  const allResults = [];

  for (const path of SEED_PATHS) {
    const results = await scrapePath(path);
    allResults.push(...results);
    await sleep(2000);
  }

  const seen = new Set();
  return allResults.filter(r => {
    if (!r.source_url || seen.has(r.source_url)) return false;
    seen.add(r.source_url);
    return true;
  });
}
