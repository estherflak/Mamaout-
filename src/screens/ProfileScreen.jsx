import { useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useSavedSearches } from '../hooks/useSavedSearches';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

const LANGUAGES = [
  { id: 'hebrew',  key: 'common.hebrew' },
  { id: 'english', key: 'common.english' },
  { id: 'both',    key: 'common.both' },
];

const NOTIF_PREFS = [
  { id: 'email', key: 'profileScreen.emailReminders' },
  { id: 'none',  key: 'profileScreen.noReminders' },
];

export default function ProfileScreen({ onOpenSubmit, onRunSearch }) {
  const { user, profile, refreshProfile, signOut } = useAuthContext();
  const { searches, remove: removeSearch } = useSavedSearches();
  const { t } = useLanguage();

  const [editing, setEditing]     = useState(false);
  const [name, setName]           = useState(profile?.name ?? '');
  const [hood, setHood]           = useState(profile?.neighborhood ?? '');
  const [bday, setBday]           = useState(profile?.baby_birthdate ?? '');
  const [babyName, setBabyName]   = useState(profile?.baby_name ?? '');
  const [lang, setLang]           = useState(profile?.language ?? '');
  const [notif, setNotif]         = useState(profile?.notification_pref ?? '');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  function openEdit() {
    setName(profile?.name ?? '');
    setHood(profile?.neighborhood ?? '');
    setBday(profile?.baby_birthdate ?? '');
    setBabyName(profile?.baby_name ?? '');
    setLang(profile?.language ?? '');
    setNotif(profile?.notification_pref ?? '');
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('profiles').upsert({
      id: user.id,
      name: name.trim() || profile?.name,
      neighborhood: hood.trim() || null,
      baby_birthdate: bday || null,
      baby_name: babyName.trim() || null,
      language: lang || null,
      notification_pref: notif || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    await refreshProfile();
    setEditing(false);
  }

  function babyAge(birthdate) {
    if (!birthdate) return null;
    const weeks = Math.floor((Date.now() - new Date(birthdate).getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (weeks < 8) return t('profileScreen.weeksOld', { n: weeks });
    const months = Math.round(weeks / 4.3);
    return months === 1 ? t('profileScreen.monthOld') : t('profileScreen.monthsOld', { n: months });
  }

  const pillCls = active =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      active
        ? 'bg-dusty-rose border-dusty-rose text-white'
        : 'border-stone-200 text-stone-600 bg-white'
    }`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-cream-50">
        <h2 className="text-xl font-semibold text-stone-800 leading-snug">{t('profileScreen.title')}</h2>
        <p className="text-xs text-stone-400 mt-0.5">{user?.email ?? user?.phone}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4 space-y-4">
        {/* Avatar + summary */}
        <div className="flex items-start gap-4 bg-white rounded-2xl border border-stone-100 p-4">
          <div className="w-14 h-14 rounded-full bg-dusty-rose flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">{(profile?.name ?? user?.email ?? '?')[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-stone-800 text-base">{profile?.name ?? t('profileScreen.noNameSet')}</p>
            {profile?.neighborhood && (
              <p className="text-xs text-stone-400 mt-0.5">{profile.neighborhood}</p>
            )}
            {profile?.baby_name && (
              <p className="text-xs text-dusty-roseDark mt-0.5">{t('profileScreen.mamaTo', { name: profile.baby_name })}</p>
            )}
            {profile?.baby_birthdate && (
              <p className="text-xs text-dusty-roseDark font-medium mt-0.5">🍼 {babyAge(profile.baby_birthdate)}</p>
            )}
            {(profile?.language || profile?.notification_pref) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {profile.language && (
                  <span className="px-2 py-0.5 rounded-full bg-sage-50 border border-sage-200 text-xs text-stone-500">
                    {LANGUAGES.find(l => l.id === profile.language)?.key ? t(LANGUAGES.find(l => l.id === profile.language).key) : profile.language}
                  </span>
                )}
                {profile.notification_pref && (
                  <span className="px-2 py-0.5 rounded-full bg-stone-50 border border-stone-200 text-xs text-stone-400">
                    {profile.notification_pref === 'none' ? t('profileScreen.noReminders') : t('profileScreen.emailReminders')}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={openEdit}
            className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-600 flex-shrink-0"
          >
            {t('common.edit')}
          </button>
        </div>

        {editing && (
          <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">{t('profileScreen.yourName')}</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-dusty-rose"
                placeholder={t('profileScreen.yourName')}
              />
            </div>

            {/* Baby name */}
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">{t('profileScreen.babyName')}</label>
              <input
                value={babyName}
                onChange={e => setBabyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-dusty-rose"
                placeholder={t('profileScreen.yourBabyName')}
              />
            </div>

            {/* Baby DOB */}
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">{t('profileScreen.babyDob')}</label>
              <input
                type="date"
                value={bday}
                onChange={e => setBday(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-dusty-rose"
              />
              {bday && (
                <p className="text-xs text-dusty-roseDark mt-1">{babyAge(bday)}</p>
              )}
            </div>

            {/* Neighborhood — free text */}
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">{t('profileScreen.neighborhood')}</label>
              <input
                value={hood}
                onChange={e => setHood(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-dusty-rose"
                placeholder={t('profileScreen.neighborhoodPlaceholder')}
              />
              <p className="text-xs text-stone-300 mt-1">{t('profileScreen.neighborhoodHint')}</p>
            </div>

            {/* Language */}
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">{t('profileScreen.preferredLanguage')}</label>
              <div className="flex gap-2">
                {LANGUAGES.map(l => (
                  <button key={l.id} onClick={() => setLang(lang === l.id ? '' : l.id)} className={pillCls(lang === l.id)}>
                    {t(l.key)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-300 mt-1">{t('profileScreen.languageHint')}</p>
            </div>

            {/* Notifications */}
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">{t('profileScreen.notifications')}</label>
              <div className="flex gap-2">
                {NOTIF_PREFS.map(n => (
                  <button key={n.id} onClick={() => setNotif(notif === n.id ? '' : n.id)} className={pillCls(notif === n.id)}>
                    {t(n.key)}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-blush">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2 rounded-xl border border-stone-200 text-xs text-stone-600"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-dusty-rose text-white text-xs font-semibold disabled:opacity-50"
              >
                {saving ? t('common.savingEllipsis') : t('common.save')}
              </button>
            </div>
          </div>
        )}

        {/* Saved searches */}
        {searches.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 p-4">
            <p className="text-xs font-semibold text-stone-600 mb-2.5">{t('profileScreen.savedSearches')}</p>
            <div className="space-y-2">
              {searches.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <button
                    onClick={() => onRunSearch?.({ query: s.query || '', area: s.area || 'all' })}
                    dir="auto"
                    className="flex-1 text-start px-3 py-2 rounded-xl bg-sage-50 border border-sage-200 text-sm text-stone-600 truncate"
                  >
                    {s.label || s.query || t('profileScreen.allActivities')}
                  </button>
                  <button
                    onClick={() => removeSearch(s.id)}
                    aria-label={t('profileScreen.removeSavedSearch')}
                    className="w-8 h-8 flex-shrink-0 rounded-xl border border-stone-200 text-stone-400 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-300 mt-2.5">{t('profileScreen.savedSearchesHint')}</p>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full py-3 rounded-2xl border border-stone-200 text-sm text-stone-600 bg-white"
        >
          {t('common.signOut')}
        </button>

        {onOpenSubmit && (
          <button
            onClick={onOpenSubmit}
            className="w-full py-3 rounded-2xl border border-dusty-roseLight text-sm text-dusty-roseDark bg-dusty-rosePale"
          >
            {t('profileScreen.submitActivity')}
          </button>
        )}
      </div>
    </div>
  );
}
