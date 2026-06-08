/**
 * Secret Tel Aviv — event listings filtered for mama/baby content.
 * Tries axios first; falls back to Puppeteer if JS rendering is needed.
 * Max 40 results after keyword filtering.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const PAGE_URL = 'https://www.secrettelaviv.com/tickets';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
};

const BABY_MAMA_PATTERN = /תינוק|תינוקות|בייבי|baby|אמא|אמהות|פעוט|לידה|postpartum|postnatal|mom|newborn/i;

function toAbsolute(href, base = 'https://www.secrettelaviv.com') {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  return `${base}${href.startsWith('/') ? '' : '/'}${href}`;
}

function parseHtml(html) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();

  const selectors = [
    '.event-card', '.event-item', '[class*="EventCard"]',
    '[class*="event-listing"]', 'article',
  ];

  let $cards = $();
  for (const sel of selectors) {
    const found = $(sel);
    if (found.length > 0) { $cards = found; break; }
  }

  $cards.each((_, el) => {
    if (results.length >= 80) return false;
    const $el = $(el);

    const name = (
      $el.find('h2, h3, h4, [class*="title"]').first().text() || ''
    ).trim();
    if (!name || name.length < 4) return;

    const description = ($el.find('p, [class*="desc"]').first().text() || '').trim();
    const combined = `${name} ${description}`;
    if (!BABY_MAMA_PATTERN.test(combined)) return;

    const rawDate = ($el.find('time, [class*="date"], [class*="when"]').first().text() || '').trim();
    const href    = $el.find('a[href]').first().attr('href') || '';
    const url     = toAbsolute(href);
    if (!url || seen.has(url)) return;
    seen.add(url);

    results.push({
      name: name.slice(0, 120),
      description: description.slice(0, 400),
      location: 'תל אביב',
      venue: ($el.find('[class*="venue"], [class*="location"]').first().text() || '').trim().slice(0, 100),
      source_url: url,
      source_name: 'Secret Tel Aviv',
      raw_date: rawDate,
    });
  });

  // Fallback: keyword-matched links if no cards found
  if (results.length === 0) {
    $('a[href]').each((_, el) => {
      if (results.length >= 40) return false;
      const $a = $(el);
      const text = $a.text().trim();
      if (!text || text.length < 8) return;
      if (!BABY_MAMA_PATTERN.test(text)) return;
      const url = toAbsolute($a.attr('href') || '');
      if (!url || seen.has(url)) return;
      seen.add(url);
      results.push({
        name: text.slice(0, 120),
        description: '',
        location: 'תל אביב',
        venue: '',
        source_url: url,
        source_name: 'Secret Tel Aviv',
        raw_date: '',
      });
    });
  }

  return results.slice(0, 40);
}

async function fetchWithPuppeteer() {
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch {
    return null;
  }

  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent(HEADERS['User-Agent']);
    await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();
    return html;
  } catch (err) {
    console.warn(`[secrettelaviv] puppeteer failed: ${err.message}`);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

export async function scrapeSecretTelAviv() {
  let html = null;

  try {
    const { data } = await axios.get(PAGE_URL, { headers: HEADERS, timeout: 15000 });
    html = data;
  } catch (err) {
    console.warn(`[secrettelaviv] axios failed: ${err.message} — trying puppeteer`);
  }

  if (!html) {
    html = await fetchWithPuppeteer();
  }

  if (!html) {
    console.warn('[secrettelaviv] all fetch strategies failed');
    return [];
  }

  const results = parseHtml(html);
  console.log(`[secrettelaviv] ${results.length} results`);
  return results;
}
