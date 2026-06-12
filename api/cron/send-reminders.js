/**
 * Vercel cron — runs every morning (06:00 UTC ≈ 09:00 Israel time).
 * Emails each mom a digest of the activities she saved or RSVP'd that happen
 * TODAY, so MamaOut becomes a weekly habit instead of a one-time browse.
 *
 * Opt-in: only profiles whose notification_pref is set and not 'none' are emailed.
 * De-duped via the reminders_sent table so nobody gets the same reminder twice.
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.
 * Optional env: REMINDER_FROM (e.g. "MamaOut <hello@mamaout.app>"),
 *               APP_URL (link back into the app), CRON_SECRET.
 */
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

function israelToday() {
  // en-CA formats as YYYY-MM-DD, which matches our DATE columns
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
}

function activityTitle(a) {
  return a.name_en || a.name || 'Your activity';
}

function activityWhere(a) {
  return a.venue || a.neighborhood || (a.location || '').split(',')[0] || '';
}

function buildEmail(name, items, appUrl) {
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  const rows = items.map(a => {
    const time = a.time_start ? a.time_start.slice(0, 5) : null;
    const where = activityWhere(a);
    const meta = [time, where].filter(Boolean).join(' · ');
    return `
      <tr><td style="padding:12px 0;border-bottom:1px solid #eee;">
        <div style="font-weight:600;color:#3f3f46;font-size:15px;">${activityTitle(a)}</div>
        ${meta ? `<div style="color:#a1a1aa;font-size:13px;margin-top:2px;">${meta}</div>` : ''}
      </td></tr>`;
  }).join('');

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <div style="font-size:22px;margin-bottom:4px;">🌸 MamaOut</div>
      <p style="color:#52525b;font-size:15px;">${greeting}</p>
      <p style="color:#52525b;font-size:15px;">Here's what you saved for <strong>today</strong>:</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      ${appUrl ? `<a href="${appUrl}" style="display:inline-block;margin-top:20px;padding:12px 20px;background:#d4a5a5;color:#fff;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">Open MamaOut →</a>` : ''}
      <p style="color:#a1a1aa;font-size:12px;margin-top:24px;">You're getting this because you turned on reminders. Change it anytime in your MamaOut profile.</p>
    </div>`;

  const subject = items.length === 1
    ? `Today: ${activityTitle(items[0])} 🌸`
    : `You have ${items.length} things saved for today 🌸`;

  return { subject, html };
}

async function sendEmail({ from, to, subject, html, apiKey }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ skipped: 'RESEND_API_KEY not configured' });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(500).json({ error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required' });
  }
  const supabase = createClient(url, key);

  const from = process.env.REMINDER_FROM || 'MamaOut <onboarding@resend.dev>';
  const appUrl = process.env.APP_URL || null;
  const today = israelToday();

  try {
    // 1. Activities happening today (either a concrete next_date or a one-off event_date)
    const cols = 'id, name, name_en, venue, neighborhood, location, time_start';
    const [{ data: byNext }, { data: byEvent }] = await Promise.all([
      supabase.from('activities').select(cols).contains('next_dates', [today]),
      supabase.from('activities').select(cols).eq('event_date', today),
    ]);
    const activityMap = new Map();
    for (const a of [...(byNext || []), ...(byEvent || [])]) activityMap.set(a.id, a);
    if (activityMap.size === 0) {
      return res.status(200).json({ today, activitiesToday: 0, sent: 0 });
    }
    const activityIds = [...activityMap.keys()];

    // 2. Everyone who saved or RSVP'd one of today's activities
    const [{ data: favs }, { data: parts }, { data: alreadySent }] = await Promise.all([
      supabase.from('favorites').select('user_id, activity_id').in('activity_id', activityIds),
      supabase.from('activity_participants').select('user_id, activity_id').in('activity_id', activityIds),
      supabase.from('reminders_sent').select('user_id, activity_id').eq('sent_on', today),
    ]);

    const sentKey = new Set((alreadySent || []).map(r => `${r.user_id}:${r.activity_id}`));
    const perUser = new Map(); // user_id -> Set(activity_id)
    for (const r of [...(favs || []), ...(parts || [])]) {
      if (!r.user_id || sentKey.has(`${r.user_id}:${r.activity_id}`)) continue;
      (perUser.get(r.user_id) || perUser.set(r.user_id, new Set()).get(r.user_id)).add(r.activity_id);
    }
    if (perUser.size === 0) {
      return res.status(200).json({ today, activitiesToday: activityMap.size, sent: 0 });
    }

    // 3. Keep only opted-in profiles
    const userIds = [...perUser.keys()];
    const { data: profiles } = await supabase
      .from('profiles').select('id, name, notification_pref').in('id', userIds);
    const optedIn = new Map(
      (profiles || [])
        .filter(p => p.notification_pref && p.notification_pref !== 'none')
        .map(p => [p.id, p])
    );
    if (optedIn.size === 0) {
      return res.status(200).json({ today, activitiesToday: activityMap.size, sent: 0 });
    }

    // 4. Resolve emails (lives in auth.users, reachable via the service role)
    const { data: usersPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailById = new Map((usersPage?.users || []).map(u => [u.id, u.email]));

    // 5. Send one grouped email per opted-in mom
    let sent = 0;
    const sentRows = [];
    for (const [uid, p] of optedIn) {
      const email = emailById.get(uid);
      if (!email) continue;
      const items = [...perUser.get(uid)].map(id => activityMap.get(id)).filter(Boolean);
      if (items.length === 0) continue;

      const { subject, html } = buildEmail(p.name, items, appUrl);
      try {
        await sendEmail({ from, to: email, subject, html, apiKey });
        sent++;
        for (const a of items) sentRows.push({ user_id: uid, activity_id: a.id, sent_on: today });
      } catch (err) {
        console.error(`[reminders] failed for ${uid}: ${err.message}`);
      }
    }

    if (sentRows.length > 0) {
      await supabase.from('reminders_sent').upsert(sentRows, { onConflict: 'user_id,activity_id,sent_on', ignoreDuplicates: true });
    }

    const summary = { today, activitiesToday: activityMap.size, recipients: optedIn.size, sent };
    console.log('[cron] send-reminders done', summary);
    return res.status(200).json(summary);
  } catch (err) {
    console.error('[cron] send-reminders error:', err);
    return res.status(500).json({ error: err.message });
  }
}
