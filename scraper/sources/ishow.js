/**
 * iShow — Israeli ticketing & kids events.
 * Requires Puppeteer (bot detection + lazy loading).
 * Scrolls to bottom to trigger lazy load; skips cards for age 3+.
 * Max 50 results.
 */

const PAGE_URL = 'https://ishow.co.il/kids?district=tlv';

const AGE_EXCLUDE = /מגיל\s*[3-9]/;

function toAbsolute(href, base = 'https://ishow.co.il') {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  return `${base}${href.startsWith('/') ? '' : '/'}${href}`;
}

async function scrollToBottom(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let lastH = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, 600);
        const h = document.body.scrollHeight;
        if (h === lastH) { clearInterval(timer); resolve(); }
        lastH = h;
      }, 400);
      setTimeout(() => { clearInterval(timer); resolve(); }, 12000);
    });
  });
}

export async function scrapeIshow() {
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch {
    console.warn('[ishow] puppeteer not available');
    return [];
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'he-IL,he;q=0.9' });

    await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await scrollToBottom(page);

    // Wait briefly for any deferred rendering after scroll
    await new Promise(r => setTimeout(r, 1500));

    const results = await page.evaluate((AGE_EXCLUDE_SRC, toAbsoluteSrc) => {
      // eslint-disable-next-line no-new-func
      const toAbsoluteF = new Function('href', 'base', toAbsoluteSrc);
      const ageRe = new RegExp(AGE_EXCLUDE_SRC);

      const cardSelectors = [
        '.event-card', '.show-card', '.item-card',
        '[class*="EventCard"]', '[class*="ShowCard"]', 'article',
      ];

      let cards = [];
      for (const sel of cardSelectors) {
        cards = Array.from(document.querySelectorAll(sel));
        if (cards.length > 0) break;
      }

      const results = [];
      const seen = new Set();

      for (const el of cards) {
        if (results.length >= 50) break;

        const titleEl = el.querySelector('h2, h3, h4, [class*="title"]');
        const name = (titleEl?.textContent || '').trim();
        if (!name || name.length < 4) continue;
        if (ageRe.test(name)) continue;

        const descEl = el.querySelector('p, [class*="desc"]');
        const description = (descEl?.textContent || '').trim();
        if (ageRe.test(description)) continue;

        const dateEl = el.querySelector('time, [class*="date"], [class*="when"]');
        const rawDate = (dateEl?.textContent || '').trim();

        const anchor = el.querySelector('a[href]');
        const href = anchor?.getAttribute('href') || '';
        const url = toAbsoluteF(href, 'https://ishow.co.il');
        if (!url || seen.has(url)) continue;
        seen.add(url);

        results.push({
          name: name.slice(0, 120),
          description: description.slice(0, 400),
          location: 'תל אביב',
          venue: '',
          source_url: url,
          source_name: 'iShow',
          raw_date: rawDate,
        });
      }

      return results;
    }, AGE_EXCLUDE.source, `
      if (!href) return '';
      if (href.startsWith('http')) return href;
      return base + (href.startsWith('/') ? '' : '/') + href;
    `);

    console.log(`[ishow] ${results.length} results`);
    return results;
  } catch (err) {
    console.warn(`[ishow] failed: ${err.message}`);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}
