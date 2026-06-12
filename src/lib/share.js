// Builds the day + time fragment, e.g. "Every Monday · 10:00–11:00" or "Tue 14 · 09:30"
function dayTimeLabel(activity) {
  const timeRange = activity.timeStart
    ? (activity.timeEnd ? `${activity.timeStart}–${activity.timeEnd}` : activity.timeStart)
    : null;

  const dateLabel = activity.scheduleLabel || (() => {
    const d = activity.nextDates?.[0];
    if (!d) return null;
    return new Date(`${d}T00:00:00`).toLocaleDateString('en-IL', {
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

// Phase 6.3 — pre-filled WhatsApp share text:
// "Hey! Found this on MamaOut 🌸 [name] – [day + time] in [neighborhood].
//  Thought you'd want to know 👶 [link]"
export function buildShareMessage(activity) {
  const when  = dayTimeLabel(activity);
  const where = activity.neighborhood;
  const link  = activity.sourceUrl
    || (typeof window !== 'undefined' ? window.location.origin : '');

  let msg = `Hey! Found this on MamaOut 🌸 ${activity.name}`;
  if (when)  msg += ` – ${when}`;
  if (where) msg += ` in ${where}`;
  msg += `. Thought you'd want to know 👶`;
  if (link)  msg += ` ${link}`;
  return msg;
}

export function shareActivityOnWhatsApp(activity) {
  const msg = buildShareMessage(activity);
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}
