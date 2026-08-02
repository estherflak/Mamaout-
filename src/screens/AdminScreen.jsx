import { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? 'admin@mamaout.app';

const AGE_RANGE_WEEKS = {
  'Newborn–3m': [0, 13],
  '3–6m':       [13, 26],
  '6–12m':      [26, 52],
  'All ages':   [0, 52],
};

function ageRangeToWeeks(ageRange) {
  let min = null, max = null;
  for (const r of (ageRange ?? [])) {
    const [lo, hi] = AGE_RANGE_WEEKS[r] ?? [];
    if (lo != null) min = min == null ? lo : Math.min(min, lo);
    if (hi != null) max = max == null ? hi : Math.max(max, hi);
  }
  return { min, max };
}

function langCode(lang) {
  if (!lang) return null;
  if (lang.toLowerCase() === 'hebrew')  return 'he';
  if (lang.toLowerCase() === 'english') return 'en';
  return 'both';
}

export default function AdminScreen() {
  const { user, authLoading } = useAuthContext();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loginErr, setLoginErr]     = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionErr, setActionErr]   = useState('');
  const [tab, setTab]               = useState('pending'); // 'pending' | 'approved' | 'rejected'

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin) load(tab);
  }, [isAdmin, tab]);

  async function load(status) {
    setDataLoading(true);
    setActionErr('');
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('status', status)
      .order('submitted_at', { ascending: false });
    setSubmissions(data ?? []);
    setDataLoading(false);
  }

  async function handleLogin() {
    setLoginErr(''); setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginErr(error.message);
    setLoginLoading(false);
  }

  async function approve(sub) {
    setActionLoading(sub.id);
    setActionErr('');
    const { min, max } = ageRangeToWeeks(sub.age_range);
    const nextDates = sub.one_time_date ? [sub.one_time_date] : null;

    const { error } = await supabase.from('activities').insert({
      name:               sub.name,
      description:        sub.description,
      category:           sub.category?.toLowerCase() ?? 'social',
      address:            sub.address,
      neighborhood:       sub.neighborhood,
      // resolveCity() in the app reads `location`; without it every approved
      // submission would surface as Tel Aviv regardless of where it is.
      location:           [sub.neighborhood, sub.address].filter(Boolean).join(', ') || null,
      schedule_type:      sub.schedule_type,
      schedule_label:     sub.schedule_label,
      time_start:         sub.time_start,
      time_end:           sub.time_end,
      recurrence_days:    sub.recurrence_days,
      next_dates:         nextDates,
      price:              sub.price,
      stroller_accessible: sub.stroller_accessible,
      baby_age_min:       min,
      baby_age_max:       max,
      language:           langCode(sub.language),
      organizer_name:     sub.organizer_name,
      organizer_whatsapp: sub.organizer_whatsapp,
      source_url:         sub.source_url || null,
      source_name:        sub.submission_type === 'community' ? 'Community' : 'Submitted',
      is_verified:        false,
    });

    if (error) {
      setActionErr(`Failed to publish: ${error.message}`);
      setActionLoading(null);
      return;
    }
    await supabase.from('submissions').update({ status: 'approved' }).eq('id', sub.id);
    setSubmissions(s => s.filter(x => x.id !== sub.id));
    setActionLoading(null);
  }

  async function reject(sub) {
    setActionLoading(sub.id);
    await supabase.from('submissions').update({ status: 'rejected' }).eq('id', sub.id);
    setSubmissions(s => s.filter(x => x.id !== sub.id));
    setActionLoading(null);
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-warmline bg-card text-plum placeholder-plum-disabled focus:outline-none focus:ring-2 focus:ring-lilac text-sm';
  const btnCls   = 'w-full py-3 rounded-xl font-semibold text-plum bg-butter text-sm disabled:opacity-60';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-lilac border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6">
        <div className="mb-8 text-center">
          <div className="text-3xl mb-2">🔐</div>
          <h1 className="text-xl font-serif font-bold text-plum">Admin</h1>
          <p className="text-xs text-plum-soft mt-1">MamaOut admin panel</p>
        </div>
        <div className="w-full max-w-sm bg-card rounded-2xl shadow-soft border border-warmline p-6 space-y-3">
          {loginErr && (
            <div className="px-3 py-2 bg-blush/10 border border-blush/30 rounded-lg text-xs text-blush">{loginErr}</div>
          )}
          <input className={inputCls} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className={inputCls} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          <button className={btnCls} onClick={handleLogin} disabled={loginLoading || !email || !password}>
            {loginLoading ? '…' : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 text-center">
        <div className="text-3xl mb-3">🚫</div>
        <h2 className="text-lg font-serif font-semibold text-plum mb-2">Access denied</h2>
        <p className="text-sm text-plum-soft">This page is for admin use only.</p>
        <a href="/" className="mt-6 text-sm text-plum underline">Go to MamaOut</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-12">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-serif font-bold text-plum">Submissions</h1>
            <p className="text-xs text-plum-soft mt-0.5">Logged in as {user.email}</p>
          </div>
          <a href="/" className="text-xs text-plum underline">Back to app</a>
        </div>

        {/* Tabs */}
        <div className="flex bg-lilac-pale rounded-xl p-0.5 mb-5">
          {[
            { id: 'pending',  label: 'Pending' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.id ? 'bg-card shadow-soft text-plum' : 'text-plum-soft'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {actionErr && (
          <div className="mb-4 px-3 py-2 bg-blush/10 border border-blush/30 rounded-xl text-xs text-blush">{actionErr}</div>
        )}

        {dataLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-lilac border-t-transparent animate-spin" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">{tab === 'pending' ? '✅' : '📭'}</div>
            <p className="text-plum-soft text-sm">
              {tab === 'pending' ? 'No pending submissions.' : `No ${tab} submissions.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map(sub => (
              <div key={sub.id} className="bg-card rounded-2xl border border-warmline p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-plum text-base leading-tight">{sub.name}</h3>
                      {sub.submission_type === 'community' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium shrink-0">
                          💎 Mom tip
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-plum-soft mt-0.5">
                      {[sub.category, sub.neighborhood ?? sub.address, sub.schedule_type]
                        .filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="text-xs text-plum-disabled shrink-0 mt-0.5">
                    {new Date(sub.submitted_at).toLocaleDateString('en-GB')}
                  </span>
                </div>

                {sub.description && (
                  <p className="text-sm text-plum mb-3 leading-snug">{sub.description}</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-plum-soft mb-3">
                  {(sub.time_start || sub.time_end) && (
                    <span>
                      ⏰ {sub.time_start ? sub.time_start.slice(0, 5) : '?'}
                      {sub.time_end ? `–${sub.time_end.slice(0, 5)}` : ''}
                    </span>
                  )}
                  {sub.recurrence_days?.length > 0 && <span>📅 {sub.recurrence_days.join(', ')}</span>}
                  {sub.one_time_date && <span>📅 {sub.one_time_date}</span>}
                  {sub.price != null && <span>{sub.price === 0 ? 'Free' : `₪${sub.price}`}</span>}
                  {sub.age_range?.length > 0 && <span>👶 {sub.age_range.join(', ')}</span>}
                  {sub.language && <span>🗣 {sub.language}</span>}
                  {sub.stroller_accessible != null && (
                    <span>🚼 Stroller: {sub.stroller_accessible ? 'Yes' : 'No'}</span>
                  )}
                </div>

                {(sub.organizer_name || sub.organizer_whatsapp || sub.organizer_instagram) && (
                  <p className="text-xs text-plum-soft mb-3">
                    By {sub.organizer_name ?? '—'}
                    {sub.organizer_whatsapp && ` · 📱 ${sub.organizer_whatsapp}`}
                    {sub.organizer_instagram && ` · @${sub.organizer_instagram}`}
                  </p>
                )}

                {tab === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => approve(sub)}
                      disabled={actionLoading === sub.id}
                      className="flex-1 py-2 rounded-xl bg-sage-300 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {actionLoading === sub.id ? '…' : '✓ Approve & publish'}
                    </button>
                    <button
                      onClick={() => reject(sub)}
                      disabled={actionLoading === sub.id}
                      className="px-4 py-2 rounded-xl border border-warmline text-plum text-sm font-medium disabled:opacity-50"
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
