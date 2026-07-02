// Canonical Hebrew→English names for known venues.
//
// Haiku transliterates the same Hebrew venue differently on every run
// (Ra'agim / Ra'gim / Raagim / Rasgeim …), which made one real class look like
// dozens of different ones. For venues we recognise we pin ONE English spelling
// and feed it to the classifier as a hint, so name_en stays stable run-to-run.
//
// Matching is on a Hebrew fragment (regex) so partial venue strings still hit.

const VENUE_CANON = [
  { match: /ר["'’]?\s?געים/, en: "Ra'agim" },
  { match: /בית עמנואל/,      en: 'Beit Emanuel' },
  { match: /בית לזרוס/,       en: 'Beit Lazarus' },
  { match: /בית דורון/,       en: 'Beit Doron' },
  { match: /רמת יצחק/,        en: 'Ramat Yitzhak' },
  { match: /פראנה|prana/i,    en: 'Prana Yoga' },
];

/**
 * Canonical English name for a known venue, or null if we don't recognise it.
 * Pass the raw Hebrew venue (and optionally the activity name, since some
 * sources put the venue in the title).
 */
export function canonicalVenueEn(...heFields) {
  const text = heFields.filter(Boolean).join(' ');
  if (!text) return null;
  const hit = VENUE_CANON.find(v => v.match.test(text));
  return hit ? hit.en : null;
}
