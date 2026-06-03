/**
 * DuckDuckGo HTML search — used instead of Google to avoid CAPTCHAs at low volume.
 * Queries in both Hebrew and English for mom+baby activities in the Tel Aviv area.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const QUERIES = [
  // Hebrew
  'יוגה עם תינוק תל אביב',
  'פילאטיס עם תינוק תל אביב',
  'סדנת עיסוי תינוקות תל אביב',
  'קדרות עם תינוק תל אביב',
  'שיעור שחייה תינוקות תל אביב',
  // English
  'yoga with baby Tel Aviv',
  'pilates postnatal Tel Aviv',
  'baby massage workshop Tel Aviv',
  'pottery with baby Tel Aviv',
  'baby swimming class Tel Aviv',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function scrapeGoogle() {
  const results = [];

  for (const q of QUERIES) {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=il-he`;
      const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
      const $ = cheerio.load(data);

      $('.result').each((_, el) => {
        const name = $(el).find('.result__title').text().trim();
        const description = $(el).find('.result__snippet').text().trim();
        const href = $(el).find('.result__url').text().trim();

        if (!name || !href) return;

        // Skip social media, maps, and other noise
        if (/facebook|instagram|twitter|maps\.google|youtube/i.test(href)) return;

        results.push({
          name: name.slice(0, 120),
          description: description.slice(0, 400),
          location: 'Tel Aviv area',
          source_url: href.startsWith('http') ? href : `https://${href}`,
          source_name: 'DuckDuckGo / Google',
        });
      });

      await sleep(2000); // Be polite between queries
    } catch (err) {
      console.warn(`[google] query "${q}" failed:`, err.message);
    }
  }

  return results;
}
