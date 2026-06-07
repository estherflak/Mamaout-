/**
 * Eventbrite — uses their structured JSON search API instead of HTML scraping.
 * The HTML endpoints now return 405; the API endpoint is more stable.
 */
import axios from 'axios';

const SEARCHES = [
  { q: 'baby yoga tel aviv', location: 'Tel Aviv, Israel' },
  { q: 'baby pilates tel aviv', location: 'Tel Aviv, Israel' },
  { q: 'mom baby class tel aviv', location: 'Tel Aviv, Israel' },
  { q: 'baby swim ramat gan', location: 'Ramat Gan, Israel' },
  { q: 'postnatal class israel', location: 'Tel Aviv, Israel' },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.eventbrite.com/',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function scrapeEventbrite() {
  const results = [];

  for (const { q, location } of SEARCHES) {
    try {
      // Eventbrite's internal search API (no key required for public results)
      const url = `https://www.eventbrite.com/api/v3/destination/search/?q=${encodeURIComponent(q)}&location.address=${encodeURIComponent(location)}&page_size=20&expand=venue,description`;
      const { data } = await axios.get(url, { headers: HEADERS, timeout: 12000 });

      const events = data?.events?.results || data?.results || [];
      for (const ev of events) {
        const name = ev.name?.text || ev.name || '';
        const description = ev.summary || ev.description?.text || '';
        const venue = ev.venue?.name || '';
        const city = ev.venue?.address?.city || 'Tel Aviv';
        const href = ev.url || '';

        // Eventbrite API provides precise venue coordinates — use them directly
        const latitude  = ev.venue?.latitude  ? parseFloat(ev.venue.latitude)  : null;
        const longitude = ev.venue?.longitude ? parseFloat(ev.venue.longitude) : null;

        if (!name || !href) continue;

        results.push({
          name: name.slice(0, 120),
          description: description.slice(0, 400),
          location: venue ? `${venue}, ${city}` : city,
          source_url: href.split('?')[0],
          source_name: 'Eventbrite',
          venue,
          raw_date: ev.start?.local || '',
          latitude,
          longitude,
        });
      }

      await sleep(2000);
    } catch (err) {
      console.warn(`[eventbrite] "${q}" failed:`, err.message);
    }
  }

  return results;
}
