import { useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const LANGUAGES = [
  { id: 'hebrew',  label: 'Hebrew' },
  { id: 'english', label: 'English' },
  { id: 'both',    label: 'Both' },
];

const NOTIF_PREFS = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'none',     label: 'None' },
];

export default function ProfileScreen({ onOpenSubmit }) {
  const { user, profile, refreshProfile, signOut } = useAuthContext();

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
    if (weeks < 8) return `${weeks} weeks old`;
    const months = Math.round(weeks / 4.3);
    return `${months} month${months !== 1 ? 's' : ''} old`;
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
        <h2 className="text-xl font-semibold text-stone-800 leading-snug">Profile</h2>
        <p className="text-xs text-stone-400 mt-0.5">{user?.email ?? user?.phone}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4 space-y-4">
        {/* Avatar + summary */}
        <div className="flex items-start gap-4 bg-white rounded-2xl border border-stone-100 p-4">
          <div className="w-14 h-14 rounded-full bg-dusty-rose flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">{(profile?.name ?? user?.email ?? '?')[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-stone-800 text-base">{profile?.name ?? 'No name set'}</p>
            {profile?.neighborhood && (
              <p className="text-xs text-stone-400 mt-0.5">{profile.neighborhood}</p>
            )}
            {profile?.baby_name && (
              <p className="text-xs text-dusty-roseDark mt-0.5">mama to {profile.baby_name} 🌸</p>
            )}
            {profile?.baby_birthdate && (
              <p className="text-xs text-dusty-roseDark font-medium mt-0.5">🍼 {babyAge(profile.baby_birthdate)}</p>
            )}
            {(profile?.language || profile?.notification_pref) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {profile.language && (
                  <span className="px-2 py-0.5 rounded-full bg-sage-50 border border-sage-200 text-xs text-stone-500">
                    {LANGUAGES.find(l => l.id === profile.language)?.label ?? profile.language}
                  </span>
                )}
                {profile.notification_pref && (
                  <span className="px-2 py-0.5 rounded-full bg-stone-50 border border-stone-200 text-xs text-stone-400">
                    {profile.notification_pref === 'whatsapp' ? '💬 WhatsApp' : '🔕 No notifications'}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={openEdit}
            className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-600 flex-shrink-0"
          >
            Edit
          </button>
        </div>

        {editing && (
          <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Your name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-dusty-rose"
                placeholder="Your name"
              />
            </div>

            {/* Baby name */}
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Baby's name</label>
              <input
                value={babyName}
                onChange={e => setBabyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-dusty-rose"
                placeholder="Your baby's name"
              />
            </div>

            {/* Baby DOB */}
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Baby's date of birth</label>
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
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Neighborhood</label>
              <input
                value={hood}
                onChange={e => setHood(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-dusty-rose"
                placeholder="e.g. Florentin, Ramat Aviv, Ramat Gan"
              />
              <p className="text-xs text-stone-300 mt-1">Used to pre-select your area in Discover</p>
            </div>

            {/* Language */}
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Preferred language</label>
              <div className="flex gap-2">
                {LANGUAGES.map(l => (
                  <button key={l.id} onClick={() => setLang(lang === l.id ? '' : l.id)} className={pillCls(lang === l.id)}>
                    {l.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-300 mt-1">Filters activities by language in Discover</p>
            </div>

            {/* Notifications */}
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Notifications</label>
              <div className="flex gap-2">
                {NOTIF_PREFS.map(n => (
                  <button key={n.id} onClick={() => setNotif(notif === n.id ? '' : n.id)} className={pillCls(notif === n.id)}>
                    {n.id === 'whatsapp' ? '💬 ' : ''}{n.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2 rounded-xl border border-stone-200 text-xs text-stone-600"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-dusty-rose text-white text-xs font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full py-3 rounded-2xl border border-stone-200 text-sm text-stone-600 bg-white"
        >
          Sign out
        </button>

        {onOpenSubmit && (
          <button
            onClick={onOpenSubmit}
            className="w-full py-3 rounded-2xl border border-dusty-roseLight text-sm text-dusty-roseDark bg-dusty-rosePale"
          >
            Submit your activity
          </button>
        )}
      </div>
    </div>
  );
}
