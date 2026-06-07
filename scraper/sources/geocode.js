import axios from 'axios';

// Nominatim usage policy: max 1 req/s, must include a descriptive User-Agent
// https://operations.osmfoundation.org/policies/nominatim/
const HEADERS = { 'User-Agent': 'MamaOut/1.0 (activities app for new moms, Tel Aviv)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function geocodeActivity(venue, location) {
  const query = [...new Set([venue, location, 'Israel'].filter(Boolean))].join(', ');

  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1, countrycodes: 'il' },
      headers: HEADERS,
      timeout: 8000,
    });

    const result = data?.[0];
    if (!result) return null;

    const latitude  = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    // Sanity-check: must be within Israel bounding box
    if (latitude < 29 || latitude > 34 || longitude < 34 || longitude > 36) return null;

    return { latitude, longitude };
  } catch (err) {
    console.warn(`[geocode] "${query}" failed:`, err.message);
    return null;
  } finally {
    await sleep(1100); // Nominatim hard limit: 1 req/s
  }
}
