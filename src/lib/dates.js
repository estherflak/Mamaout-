// Date helpers for the Discover feed's quick date filters.

export function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Set of YYYY-MM-DD strings covered by a named quick-range, relative to today.
 *   'week'     — today through the next 6 days (the visible 7-day window)
 *   'nextWeek' — the next calendar week, Sunday through Saturday (Israel
 *                weeks start Sunday); always strictly after today
 *   'weekend'  — the coming Friday + Saturday (Israel weekend); includes today
 *                if today is already Fri/Sat
 * Returns null for an unknown range.
 */
export function dateRangeSet(range) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (range === 'week') {
    const set = new Set();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      set.add(toLocalDateStr(d));
    }
    return set;
  }

  if (range === 'nextWeek') {
    const set = new Set();
    const daysToSunday = 7 - today.getDay(); // next Sunday, always in the future
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + daysToSunday + i);
      set.add(toLocalDateStr(d));
    }
    return set;
  }

  if (range === 'weekend') {
    const set = new Set();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const day = d.getDay(); // 5 = Friday, 6 = Saturday
      if (day === 5 || day === 6) set.add(toLocalDateStr(d));
    }
    return set;
  }

  return null;
}

/**
 * True if the activity happens on a date inside the given quick-range.
 * Matches both recurring next_dates and a one-off eventDate.
 */
export function matchesDateRange(activity, range) {
  const set = dateRangeSet(range);
  if (!set) return false;
  if (activity.nextDates?.some(d => set.has(d))) return true;
  if (activity.eventDate) return set.has(toLocalDateStr(activity.eventDate));
  return false;
}
