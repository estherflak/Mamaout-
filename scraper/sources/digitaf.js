/**
 * Tel Aviv Municipality — Digitaf family events
 * https://www.tel-aviv.gov.il/Visitors/Events/Pages/DigitafEvents.aspx?Iccid=253,263
 *
 * Tries fetch + Cheerio first (faster). Falls back to Puppeteer
 * if the page returns fewer than 3 events (JS-rendered content).
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

// Tel Aviv municipality reshuffles their SharePoint URLs regularly.
// Try each in order; first one that returns usable events wins.
const CANDIDATE_URLS = [
  'https://www.tel-aviv.gov.il/Residents/Culture/Pages/DigitafEvents.aspx',
  'https://www.tel-aviv.gov.il/residents/Culture/Pages/DigitafEvents.aspx',
  'https://www.tel-aviv.gov.il/Visitors/Events/Pages/DigitafEvents.aspx?Iccid=253,263',
  'https://www.tel-aviv.gov.il/en/residents/Culture-Sport-Events/Events/Pages/Events.aspx',
  'https://www.tel-aviv.gov.il/residents/Culture-Sport-Events/Events/Pages/Events.aspx',
];
// Fallback: URL used during runtime (set to first candidate initially)
let URL = CANDIDATE_URLS[0];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
};

function parseEvents(html) {
  const $ = cheerio.load(html);
  const events = [];

  // Try JSON-LD structured data first (most reliable)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (!item['@type']?.includes('Event') && item['@type'] !== 'Event') continue;
        const name = item.name || '';
        const description = item.description || '';
        const loc = item.location?.name || item.location?.address?.streetAddress || '';
        const startDate = item.startDate || '';
        const url = item.url || item['@id'] || URL;
        if (!name) continue;
        events.push({
          name: name.slice(0, 120),
          description: description.slice(0, 400),
          location: loc || 'תל אביב-יפו',
          venue: loc || '',
          source_url: url,
          source_name: 'Tel Aviv Municipality',
          raw_date: startDate,
        });
      }
    } catch { /* ignore parse errors */ }
  });

  if (events.length > 0) return events;

  // Tel Aviv municipality SharePoint events — try multiple selectors
  const selectors = [
    '.event-item', '.ms-listviewtable tr', '[class*="event"]',
    '.digitaf-event', '[class*="EventItem"]', '[class*="eventItem"]',
    'article', '.card', 'li[class*="item"]',
  ];

  let $cards = $();
  for (const sel of selectors) {
    const found = $(sel);
    if (found.length > 1) { $cards = found; break; }
  }

  if ($cards.length === 0) {
    // Last resort: look for any linked content blocks with Hebrew text
    $('a[href]').each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href') || '';
      const text = $a.text().trim();
      if (!text || text.length < 5) return;
      // Only follow links on the same domain that look like event detail pages
      if (!href.includes('tel-aviv.gov.il') && !href.startsWith('/')) return;
      if (href.includes('Pages/') && !href.includes('DigitafEvents')) {
        const fullUrl = href.startsWith('http') ? href : `https://www.tel-aviv.gov.il${href}`;
        events.push({
          name: text.slice(0, 120),
          description: $a.closest('[class]').find('p').first().text().trim().slice(0, 400),
          location: 'תל אביב-יפו',
          venue: '',
          source_url: fullUrl,
          source_name: 'Tel Aviv Municipality',
          raw_date: '',
        });
      }
    });
    return events;
  }

  $cards.each((_, el) => {
    const $el = $(el);
    if ($el.find('a').length === 0) return;

    const title = (
      $el.find('h2,h3,h4,[class*="title"],[class*="name"]').first().text() ||
      $el.find('a').first().text()
    ).trim();
    if (!title || title.length < 3) return;

    const desc = $el.find('p,[class*="description"],[class*="summary"]').first().text().trim();
    const rawDate = $el.find('time,[class*="date"],[class*="time"]').first().text().trim();
    const venue = $el.find('[class*="venue"],[class*="location"],[class*="place"]').first().text().trim();

    const href = $el.find('a[href]').first().attr('href') || '';
    const fullUrl = href.startsWith('http')
      ? href
      : href ? `https://www.tel-aviv.gov.il${href}` : URL;

    events.push({
      name: title.slice(0, 120),
      description: desc.slice(0, 400),
      location: venue || 'תל אביב-יפו',
      venue: venue || '',
      source_url: fullUrl,
      source_name: 'Tel Aviv Municipality',
      raw_date: rawDate,
    });
  });

  return events;
}

async function scrapeWithFetch() {
  const { data } = await axios.get(URL, { headers: HEADERS, timeout: 15000 });
  return parseEvents(data);
}

async function scrapeWithPuppeteer() {
  // Dynamic import so Puppeteer is only loaded when needed
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
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for event content to appear
    await page.waitForSelector(
      'article, [class*="event"], .card, [class*="EventItem"]',
      { timeout: 8000 }
    ).catch(() => {}); // don't throw if selector not found

    const html = await page.content();
    return parseEvents(html);
  } finally {
    await browser.close();
  }
}

export async function scrapeDigitaf() {
  // Try each candidate URL with static fetch first
  for (const candidateUrl of CANDIDATE_URLS) {
    URL = candidateUrl; // update module-level URL so scrapeWithFetch/Puppeteer use it
    try {
      const results = await scrapeWithFetch();
      if (results.length >= 3) {
        console.log(`[digitaf] Got ${results.length} events from ${candidateUrl}`);
        return results;
      }
      if (results.length > 0) {
        console.log(`[digitaf] ${candidateUrl} → ${results.length} events (trying more)`);
      }
    } catch (err) {
      console.warn(`[digitaf] ${candidateUrl} failed: ${err.message}`);
    }
  }

  // Last resort: Puppeteer on the first candidate
  URL = CANDIDATE_URLS[0];
  try {
    const results = await scrapeWithPuppeteer();
    console.log(`[digitaf] Puppeteer got ${results.length} events`);
    return results;
  } catch (err) {
    console.warn(`[digitaf] Puppeteer also failed:`, err.message);
    return [];
  }
}
