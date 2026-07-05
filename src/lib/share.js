import { localizedName, localizedScheduleLabel } from './localize';

function dayTimeLabel(activity, lang = 'en') {
  const timeRange = activity.timeStart
    ? (activity.timeEnd ? `${activity.timeStart}–${activity.timeEnd}` : activity.timeStart)
    : null;

  const locale = lang === 'he' ? 'he-IL' : 'en-IL';
  const dateLabel = localizedScheduleLabel(activity, lang) || (() => {
    const d = activity.nextDates?.[0];
    if (!d) return null;
    return new Date(`${d}T00:00:00`).toLocaleDateString(locale, {
      weekday: 'long', day: 'numeric', month: 'short',
    });
  })();

  if (dateLabel && timeRange) {
    if (activity.timeStart && dateLabel.includes(activity.timeStart)) {
      return dateLabel.replace(activity.timeStart, timeRange);
    }
    return `${dateLabel} · ${timeRange}`;
  }
  return dateLabel || timeRange || '';
}

export const SHARE_TEMPLATES = [
  {
    id: 'invite',
    labelKey: 'shareTemplates.inviteLabel',
    build(activity, lang = 'en') {
      const name  = localizedName(activity, lang);
      const when  = dayTimeLabel(activity, lang);
      const where = activity.neighborhood;
      const link  = activity.sourceUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      let msg;
      if (lang === 'he') {
        msg = `בא לך להצטרף אליי? 🙋‍♀️ מצאתי את *${name}* ב-MamaOut`;
        if (when)  msg += ` – ${when}`;
        if (where) msg += `, ${where}`;
        msg += `. בואי נלך ביחד! 💕`;
      } else {
        msg = `Want to join me? 🙋‍♀️ I found *${name}* on MamaOut`;
        if (when)  msg += ` – ${when}`;
        if (where) msg += `, ${where}`;
        msg += `. Let's go together! 💕`;
      }
      if (link)  msg += ` ${link}`;
      return msg;
    },
  },
  {
    id: 'friendly',
    labelKey: 'shareTemplates.friendlyLabel',
    build(activity, lang = 'en') {
      const name  = localizedName(activity, lang);
      const when  = dayTimeLabel(activity, lang);
      const where = activity.neighborhood;
      const link  = activity.sourceUrl || (typeof window !== 'undefined' ? window.location.origin : '');
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
    },
  },
  {
    id: 'quick',
    labelKey: 'shareTemplates.quickLabel',
    build(activity, lang = 'en') {
      const name  = localizedName(activity, lang);
      const when  = dayTimeLabel(activity, lang);
      const where = activity.neighborhood;
      const link  = activity.sourceUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      const parts = [name, when, where].filter(Boolean);
      let msg = `📍 MamaOut: ${parts.join(' · ')}`;
      if (link) msg += `\n${link}`;
      return msg;
    },
  },
];

export function buildShareMessage(activity, lang = 'en') {
  return SHARE_TEMPLATES[0].build(activity, lang);
}

export function shareActivityOnWhatsApp(activity, templateId, lang = 'en') {
  const template = templateId
    ? (SHARE_TEMPLATES.find(t => t.id === templateId) || SHARE_TEMPLATES[0])
    : SHARE_TEMPLATES[0];
  const msg = template.build(activity, lang);
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

// --- Calendar (.ics) helpers ---

function toICSDateTime(dateStr, timeStr) {
  const base = dateStr.replace(/-/g, '');
  if (!timeStr) return `${base}T000000`;
  return `${base}T${timeStr.replace(':', '')}00`;
}

function addOneHour(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function escapeICS(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildICS(activity) {
  const nextDate = activity.nextDates?.[0]
    || (activity.eventDate instanceof Date
        ? activity.eventDate.toISOString().slice(0, 10)
        : activity.eventDate);
  if (!nextDate) return null;

  const endTime = activity.timeEnd || (activity.timeStart ? addOneHour(activity.timeStart) : null);
  const dtStart = toICSDateTime(nextDate, activity.timeStart || null);
  const dtEnd   = toICSDateTime(nextDate, endTime);

  const name     = escapeICS(activity.name || 'Activity');
  const location = escapeICS(activity.address || activity.neighborhood || '');
  const descParts = [activity.description, activity.sourceUrl].filter(Boolean);
  const desc = escapeICS(descParts.join('\n'));

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MamaOut//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${name}`,
  ];
  if (location) lines.push(`LOCATION:${location}`);
  if (desc)     lines.push(`DESCRIPTION:${desc}`);
  lines.push(
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${name}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  );
  return lines.join('\r\n');
}

export function addToCalendar(activity) {
  const ics = buildICS(activity);
  if (!ics) return false;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${(activity.name || 'activity').replace(/\s+/g, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
