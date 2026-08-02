import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const INTERESTS = [
  { id: 'movement',     key: 'onboardingScreen.interests.movement' },
  { id: 'wellness',     key: 'onboardingScreen.interests.wellness' },
  { id: 'creative',     key: 'onboardingScreen.interests.creative' },
  { id: 'social',       key: 'onboardingScreen.interests.social' },
  { id: 'baby-focused', key: 'onboardingScreen.interests.baby' },
];

const FREE_DAYS = [
  { id: 'sunday' },
  { id: 'monday' },
  { id: 'tuesday' },
  { id: 'wednesday' },
  { id: 'thursday' },
  { id: 'friday' },
  { id: 'saturday' },
];

const LANGUAGES = [
  { id: 'hebrew',  key: 'common.hebrew' },
  { id: 'english', key: 'common.english' },
  { id: 'both',    key: 'common.both' },
];

export default function OnboardingScreen() {
  const { user, profile, refreshProfile, patchProfile, signOut } = useAuthContext();
  const { t } = useLanguage();
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
    const patch = {
      id: user.id,
      name: profile?.name || user.email?.split('@')[0] || 'Mama',
      baby_name: babyName.trim() || null,
      baby_birthdate: birthdate || null,
      language: language || null,
      interests,
      free_days: freeDays,
      onboarding_done: true,
    };
    const { error: e } = await supabase.from('profiles').upsert(patch);
    if (e) { setError(e.message); setLoading(false); return; }
    // Apply locally first so the app navigates immediately — never leave the
    // user stuck on this screen waiting for a profile re-fetch.
    patchProfile(patch);
    refreshProfile();
  }

  const chipCls = active =>
    `px-4 py-2.5 rounded-full text-sm font-medium border transition-colors ${
      active ? 'bg-plum border-plum text-cream' : 'bg-card border-warmline text-plum'
    }`;

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-warmline bg-card text-plum placeholder-plum-disabled focus:outline-none focus:ring-2 focus:ring-lilac text-sm';

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className="text-center">
            <div className="text-5xl mb-4">☀️</div>
            <h1 className="text-2xl font-serif font-bold text-plum mb-2">{t('onboardingScreen.welcome')}</h1>
            <p className="text-plum-soft text-sm mb-2">
              {t('onboardingScreen.findActivities')}
            </p>
            <p className="text-plum-soft text-xs mb-10">
              {t('onboardingScreen.letsPersonalize')}
            </p>
            <button
              onClick={() => setStep(1)}
              className="w-full py-3.5 rounded-xl font-semibold text-plum bg-butter active:scale-[0.98] transition-transform text-sm"
            >
              {t('onboardingScreen.letsGo')}
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
                    step >= i ? 'bg-plum' : 'bg-lilac-pale'
                  }`}
                />
              ))}
            </div>

            {/* Step 1 — Baby info */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-serif font-bold text-plum mb-1">{t('onboardingScreen.aboutYourBaby')}</h2>
                <p className="text-sm text-plum-soft mb-6">{t('onboardingScreen.fewBasics')}</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-plum-soft mb-1.5 block">
                      {t('onboardingScreen.birthdate')}
                    </label>
                    <input
                      className={inputCls}
                      type="date"
                      value={birthdate}
                      onChange={e => setBirthdate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-plum-disabled mt-1">
                      {t('onboardingScreen.birthdateHint')}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-plum-soft mb-1.5 block">
                      {t('onboardingScreen.babyName')}
                    </label>
                    <input
                      className={inputCls}
                      placeholder={t('onboardingScreen.babyNamePlaceholder')}
                      value={babyName}
                      onChange={e => setBabyName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-plum-soft mb-1.5 block">
                      {t('onboardingScreen.preferredLanguage')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map(({ id, key }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setLanguage(language === id ? '' : id)}
                          className={chipCls(language === id)}
                        >
                          {t(key)}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-plum-disabled mt-1">
                      {t('onboardingScreen.prioritizeLanguage')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Interests */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-serif font-bold text-plum mb-1">{t('onboardingScreen.whatSoundsGood')}</h2>
                <p className="text-sm text-plum-soft mb-6">
                  {t('onboardingScreen.pickAtLeastOne')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(({ id, key }) => (
                    <button key={id} onClick={() => toggleInterest(id)} className={chipCls(interests.includes(id))}>
                      {t(key)}
                    </button>
                  ))}
                </div>
                {interests.length === 0 && (
                  <p className="text-xs text-blush mt-3">{t('onboardingScreen.pickAtLeastOneToContinue')}</p>
                )}
              </div>
            )}

            {/* Step 3 — Free days */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-serif font-bold text-plum mb-1">{t('onboardingScreen.whenFree')}</h2>
                <p className="text-sm text-plum-soft mb-6">{t('onboardingScreen.optionalSkip')}</p>
                <div className="flex flex-wrap gap-2">
                  {FREE_DAYS.map(({ id }) => (
                    <button key={id} onClick={() => toggleDay(id)} className={chipCls(freeDays.includes(id))}>
                      {t(`days.shortByFullId.${id}`)}
                    </button>
                  ))}
                </div>
                {error && (
                  <div className="mt-4 px-3 py-2 bg-blush/10 border border-blush/30 rounded-lg text-xs text-blush">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-xl border border-warmline text-sm text-plum font-medium active:scale-[0.98] transition-transform"
              >
                {t('onboardingScreen.back')}
              </button>
              {step < 3 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 2 && interests.length === 0}
                  className="flex-1 py-3 rounded-xl font-semibold text-plum bg-butter active:scale-[0.98] transition-transform text-sm disabled:opacity-40"
                >
                  {t('onboardingScreen.next')}
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl font-semibold text-plum bg-butter active:scale-[0.98] transition-transform text-sm disabled:opacity-60"
                >
                  {loading ? t('common.savingEllipsis') : t('onboardingScreen.doneEmoji')}
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
              className="text-xs text-plum-soft underline disabled:opacity-50"
            >
              {t('onboardingScreen.skipForNow')}
            </button>
          )}
          <button onClick={signOut} className="text-xs text-plum-disabled underline">
            {t('common.signOut')}
          </button>
        </div>
      </div>
    </div>
  );
}
