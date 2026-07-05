// Shared baby-age formatting for the whole app.
//
// Activities store ages in WEEKS (baby_age_min / baby_age_max); places store
// them in MONTHS (age_min_months / age_max_months). Both render through the
// same buckets so a 0–12mo app never shows "145mo" or "108m":
//
//   <= 4 weeks (~1 month) → "newborn"
//   < 13 weeks (~3 months) → "Nw"
//   <= 24 months           → "Nmo"
//   above that             → "Ny"  (e.g. "3y", "6y")
//
// Every entry point guards null/NaN so a missing column renders nothing.

import { t } from '../i18n/strings';

const WEEKS_PER_MONTH = 4.345;
const WEEKS_PER_YEAR = 52.14;

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Format a single age given in weeks. Returns null for unknown. */
export function ageLabelFromWeeks(weeks, lang = 'en') {
  if (!isNum(weeks) || weeks < 0) return null;
  if (weeks <= 4) return t(lang, 'formatAge.newborn');
  if (weeks < 13) return t(lang, 'formatAge.weekSuffix', { n: Math.round(weeks) });
  const months = Math.round(weeks / WEEKS_PER_MONTH);
  if (months <= 24) return t(lang, 'formatAge.monthSuffix', { n: months });
  return t(lang, 'formatAge.yearSuffix', { n: Math.round(weeks / WEEKS_PER_YEAR) });
}

/** Format a single age given in months. Returns null for unknown. */
export function ageLabelFromMonths(months, lang = 'en') {
  if (!isNum(months) || months < 0) return null;
  if (months <= 1) return t(lang, 'formatAge.newborn');
  if (months <= 24) return t(lang, 'formatAge.monthSuffix', { n: months });
  return t(lang, 'formatAge.yearSuffix', { n: Math.round(months / 12) });
}

/**
 * Range label for activities (weeks). Mirrors the old useActivities logic but
 * rolls large counts up to years instead of printing "145mo".
 */
export function ageRangeLabelFromWeeks(minWeeks, maxWeeks, lang = 'en') {
  const lo = ageLabelFromWeeks(minWeeks, lang);
  const hi = ageLabelFromWeeks(maxWeeks, lang);
  if (lo == null && hi == null) return t(lang, 'formatAge.allAges');
  if (lo != null && hi != null) return `${lo}–${hi}`;
  if (lo != null) return isNum(minWeeks) && minWeeks <= 4 ? t(lang, 'formatAge.fromBirth') : t(lang, 'formatAge.fromPrefix', { label: lo });
  return t(lang, 'formatAge.upToPrefix', { label: hi });
}

/**
 * Range label for places (months). Returns null when there's nothing
 * meaningful to show (no min, no max), so the caller can omit the badge.
 */
export function ageRangeLabelFromMonths(minMonths, maxMonths, lang = 'en') {
  const hasMin = isNum(minMonths) && minMonths > 0;
  const hasMax = isNum(maxMonths);
  if (!hasMin && !hasMax) return null;
  const lo = ageLabelFromMonths(isNum(minMonths) ? minMonths : 0, lang) ?? t(lang, 'formatAge.newborn');
  if (!hasMax) return t(lang, 'formatAge.fromPrefix', { label: lo });
  return `${lo}–${ageLabelFromMonths(maxMonths, lang)}`;
}
