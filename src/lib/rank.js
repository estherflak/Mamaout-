// Relevance ranking for the Discover feed.
//
// Instead of showing activities newest-scraped-first, we score each activity for
// the current mom and sort best-first, using soonest-upcoming as the base order.
// Signals (strongest first):
//   • A friend is going / interested        — the core differentiator
//   • Matches an interest she picked         — movement / wellness / creative / …
//   • Fits her baby's age                    — age range covers the baby
//   • Happens on a day she's usually free    — free_days from onboarding
// Activities of equal score fall back to whichever happens soonest.

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const WEIGHTS = {
  friendGoing:      100,
  friendInterested:  60,
  interestMatch:     30,
  ageFit:            20,
  freeDayMatch:      15,
};

function babyAgeWeeks(birthdate) {
  if (!birthdate) return null;
  return Math.floor((Date.now() - new Date(birthdate).getTime()) / (7 * 24 * 60 * 60 * 1000));
}

// Earliest upcoming date (ms) for an activity. Recurring activities with no
// concrete dates are treated as "available now" so they aren't buried.
function soonestTime(activity, todayMs) {
  const times = [];
  for (const d of activity.nextDates || []) {
    const t = new Date(`${d}T00:00:00`).getTime();
    if (!Number.isNaN(t) && t >= todayMs) times.push(t);
  }
  if (activity.eventDate) {
    const t = activity.eventDate.getTime();
    if (t >= todayMs) times.push(t);
  }
  return times.length ? Math.min(...times) : todayMs;
}

// Does any upcoming date fall on one of the mom's free weekdays?
function fallsOnFreeDay(activity, freeDays) {
  if (!freeDays?.length) return false;
  const wanted = new Set(freeDays);
  return (activity.nextDates || []).some(d => {
    const day = DAY_NAMES[new Date(`${d}T00:00:00`).getDay()];
    return wanted.has(day);
  });
}

export function scoreActivity(activity, ctx) {
  const { profile, friendsMap, ageWeeks } = ctx;
  let score = 0;

  const friends = friendsMap?.[activity.id];
  if (friends?.length) {
    if (friends.some(f => f.status === 'going')) score += WEIGHTS.friendGoing;
    else score += WEIGHTS.friendInterested;
  }

  const interests = profile?.interests || [];
  if (interests.length && interests.includes(activity.categoryKey)) {
    score += WEIGHTS.interestMatch;
  }

  if (ageWeeks != null) {
    const from = activity.ageFrom ?? 0;
    const to = activity.ageTo ?? Infinity;
    if (ageWeeks >= from && ageWeeks <= to) score += WEIGHTS.ageFit;
  }

  if (fallsOnFreeDay(activity, profile?.free_days)) {
    score += WEIGHTS.freeDayMatch;
  }

  return score;
}

/**
 * Returns a new array sorted best-first. Pure — does not mutate the input.
 */
export function rankActivities(activities, { profile, friendsMap } = {}) {
  const todayMs = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const ageWeeks = babyAgeWeeks(profile?.baby_birthdate);
  const ctx = { profile, friendsMap, ageWeeks, todayMs };

  return activities
    .map(a => ({ a, score: scoreActivity(a, ctx), soon: soonestTime(a, todayMs) }))
    .sort((x, y) => (y.score - x.score) || (x.soon - y.soon))
    .map(x => x.a);
}
