/**
 * Mapbox Geocoding — resolves venue/location strings to lat/lng.
 * Requires MAPBOX_TOKEN env var.
 */
import axios from 'axios';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function geocodeActivity(venue, location) {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return null;

  // Build the most specific query possible
  const queryParts = [venue, location, 'Israel'].filter(Boolean);
  const query = encodeURIComponent(queryParts.join(', '));

  try {
    const { data } = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json`,
      {
        params: {
          access_token: token,
          country: 'IL',
          limit: 1,
          types: 'poi,address,place',
        },
        timeout: 8000,
      }
    );

    const feature = data.features?.[0];
    if (!feature) return null;

    const [longitude, latitude] = feature.center;
    // Sanity check: must be roughly in Israel
    if (latitude < 29 || latitude > 34 || longitude < 34 || longitude > 36) return null;

    return { latitude, longitude };
  } catch (err) {
    console.warn(`[geocode] "${queryParts[0]}" failed:`, err.message);
    return null;
  } finally {
    await sleep(200); // gentle rate limit
  }
}
