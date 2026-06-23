import { localizedName } from './localize';

// Builds the day + time fragment, e.g. "Every Monday · 10:00–11:00" or "Tue 14 · 09:30"
function dayTimeLabel(activity, lang = 'en') {
  const timeRange = activity.timeStart
    ? (activity.timeEnd ? `${activity.timeStart}–${activity.timeEnd}` : activity.timeStart)
    : null;

  const locale = lang === 'he' ? 'he-IL' : 'en-IL';
  const dateLabel = activity.scheduleLabel || (() => {
    const d = activity.nextDates?.[0];
    if (!d) return null;
    return new Date(`${d}T00:00:00`).toLocaleDateString(locale, {
      weekday: 'long', day: 'numeric', month: 'short',
    });
  })();

  if (dateLabel && timeRange) {
    // Avoid doubling the start time if the label already contains it
    if (activity.timeStart && dateLabel.includes(activity.timeStart)) {
      return dateLabel.replace(activity.timeStart, timeRange);
    }
    return `${dateLabel} · ${timeRange}`;
  }
  return dateLabel || timeRange || '';
}

// Pre-filled WhatsApp share text, in the sharer's chosen content language.
// EN: "Hey! Found this on MamaOut 🌸 [name] – [day + time] in [neighborhood].
//      Thought you'd want to know 👶 [link]"
// HE: "היי! מצאתי את זה ב-MamaOut 🌸 [name] – [day + time] ב[neighborhood].
//      חשבתי שתרצי לדעת 👶 [link]"
export function buildShareMessage(activity, lang = 'en') {
  const name  = localizedName(activity, lang);
  const when  = dayTimeLabel(activity, lang);
  const where = activity.neighborhood;
  const link  = activity.sourceUrl
    || (typeof window !== 'undefined' ? window.location.origin : '');

  let msg;
  if (lang === 'he') {
    msg = `היי! מצאתי את זה ב-MamaOut 🌸 ${name}`;
    if (when)  msg += ` – ${when}`;
    if (where) msg += ` ב${where}`;
    msg += `. חשבתי שתרצי לדעת 👶`;
  } else {
    msg = `Hey! Found this on MamaOut 🌸 ${name}`;
    if (when)  msg += ` – ${when}`;
    if (where) msg += ` in ${where}`;
    msg += `. Thought you'd want to know 👶`;
  }
  if (link) msg += ` ${link}`;
  return msg;
}

export function shareActivityOnWhatsApp(activity, lang = 'en') {
  const msg = buildShareMessage(activity, lang);
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}
