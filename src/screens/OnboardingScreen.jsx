import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

const NEIGHBORHOODS = [
  'Old North', 'Florentin', 'Neve Tzedek', 'Jaffa', 'Ramat Aviv',
  'Lev Tel Aviv', 'Ramat Gan', 'Givatayim', 'Other',
];

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuthContext();
  const [name, setName]           = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [phone, setPhone]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('Please enter your name'); return; }
    setError(''); setLoading(true);

    const { error: e } = await supabase.from('profiles').upsert({
      id: user.id,
      name: name.trim(),
      neighborhood: neighborhood || null,
      baby_birthdate: birthdate || null,
      phone: phone || null,
    });

    if (e) { setError(e.message); setLoading(false); return; }
    await refreshProfile();
    setLoading(false);
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-dusty-rose text-sm';

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">👶</div>
          <h1 className="text-2xl font-bold text-stone-800">Welcome!</h1>
          <p className="text-sm text-stone-400 mt-1">Tell us a little about yourself</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Your name *</label>
            <input className={inputCls} placeholder="e.g. Noa" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Phone number (so friends can find you)</label>
            <input className={inputCls} type="tel" placeholder="05X-XXX-XXXX" value={phone} onChange={e => setPhone(e.target.value)} />
            <p className="text-xs text-stone-300 mt-1">Used to match you with friends — not shared publicly</p>
          </div>

          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Your neighborhood</label>
            <div className="flex flex-wrap gap-2">
              {NEIGHBORHOODS.map(n => (
                <button
                  key={n}
                  onClick={() => setNeighborhood(n === neighborhood ? '' : n)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    neighborhood === n
                      ? 'bg-dusty-rose border-dusty-rose text-white'
                      : 'bg-white border-stone-200 text-stone-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Baby's birth date (optional)</label>
            <input
              className={inputCls}
              type="date"
              value={birthdate}
              onChange={e => setBirthdate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-stone-300 mt-1">Used to suggest age-appropriate activities</p>
          </div>

          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="w-full py-3 rounded-xl font-semibold text-white bg-dusty-rose active:scale-[0.98] transition-transform text-sm disabled:opacity-60"
          >
            {loading ? 'Saving…' : "Let's go! 🌸"}
          </button>
        </div>
      </div>
    </div>
  );
}
