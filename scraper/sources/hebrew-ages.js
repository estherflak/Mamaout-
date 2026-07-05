/**
 * Derive a baby age range (in WEEKS, matching baby_age_min/baby_age_max) from
 * a Hebrew activity name. Sources like Smarticket and Digitaf encode the age
 * in the title ("לידה עד זחילה", "גילי 2-3", "עמידה עד גיל 1.5") but their
 * APIs carry no structured age field, so this is the only signal we have.
 *
 * Used by the scrapers at ingest time and by scraper/backfill-ages.js for
 * one-off repairs — keep both in sync by only editing this file.
 */

const WEEKS_PER_MONTH = 4.345;
const WEEKS_PER_YEAR = 52;

// Developmental milestones commonly used as age bounds, in string order of
// specificity (longer phrases first so "שנה וחצי" wins over "שנה").
const MILESTONES = [
  ['צעדים ראשונים', 48], // first steps ≈ 11mo
  ['שנה וחצי', 78],
  ['שנתיים', 104],
  ['שלוש', 156],
  ['לידה', 0],
  ['זחילה', 26],         // crawling ≈ 6mo
  ['ישיבה', 22],         // sitting ≈ 5mo
  ['עמידה', 39],         // standing ≈ 9mo
  ['הליכה', 52],         // walking ≈ 12mo
  ['שנה', 52],
];

// Collect every age signal in the order it appears in the name.
function collectSignals(name) {
  const signals = []; // { index, weeks }

  // Explicit month values: "4 חודשים", "3-6 חודשים", "חודש" (one month)
  for (const m of name.matchAll(/(\d+(?:\.\d+)?)\s*[-–]?\s*(\d+(?:\.\d+)?)?\s*חודשים/g)) {
    signals.push({ index: m.index, weeks: Math.round(parseFloat(m[1]) * WEEKS_PER_MONTH) });
    if (m[2]) signals.push({ index: m.index + 1, weeks: Math.round(parseFloat(m[2]) * WEEKS_PER_MONTH) });
  }
  if (/מגיל חודש|עד חודש/.test(name)) {
    signals.push({ index: name.search(/חודש/), weeks: 4 });
  }

  // Numeric year ranges: "1.5-3", "גילי 2-3", "עד גיל 2" (years when ≤ 6 and
  // not already captured as months above)
  const monthsSpans = [...name.matchAll(/\d[\d.\s–-]*חודשים/g)].map(m => [m.index, m.index + m[0].length]);
  const inMonthsSpan = i => monthsSpans.some(([a, b]) => i >= a && i < b);
  for (const m of name.matchAll(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/g)) {
    if (inMonthsSpan(m.index)) continue;
    const lo = parseFloat(m[1]), hi = parseFloat(m[2]);
    if (hi <= 6) { // plausibly years
      signals.push({ index: m.index, weeks: Math.round(lo * WEEKS_PER_YEAR) });
      signals.push({ index: m.index + 1, weeks: Math.round(hi * WEEKS_PER_YEAR) });
    }
  }
  for (const m of name.matchAll(/עד גיל\s*(\d+(?:\.\d+)?)(?!\s*חודשים)/g)) {
    const v = parseFloat(m[1]);
    if (v <= 6 && !inMonthsSpan(m.index)) {
      signals.push({ index: m.index + 6, weeks: Math.round(v * WEEKS_PER_YEAR) });
    }
  }

  // Milestone words (skip when part of an already-captured phrase)
  const taken = new Set(signals.map(s => s.index));
  for (const [word, weeks] of MILESTONES) {
    let from = 0;
    for (;;) {
      const i = name.indexOf(word, from);
      if (i === -1) break;
      // Longer milestone phrases were scanned first; skip if a longer phrase
      // already claimed this position (e.g. "שנה" inside "שנה וחצי").
      if (![...signals].some(s => Math.abs(s.index - i) < 2 && s.weeks !== weeks)) {
        if (!taken.has(i)) signals.push({ index: i, weeks });
      }
      from = i + word.length;
    }
  }

  return signals.sort((a, b) => a.index - b.index);
}

/**
 * Returns { min, max } in weeks. min defaults to 0, max to null (unknown).
 * With two or more signals, the first is the lower bound and the last the
 * upper bound (Hebrew age ranges read min→max left to right).
 */
export function ageRangeFromName(name = '') {
  const signals = collectSignals(name);
  if (signals.length === 0) return { min: 0, max: null };
  if (signals.length === 1) {
    const s = signals[0];
    // A single signal after "עד" ("up to X") is an upper bound; otherwise treat
    // it as a lower bound ("מגיל X", "מ-X").
    const before = name.slice(Math.max(0, s.index - 8), s.index);
    if (/עד\s*(גיל)?\s*$/.test(before)) return { min: 0, max: s.weeks };
    return { min: s.weeks, max: null };
  }
  const weeks = signals.map(s => s.weeks);
  return { min: Math.min(weeks[0], weeks[weeks.length - 1]), max: Math.max(weeks[0], weeks[weeks.length - 1]) };
}

/**
 * True when an event clearly does not belong in a 0–12-month app: the age
 * range starts at a year or later, or it's a birthday-party promo.
 */
export function isOutOfScopeForBabies(name = '') {
  if (/יום הולדת/.test(name)) return true;
  const { min } = ageRangeFromName(name);
  return min >= 52;
}
