import { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const LANGUAGES = [
  { id: 'hebrew',  key: 'common.hebrew' },
  { id: 'english', key: 'common.english' },
  { id: 'both',    key: 'common.both' },
];

function babyAgeWeeks(birthdate) {
  if (!birthdate) return null;
  const diff = Date.now() - new Date(birthdate).getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

export default function FilterPanel({ filters, onChange, isOpen, onToggle }) {
  const { profile } = useAuthContext();
  const { t } = useLanguage();
  const defaultAge = babyAgeWeeks(profile?.baby_birthdate);

  const [ageMax, setAgeMax] = useState(filters.ageMax ?? (defaultAge ?? 52));
  const [language, setLanguage] = useState(filters.language ?? '');
  const rootRef = useRef(null);

  // Close the dropdown when tapping/clicking anywhere outside it (mobile + desktop)
  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) onToggle();
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen, onToggle]);

  // Keep local state in sync when filters change from outside (e.g. profile init)
  useEffect(() => {
    setAgeMax(filters.ageMax ?? (defaultAge ?? 52));
  }, [filters.ageMax]);

  useEffect(() => {
    setLanguage(filters.language ?? '');
  }, [filters.language]);

  function apply() {
    onChange({ ageMax, language: language || null });
    onToggle();
  }

  function reset() {
    const resetAge = defaultAge ?? 52;
    setAgeMax(resetAge);
    setLanguage('');
    onChange({ ageMax: null, language: null });
  }

  const hasFilters = filters.ageMax != null || filters.language != null;

  const pillCls = active =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      active
        ? 'bg-dusty-rose border-dusty-rose text-white'
        : 'border-stone-200 text-stone-500 bg-white'
    }`;

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
          hasFilters
            ? 'border-dusty-rose bg-dusty-rose/10 text-dusty-roseDark'
            : 'border-stone-200 bg-white text-stone-600'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
        </svg>
        {t('filterPanel.filters')}
        {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-dusty-rose" />}
      </button>

      {isOpen && (
        <div className="absolute end-0 top-full mt-2 w-72 bg-white rounded-2xl border border-stone-100 shadow-lg p-4 space-y-5 z-50">
          {/* Age filter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-600">{t('filterPanel.babyAgeUpTo')}</span>
              <span className="text-xs text-dusty-roseDark font-medium">
                {ageMax < 8 ? t('common.weeksValue', { n: ageMax }) : t('common.monthsValue', { n: Math.round(ageMax / 4.3) })}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={52}
              value={ageMax}
              onChange={e => setAgeMax(Number(e.target.value))}
              className="w-full accent-dusty-rose"
            />
            <div className="flex justify-between text-xs text-stone-300 mt-0.5">
              <span>{t('filterPanel.newborn')}</span>
              <span>{t('filterPanel.twelveMonths')}</span>
            </div>
          </div>

          {/* Language filter */}
          <div>
            <span className="text-xs font-semibold text-stone-600 block mb-2">{t('filterPanel.activityLanguage')}</span>
            <div className="flex gap-2 flex-wrap">
              {LANGUAGES.map(l => (
                <button
                  key={l.id}
                  onClick={() => setLanguage(language === l.id ? '' : l.id)}
                  className={pillCls(language === l.id)}
                >
                  {t(l.key)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-2 rounded-xl border border-stone-200 text-xs text-stone-600">
              {t('filterPanel.reset')}
            </button>
            <button onClick={apply} className="flex-1 py-2 rounded-xl bg-dusty-rose text-white text-xs font-semibold">
              {t('filterPanel.apply')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function applyFilters(activities, { ageMax, language }) {
  let r = activities;
  if (ageMax != null) r = r.filter(a => a.ageFrom <= ageMax);
  if (language && language !== 'both') {
    const code = language === 'hebrew' ? 'he' : 'en';
    // Activities marked 'both' are held in both languages — they match either.
    r = r.filter(a => !a.language || a.language === 'both' || a.language === code);
  }
  return r;
}
