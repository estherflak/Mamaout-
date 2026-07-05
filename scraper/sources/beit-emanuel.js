/**
 * Beit Emanuel Ramat Gan — mbe-rg.smarticket.co.il
 * SmartTicket pages are JS-rendered; falls back to Puppeteer when static fetch yields nothing.
 * A single browser is launched once and reused across all seed pages.
 * All events marked is_verified: true.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE = 'https://mbe-rg.smarticket.co.il';

const SEED_PATHS = [
  '/',
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

// SmartTicket activity pages carry the class name in the URL slug
// (e.g. /דאנס_בייבי-_ריקוד_מנשאים_עם_ליטל_ממן_6427/) — far cleaner than the
// anchor text, which is a date prefix. Decode, de-underscore, and drop the
// opaque id token SmartTicket appends to some slugs.
function nameFromSlug(url) {
  let s = url.replace(BASE, '').replace(/^\/+|\/+$/g, '');
  try { s = decodeURIComponent(s); } catch { /* keep raw */ }
  return s
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+[0-9a-f]{4,}$/i, '') // trailing SmartTicket id hash
    .trim();
}

function parseEvents(html) {
  const $ = cheerio.load(html);
  const events = [];
  const seen = new Set();

  // Strategy 1: extract Next.js __NEXT_DATA__ JSON (SmartTicket uses Next.js)
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(\{.*?\})<\/script>/s);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const pageProps = nextData?.props?.pageProps;
      const eventsList = pageProps?.events || pageProps?.activities || pageProps?.items || [];
      for (const ev of eventsList) {
        const name = ev.title || ev.name || ev.displayName || '';
        if (!name) continue;
        const url = ev.url || ev.link || ev.slug
          ? `${BASE}/${ev.slug}` : `${BASE}#${encodeURIComponent(name)}`;
        events.push({
          name: name.slice(0, 120),
          description: (ev.description || ev.summary || '').slice(0, 400),
          location: 'מרכז קהילתי בית עמנואל, רמת גן',
          venue: 'מרכז קהילתי בית עמנואל',
          source_url: url,
          source_name: 'Beit Emanuel Ramat Gan',
          raw_date: ev.startDate || ev.date || '',
        });
      }
      if (events.length > 0) {
        console.log(`[beit-emanuel] Extracted ${events.length} events from __NEXT_DATA__`);
        return events;
      }
    } catch (e) {
      console.warn('[beit-emanuel] __NEXT_DATA__ parse failed:', e.message);
    }
  }

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

  // Fallback: a real SmartTicket listing link carries a ?id=<number> query
  // param (the session/product id). That single signal separates genuine
  // activities from page chrome — nav menus, accessibility toggles, language
  // switchers, _page_N category links, and social/footer links never have it.
  // The DOM-order anchor sweep this replaced front-loaded the header chrome and
  // hit its cap before reaching the events further down the page.
  //
  // The same class appears as many ?id links (one per session/date), so we key
  // on the slug (url without the query) to emit one row per class — preventing
  // the per-session row explosion that beit-emanuel-rg.js already guards against.
  if (events.length === 0) {
    const byClass = new Map(); // slug → event
    $('a[href]').each((_, el) => {
      if (byClass.size >= 200) return false; // sanity bound; stop iterating
      const href = $(el).attr('href') || '';
      if (!/[?&]id=\d+/.test(href)) return; // not a real listing → skip chrome
      const url = toAbsolute(href);
      if (!url.startsWith(BASE)) return;

      const slug = url.split('?')[0]; // collapse recurring sessions by class
      if (byClass.has(slug)) return;

      const name = nameFromSlug(slug); // name lives in the slug, not the date text
      if (name.length < 3) return;

      byClass.set(slug, {
        name: name.slice(0, 120),
        description: '',
        location: 'מרכז קהילתי בית עמנואל, רמת גן',
        venue: 'מרכז קהילתי בית עמנואל',
        source_url: slug, // stable per-class url (no session id) → dedup-friendly
        source_name: 'Beit Emanuel Ramat Gan',
        raw_date: '',
      });
    });
    events.push(...byClass.values());
  }

  return events;
}

async function scrapeWithFetch(url) {
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 12000 });
  return parseEvents(data);
}

export async function scrapeBeitEmanuel() {
  const allResults = [];
  let browser = null;

  for (const path of SEED_PATHS) {
    const url = `${BASE}${path.startsWith('/') ? '' : '/'}${path}`;
    console.log(`[beit-emanuel] Scraping: ${url}`);

    // Try static fetch first (fast)
    let events = [];
    try {
      events = await scrapeWithFetch(url);
      console.log(`[beit-emanuel]   static → ${events.length} events`);
    } catch (err) {
      console.warn(`[beit-emanuel]   static fetch failed: ${err.message}`);
    }

    // Puppeteer fallback — launch browser once, reuse across pages
    if (events.length === 0) {
      try {
        if (!browser) {
          console.log(`[beit-emanuel]   launching Puppeteer…`);
          const puppeteer = (await import('puppeteer')).default;
          browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
          });
        }

        const page = await browser.newPage();
        await page.setUserAgent(HEADERS['User-Agent']);
        // domcontentloaded is much faster than networkidle2 — doesn't wait for all XHR
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        // Wait for SmartTicket JS to load event cards
        await sleep(5000);
        const html = await page.content();
        await page.close();

        events = parseEvents(html);
        console.log(`[beit-emanuel]   puppeteer → ${events.length} events`);
      } catch (err) {
        console.warn(`[beit-emanuel]   Puppeteer failed: ${err.message}`);
      }
    }

    allResults.push(...events);
    await sleep(1500);
  }

  if (browser) {
    await browser.close().catch(() => {});
  }

  // Ra'agim gymboree self pages (open play / services) are a Place, not
  // activities — same rule as sources/beit-emanuel-rg.js.
  const GYMBOREE_SELF = [/משחקיי?ה התפתחותית/, /יעוץ פרטני/, /^גילאי לידה עד שנה$/];

  const seen = new Set();
  return allResults.filter(r => {
    if (!r.source_url || seen.has(r.source_url)) return false;
    if (GYMBOREE_SELF.some(re => re.test((r.name || '').trim()))) return false;
    seen.add(r.source_url);
    return true;
  });
}
