/**
 * Ramat Gan Municipality — culture & education events.
 * Static HTML; no Puppeteer needed.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE = 'https://www.ramat-gan.muni.il';

const ENTRY_POINTS = [
  '/department-education',
  '/residents/culture-and-leisure',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9',
};

const KEYWORD_PATTERN = /תינוק|תינוקות|ילד|ילדים|אמא|אמהות|פעוט|קטנטן|לידה|התפתחות/;

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
    const list = pageProps?.events || pageProps?.activities || pageProps?.items || [];
    return (Array.isArray(list) ? list : []).map(ev => ({
      name: (ev.title || ev.name || '').slice(0, 120),
      description: (ev.description || ev.summary || '').slice(0, 400),
      location: 'רמת גן',
      venue: ev.venue?.name || ev.location?.name || '',
      source_url: ev.url || ev.link || (ev.slug ? `${BASE}/${ev.slug}` : ''),
      source_name: 'Ramat Gan Municipality',
      raw_date: ev.startDate || ev.date || '',
    })).filter(r => r.name && r.source_url);
  } catch {
    return [];
  }
}

function extractFromHtml(html, pageUrl) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();

  // Strategy 1: CSS selectors
  const selectors = ['.event-item', '.activity-card', '[class*="event"]', 'article'];
  let $cards = $();
  for (const sel of selectors) {
    const found = $(sel);
    if (found.length > 0) { $cards = found; break; }
  }

  $cards.each((_, el) => {
    const $el = $(el);
    const name = ($el.find('h2, h3, h4, [class*="title"]').first().text() || '').trim();
    if (!name || name.length < 4) return;
    const description = ($el.find('p, [class*="desc"]').first().text() || '').trim();
    const rawDate     = ($el.find('time, [class*="date"]').first().text() || '').trim();
    const href        = $el.find('a[href]').first().attr('href') || '';
    const url         = toAbsolute(href) || pageUrl;
    if (seen.has(url)) return;
    seen.add(url);
    results.push({ name: name.slice(0, 120), description: description.slice(0, 400), location: 'רמת גן', venue: '', source_url: url, source_name: 'Ramat Gan Municipality', raw_date: rawDate });
  });

  if (results.length > 0) return results;

  // Strategy 2: keyword-matched links (last resort, capped at 20)
  let count = 0;
  $('a[href]').each((_, el) => {
    if (count >= 20) return false;
    const $a = $(el);
    const text = $a.text().trim();
    const href = $a.attr('href') || '';
    if (!text || text.length < 10) return;
    if (!KEYWORD_PATTERN.test(text)) return;
    const url = toAbsolute(href);
    if (!url || seen.has(url)) return;
    seen.add(url);
    count++;
    results.push({ name: text.slice(0, 120), description: '', location: 'רמת גן', venue: '', source_url: url, source_name: 'Ramat Gan Municipality', raw_date: '' });
  });

  return results;
}

export async function scrapeRamatGanMuni() {
  const allResults = [];
  const seen = new Set();

  for (const path of ENTRY_POINTS) {
    const pageUrl = `${BASE}${path}`;
    try {
      const { data: html } = await axios.get(pageUrl, { headers: HEADERS, timeout: 15000 });
      let results = extractFromNextData(html);
      if (results.length === 0) results = extractFromHtml(html, pageUrl);
      for (const r of results) {
        if (!r.source_url || seen.has(r.source_url)) continue;
        seen.add(r.source_url);
        allResults.push(r);
      }
    } catch (err) {
      console.warn(`[ramat-gan-muni] ${pageUrl} failed: ${err.message}`);
    }
    await sleep(2000);
  }

  console.log(`[ramat-gan-muni] ${allResults.length} results`);
  return allResults;
}
