import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

const INTERESTS = [
  { id: 'movement',     label: '🧘 Movement',    desc: 'Yoga, dance, fitness' },
  { id: 'wellness',     label: '🌿 Wellness',     desc: 'Massage, mindfulness' },
  { id: 'creative',     label: '🎨 Creative',     desc: 'Art, crafts, music' },
  { id: 'social',       label: '👯 Social',       desc: 'Meetups, mama groups' },
  { id: 'baby-focused', label: '👶 Baby-focused', desc: 'Sensory, swim, play' },
];

const FREE_DAYS = [
  { id: 'sunday',    label: 'Sun' },
  { id: 'monday',    label: 'Mon' },
  { id: 'tuesday',   label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday',  label: 'Thu' },
  { id: 'friday',    label: 'Fri' },
  { id: 'saturday',  label: 'Sat' },
];

const LANGUAGES = [
  { id: 'hebrew',  label: 'Hebrew' },
  { id: 'english', label: 'English' },
  { id: 'both',    label: 'Both' },
];

export default function OnboardingScreen() {
  const { user, profile, refreshProfile, signOut } = useAuthContext();
  const [step, setStep]           = useState(0);
  const [babyName, setBabyName]   = useState(profile?.baby_name || '');
  const [birthdate, setBirthdate] = useState(profile?.baby_birthdate || '');
  const [language, setLanguage]   = useState(profile?.language || '');
  const [interests, setInterests] = useState(profile?.interests || []);
  const [freeDays, setFreeDays]   = useState(profile?.free_days || []);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  function toggleInterest(id) {
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleDay(id) {
    setFreeDays(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleFinish() {
    setError(''); setLoading(true);
    const { error: e } = await supabase.from('profiles').upsert({
      id: user.id,
      name: profile?.name || user.email?.split('@')[0] || 'Mama',
      baby_name: babyName.trim() || null,
      baby_birthdate: birthdate || null,
      language: language || null,
      interests,
      free_days: freeDays,
      onboarding_done: true,
    });
    if (e) { setError(e.message); setLoading(false); return; }
    await refreshProfile();
    setLoading(false);
  }

  const chipCls = active =>
    `px-4 py-2.5 rounded-full text-sm font-medium border transition-colors ${
      active ? 'bg-dusty-rose border-dusty-rose text-white' : 'bg-white border-stone-200 text-stone-600'
    }`;

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-dusty-rose text-sm';

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className="text-center">
            <div className="text-5xl mb-4">🌸</div>
            <h1 className="text-2xl font-bold text-stone-800 mb-2">Welcome to MamaOut!</h1>
            <p className="text-stone-500 text-sm mb-2">
              Find activities you'll actually want to do with your baby.
            </p>
            <p className="text-stone-400 text-xs mb-10">
              Let's personalise your experience in 3 quick steps.
            </p>
            <button
              onClick={() => setStep(1)}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-dusty-rose active:scale-[0.98] transition-transform text-sm"
            >
              Let's go! →
            </button>
          </div>
        )}

        {/* Steps 1–3 */}
        {step > 0 && (
          <>
            {/* Progress dots */}
            <div className="flex gap-1.5 justify-center mb-8">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    step >= i ? 'bg-dusty-rose' : 'bg-stone-200'
                  }`}
                />
              ))}
            </div>

            {/* Step 1 — Baby info */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold text-stone-800 mb-1">About your baby</h2>
                <p className="text-sm text-stone-400 mb-6">A few basics so we can tailor what you see</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-stone-500 mb-1.5 block">
                      Baby's birthdate (optional)
                    </label>
                    <input
                      className={inputCls}
                      type="date"
                      value={birthdate}
                      onChange={e => setBirthdate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-stone-300 mt-1">
                      Used to suggest age-appropriate activities. Expecting? Leave it blank for now.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-500 mb-1.5 block">
                      Baby's name (optional)
                    </label>
                    <input
                      className={inputCls}
                      placeholder="e.g. Noa"
                      value={babyName}
                      onChange={e => setBabyName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-500 mb-1.5 block">
                      Preferred language (optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setLanguage(language === id ? '' : id)}
                          className={chipCls(language === id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-stone-300 mt-1">
                      We'll prioritise activities in your language
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Interests */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold text-stone-800 mb-1">What sounds good to you?</h2>
                <p className="text-sm text-stone-400 mb-6">
                  Pick at least one — we'll show you what fits
                </p>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(({ id, label }) => (
                    <button key={id} onClick={() => toggleInterest(id)} className={chipCls(interests.includes(id))}>
                      {label}
                    </button>
                  ))}
                </div>
                {interests.length === 0 && (
                  <p className="text-xs text-amber-500 mt-3">Pick at least one to continue</p>
                )}
              </div>
            )}

            {/* Step 3 — Free days */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-bold text-stone-800 mb-1">When are you usually free?</h2>
                <p className="text-sm text-stone-400 mb-6">Optional — skip if you're not sure yet</p>
                <div className="flex flex-wrap gap-2">
                  {FREE_DAYS.map(({ id, label }) => (
                    <button key={id} onClick={() => toggleDay(id)} className={chipCls(freeDays.includes(id))}>
                      {label}
                    </button>
                  ))}
                </div>
                {error && (
                  <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-xl border border-stone-200 text-sm text-stone-600 font-medium active:scale-[0.98] transition-transform"
              >
                ← Back
              </button>
              {step < 3 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 2 && interests.length === 0}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-dusty-rose active:scale-[0.98] transition-transform text-sm disabled:opacity-40"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-dusty-rose active:scale-[0.98] transition-transform text-sm disabled:opacity-60"
                >
                  {loading ? 'Saving…' : 'Done! 🌸'}
                </button>
              )}
            </div>
          </>
        )}

        {/* Escape hatches — never trap a logged-in user on this screen */}
        <div className="mt-8 flex items-center justify-center gap-4">
          {step > 0 && (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="text-xs text-stone-400 underline disabled:opacity-50"
            >
              Skip for now
            </button>
          )}
          <button onClick={signOut} className="text-xs text-stone-300 underline">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
