// Per-place extras for the Places tab: reservation links + activity matching.
// The places table has no booking_url/venue_keys columns, so links live here,
// keyed by the exact places.name (unique index) — move into the table if this
// list grows.
// URLs verified to load (2026-07-13). Not covered: the Hebrew-only places added
// after the v11 seed and Pealton Givatayim.
const BOOKING_URL = {
  'Beit Tami · בית תמי': 'https://www.coing.co/TLV_BeitTami',
  'Regaem Developmental Playground · ר״געים': 'https://mbe-rg.smarticket.co.il/ר_געים_משחקייה_התפתחותית',
  // Facebook page — no standalone site found
  'Gymboree Parparim · ג׳ימבורי פרפרים': 'https://www.facebook.com/gymboreeparparimm/',
  'Pealton · פעלטון (Ayalon Mall)': 'https://play.pealton.co.il/playgrounds/playgrounds-center/?ContentID=55702',
  'Pealton · פעלטון (Namal Tel Aviv)': 'https://play.pealton.co.il/playgrounds/playgrounds-center/?ContentID=69159',
  "Beit Ariela · בית אריאלה (Sha'ar Zion)": 'https://beitariela.smarticket.co.il/',
  'Ramat Aviv Gimel Library · ספריית רמת אביב ג׳': 'https://ariela.today/libraries/ragimel',
  'Ramat Gan Central Library · הספרייה העירונית רמת גן': 'https://www.ramat-gan.muni.il/library/',
};

// Activity match keys are derived from the place name itself (each side of the
// bilingual "·" separator, parentheticals stripped), so new places added to the
// table work without touching this file. These are hand-tuned additions for
// places whose activities are listed under a different venue name.
const EXTRA_VENUE_KEYS = {
  // Regaem is the playground inside Beit Emanuel — classes there are listed
  // under the community center's name.
  'Regaem Developmental Playground · ר״געים': ['בית עמנואל', 'Beit Emanuel'],
};

export function placeBookingUrl(place) {
  return BOOKING_URL[place.name] || null;
}

// Hebrew venues are spelled inconsistently across sources (ר"געים vs ר״געים),
// so strip geresh/gershayim/quote variants before comparing.
const norm = s => s.toLowerCase().replace(/[׳״'"’]/g, '').trim();

// "Pealton · פעלטון (Ayalon Mall)" → ["pealton", "פעלטון"]
function venueKeys(place) {
  const parts = place.name
    .split('·')
    .map(p => norm(p.replace(/\(.*?\)/g, '')))
    .filter(p => p.length >= 3);
  const extras = (EXTRA_VENUE_KEYS[place.name] || []).map(norm);
  return [...parts, ...extras];
}

export function activitiesAtPlace(place, activities) {
  const keys = venueKeys(place);
  if (!keys.length || !activities?.length) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return activities.filter(a => {
    // Drop past one-off events; keep recurring (no eventDate)
    if (a.eventDate && a.eventDate < today) return false;
    return [a.venue, a.location, a.neighborhood].some(
      f => f && keys.some(k => norm(f).includes(k))
    );
  });
}
