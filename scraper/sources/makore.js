/**
 * Makore — Israeli activities & classes marketplace.
 * Tries __NEXT_DATA__ JSON first, falls back to CSS selectors.
 * Paginates up to 3 pages per entry point; max 60 results total.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE = 'https://www.makore.co.il';

const ENTRY_POINTS = [
  '/browse/district/תל-אביב/category/ילדים-ומשפחה',
  '/browse/district/מרכז/category/ילדים-ומשפחה',
  '/browse/district/תל-אביב',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function toAbsolute(href) {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  return `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
}

function extractFromNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return [];

  try {
    const nextData = JSON.parse(match[1]);
    const pageProps = nextData?.props?.pageProps;
    const list =
      pageProps?.events ||
      pageProps?.activities ||
      pageProps?.items ||
      pageProps?.results ||
      [];

    return (Array.isArray(list) ? list : []).map(ev => ({
      name: (ev.title || ev.name || '').slice(0, 120),
      description: (ev.description || ev.summary || '').slice(0, 400),
      location: 'תל אביב',
      venue: ev.venue?.name || ev.location?.name || '',
      source_url: ev.url || ev.link || (ev.slug ? `${BASE}/${ev.slug}` : ''),
      source_name: 'Makore',
      raw_date: ev.startDate || ev.date || ev.dateString || '',
    })).filter(r => r.name && r.source_url);
  } catch {
    return [];
  }
}

function extractFromHtml(html) {
  const $ = cheerio.load(html);
  const results = [];
  const selectors = [
    'article.event-card', 'article.activity-card',
    '[class*="EventCard"]', '[class*="event-item"]', '[class*="activityItem"]',
  ];

  let $cards = $();
  for (const sel of selectors) {
    const found = $(sel);
    if (found.length > 0) { $cards = found; break; }
  }

  $cards.each((_, el) => {
    const $el = $(el);
    const name = (
      $el.find('h2, h3, [class*="title"]').first().text() || ''
    ).trim();
    if (!name || name.length < 3) return;

    const description = ($el.find('p, [class*="desc"]').first().text() || '').trim();
    const rawDate     = ($el.find('time, [class*="date"], [class*="when"]').first().text() || '').trim();
    const href        = $el.find('a[href]').first().attr('href') || '';
    const source_url  = toAbsolute(href);
    if (!source_url) return;

    results.push({
      name: name.slice(0, 120),
      description: description.slice(0, 400),
      location: 'תל אביב',
      venue: '',
      source_url,
      source_name: 'Makore',
      raw_date: rawDate,
    });
  });

  return results;
}

function getNextPageUrl(html, currentUrl) {
  const $ = cheerio.load(html);
  const next = $(
    'a[aria-label="הבא"], a[rel="next"], [class*="pagination"] a:last-child'
  ).first().attr('href');
  if (!next) return null;
  return toAbsolute(next) || null;
}

export async function scrapeMakore() {
  const allResults = [];
  const seen = new Set();

  for (const path of ENTRY_POINTS) {
    if (allResults.length >= 60) break;

    let pageUrl = `${BASE}${path}`;
    let pagesScraped = 0;

    while (pageUrl && pagesScraped < 3 && allResults.length < 60) {
      try {
        const { data: html } = await axios.get(pageUrl, { headers: HEADERS, timeout: 15000 });

        let results = extractFromNextData(html);
        if (results.length === 0) results = extractFromHtml(html);

        for (const r of results) {
          if (!r.source_url || seen.has(r.source_url)) continue;
          seen.add(r.source_url);
          allResults.push(r);
        }

        const nextUrl = getNextPageUrl(html, pageUrl);
        pageUrl = nextUrl !== pageUrl ? nextUrl : null;
        pagesScraped++;
      } catch (err) {
        console.warn(`[makore] ${pageUrl} failed: ${err.message}`);
        break;
      }

      await sleep(1500);
    }
  }

  console.log(`[makore] ${allResults.length} results`);
  return allResults;
}
