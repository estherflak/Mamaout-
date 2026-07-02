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

const WEEKS_PER_MONTH = 4.345;
const WEEKS_PER_YEAR = 52.14;

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Format a single age given in weeks. Returns null for unknown. */
export function ageLabelFromWeeks(weeks) {
  if (!isNum(weeks) || weeks < 0) return null;
  if (weeks <= 4) return 'newborn';
  if (weeks < 13) return `${Math.round(weeks)}w`;
  const months = Math.round(weeks / WEEKS_PER_MONTH);
  if (months <= 24) return `${months}mo`;
  return `${Math.round(weeks / WEEKS_PER_YEAR)}y`;
}

/** Format a single age given in months. Returns null for unknown. */
export function ageLabelFromMonths(months) {
  if (!isNum(months) || months < 0) return null;
  if (months <= 1) return 'newborn';
  if (months <= 24) return `${months}mo`;
  return `${Math.round(months / 12)}y`;
}

/**
 * Range label for activities (weeks). Mirrors the old useActivities logic but
 * rolls large counts up to years instead of printing "145mo".
 */
export function ageRangeLabelFromWeeks(minWeeks, maxWeeks) {
  const lo = ageLabelFromWeeks(minWeeks);
  const hi = ageLabelFromWeeks(maxWeeks);
  if (lo == null && hi == null) return 'All ages';
  if (lo != null && hi != null) return `${lo}–${hi}`;
  if (lo != null) return isNum(minWeeks) && minWeeks <= 4 ? 'From birth' : `From ${lo}`;
  return `Up to ${hi}`;
}

/**
 * Range label for places (months). Returns null when there's nothing
 * meaningful to show (no min, no max), so the caller can omit the badge.
 */
export function ageRangeLabelFromMonths(minMonths, maxMonths) {
  const hasMin = isNum(minMonths) && minMonths > 0;
  const hasMax = isNum(maxMonths);
  if (!hasMin && !hasMax) return null;
  const lo = ageLabelFromMonths(isNum(minMonths) ? minMonths : 0) ?? 'newborn';
  if (!hasMax) return `From ${lo}`;
  return `${lo}–${ageLabelFromMonths(maxMonths)}`;
}
