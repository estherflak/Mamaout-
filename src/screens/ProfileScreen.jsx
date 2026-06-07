import { useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const NEIGHBORHOODS = [
  'Tel Aviv Center', 'North TLV', 'South TLV', 'Florentine',
  'Ramat Aviv', 'Ramat Gan', 'Givatayim', 'Herzliya',
];

export default function ProfileScreen() {
  const { user, profile, refreshProfile, signOut } = useAuthContext();

  const [editing, setEditing]   = useState(false);
  const [name, setName]         = useState(profile?.name ?? '');
  const [hood, setHood]         = useState(profile?.neighborhood ?? '');
  const [bday, setBday]         = useState(profile?.baby_birthdate ?? '');
  const [babyName, setBabyName] = useState(profile?.baby_name ?? '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function save() {
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('profiles').upsert({
      id: user.id,
      name: name.trim() || profile?.name,
      neighborhood: hood || profile?.neighborhood,
      baby_birthdate: bday || profile?.baby_birthdate,
      baby_name: babyName.trim() || null,
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-cream-50">
        <h2 className="text-xl font-semibold text-stone-800 leading-snug">Profile</h2>
        <p className="text-xs text-stone-400 mt-0.5">{user?.email ?? user?.phone}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4 space-y-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-4 bg-white rounded-2xl border border-stone-100 p-4">
          <div className="w-14 h-14 rounded-full bg-dusty-rose flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">{(profile?.name ?? user?.email ?? '?')[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-stone-800 text-base">{profile?.name ?? 'No name set'}</p>
            <p className="text-xs text-stone-400 mt-0.5">{profile?.neighborhood ?? 'No neighborhood set'}</p>
            {profile?.baby_name && (
              <p className="text-xs text-dusty-roseDark mt-0.5">mama to {profile.baby_name} 🌸</p>
            )}
            {profile?.baby_birthdate && (
              <p className="text-xs text-dusty-roseDark font-medium mt-0.5">🍼 {babyAge(profile.baby_birthdate)}</p>
            )}
          </div>
          <button
            onClick={() => {
              setName(profile?.name ?? '');
              setHood(profile?.neighborhood ?? '');
              setBday(profile?.baby_birthdate ?? '');
              setBabyName(profile?.baby_name ?? '');
              setEditing(true);
            }}
            className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-600"
          >
            Edit
          </button>
        </div>

        {editing && (
          <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-dusty-rose"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Baby's name</label>
              <input
                value={babyName}
                onChange={e => setBabyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-dusty-rose"
                placeholder="Your baby's name"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Neighborhood</label>
              <div className="flex flex-wrap gap-2">
                {NEIGHBORHOODS.map(n => (
                  <button
                    key={n}
                    onClick={() => setHood(n)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      hood === n
                        ? 'bg-dusty-rose border-dusty-rose text-white'
                        : 'border-stone-200 text-stone-600 bg-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Baby's birthday</label>
              <input
                type="date"
                value={bday}
                onChange={e => setBday(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-dusty-rose"
              />
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
      </div>
    </div>
  );
}
