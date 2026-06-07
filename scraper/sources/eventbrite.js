/**
 * Eventbrite — scrapes HTML search pages and extracts event data from
 * __NEXT_DATA__ / window.__SERVER_DATA__ JSON embedded in the page.
 * The internal /api/v3/destination/search/ endpoint now returns 405.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const SEARCH_PAGES = [
  'https://www.eventbrite.com/d/israel--tel-aviv/baby-and-toddler/',
  'https://www.eventbrite.com/d/israel--tel-aviv/mom-and-baby/',
  'https://www.eventbrite.com/d/israel--tel-aviv/yoga-for-moms/',
  'https://www.eventbrite.com/d/israel--tel-aviv/postnatal/',
  'https://www.eventbrite.com/d/israel--ramat-gan/baby-class/',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.eventbrite.com/',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function extractFromNextData(html) {
  const results = [];

  // Eventbrite embeds all search results in __NEXT_DATA__ as a Next.js app
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return results;

  try {
    const nextData = JSON.parse(match[1]);
    // Events live at different paths depending on the page version
    const props = nextData?.props?.pageProps;
    const eventsList =
      props?.events ||
      props?.searchData?.events ||
      props?.initialData?.events?.results ||
      props?.dehydratedState?.queries?.[0]?.state?.data?.events ||
      [];

    for (const ev of (Array.isArray(eventsList) ? eventsList : [])) {
      const name = ev.name || ev.title || '';
      const description = ev.summary || ev.description || '';
      const venue = ev.venue?.name || ev.primaryVenue?.name || '';
      const city  = ev.venue?.address?.city || ev.primaryVenue?.address?.city || 'Tel Aviv';
      const href  = ev.url || ev.eventUrl || '';
      const latitude  = ev.venue?.latitude  ? parseFloat(ev.venue.latitude)  : null;
      const longitude = ev.venue?.longitude ? parseFloat(ev.venue.longitude) : null;

      if (!name || !href) continue;

      results.push({
        name: name.slice(0, 120),
        description: (typeof description === 'string' ? description : '').slice(0, 400),
        location: venue ? `${venue}, ${city}` : city,
        source_url: href.split('?')[0],
        source_name: 'Eventbrite',
        venue,
        raw_date: ev.startDate || ev.start?.local || '',
        latitude,
        longitude,
      });
    }
  } catch (err) {
    // JSON parse failed — fall through to HTML extraction
  }

  return results;
}

function extractFromHtml(html, pageUrl) {
  const $ = cheerio.load(html);
  const results = [];

  // Eventbrite search result cards
  $('[data-event-id], .eds-event-card, article[class*="event"], [class*="EventCard"]').each((_, el) => {
    const $el = $(el);
    const name = $el.find('h2, h3, [class*="title"], [class*="name"]').first().text().trim();
    const description = $el.find('p, [class*="description"], [class*="summary"]').first().text().trim();
    const href = $el.find('a[href]').first().attr('href') || '';

    if (!name || name.length < 5 || !href) return;
    const fullUrl = href.startsWith('http') ? href : `https://www.eventbrite.com${href}`;
    if (!fullUrl.includes('eventbrite.com')) return;

    results.push({
      name: name.slice(0, 120),
      description: description.slice(0, 400),
      location: 'Tel Aviv',
      source_url: fullUrl.split('?')[0],
      source_name: 'Eventbrite',
      venue: '',
      raw_date: '',
      latitude: null,
      longitude: null,
    });
  });

  return results;
}

async function fetchWithPuppeteer(pageUrl) {
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(HEADERS['User-Agent']);
    await page.setExtraHTTPHeaders({ 'Accept-Language': HEADERS['Accept-Language'] });
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(3000); // let JS hydrate
    return await page.content();
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function scrapeEventbrite() {
  const results = [];
  const seen = new Set();
  let puppeteerFailed = false;

  for (const pageUrl of SEARCH_PAGES) {
    let html = null;

    // Try plain HTTP first (fast); fall back to Puppeteer if blocked
    try {
      const { data } = await axios.get(pageUrl, { headers: HEADERS, timeout: 15000 });
      html = data;
    } catch (err) {
      if ((err.response?.status === 405 || err.response?.status === 403) && !puppeteerFailed) {
        console.log(`[eventbrite] ${pageUrl} blocked (${err.response.status}), trying Puppeteer…`);
        try {
          html = await fetchWithPuppeteer(pageUrl);
        } catch (pe) {
          console.warn(`[eventbrite] Puppeteer failed: ${pe.message}`);
          puppeteerFailed = true;
        }
      } else {
        console.warn(`[eventbrite] ${pageUrl} failed:`, err.message);
      }
    }

    if (!html) { await sleep(2000); continue; }

    let pageResults = extractFromNextData(html);
    if (pageResults.length === 0) pageResults = extractFromHtml(html, pageUrl);

    console.log(`[eventbrite] ${pageUrl} → ${pageResults.length} events`);

    for (const r of pageResults) {
      if (!seen.has(r.source_url)) {
        seen.add(r.source_url);
        results.push(r);
      }
    }

    await sleep(2000);
  }

  return results;
}
