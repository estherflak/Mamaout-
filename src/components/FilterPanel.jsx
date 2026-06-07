import { useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';

const DATE_OPTIONS = [
  { id: 'today',    label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'week',     label: 'This week' },
  { id: 'weekend',  label: 'Weekend' },
];

function babyAgeWeeks(birthdate) {
  if (!birthdate) return null;
  const diff = Date.now() - new Date(birthdate).getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

export default function FilterPanel({ filters, onChange, isOpen, onToggle }) {
  const { profile } = useAuthContext();
  const defaultAge = babyAgeWeeks(profile?.baby_birthdate);

  const [ageMax, setAgeMax]     = useState(filters.ageMax ?? (defaultAge ?? 52));
  const [dateFilter, setDateFilter] = useState(filters.dateFilter ?? null);

  function apply() {
    onChange({ ageMax, dateFilter });
    onToggle();
  }

  function reset() {
    setAgeMax(defaultAge ?? 52);
    setDateFilter(null);
    onChange({ ageMax: null, dateFilter: null });
  }

  const hasFilters = filters.ageMax != null || filters.dateFilter != null;

  return (
    <>
      {/* Toggle button */}
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
        Filters
        {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-dusty-rose" />}
      </button>

      {/* Slide-down panel */}
      {isOpen && (
        <div className="mt-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-5">
          {/* Age filter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-600">Baby age (up to)</span>
              <span className="text-xs text-dusty-roseDark font-medium">
                {ageMax < 8 ? `${ageMax} weeks` : `${Math.round(ageMax / 4.3)} months`}
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
              <span>Newborn</span>
              <span>12 months</span>
            </div>
          </div>

          {/* Date filter */}
          <div>
            <span className="text-xs font-semibold text-stone-600 block mb-2">Date</span>
            <div className="flex flex-wrap gap-2">
              {DATE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setDateFilter(dateFilter === opt.id ? null : opt.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    dateFilter === opt.id
                      ? 'bg-dusty-rose border-dusty-rose text-white'
                      : 'bg-white border-stone-200 text-stone-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-2 rounded-xl border border-stone-200 text-xs text-stone-600">
              Reset
            </button>
            <button onClick={apply} className="flex-1 py-2 rounded-xl bg-dusty-rose text-white text-xs font-semibold">
              Apply
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function applyFilters(activities, { ageMax, dateFilter }) {
  let results = activities;

  if (ageMax != null) {
    results = results.filter(a => a.ageFrom <= ageMax);
  }

  if (dateFilter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);

    // Weekend = Friday + Saturday in Israel
    const dayOfWeek = today.getDay();
    const daysToFri = (5 - dayOfWeek + 7) % 7;
    const fri = new Date(today); fri.setDate(today.getDate() + daysToFri);
    const sat = new Date(fri); sat.setDate(fri.getDate() + 1);

    results = results.filter(a => {
      if (!a.eventDate) return true; // recurring — always show
      const d = new Date(a.eventDate.getFullYear(), a.eventDate.getMonth(), a.eventDate.getDate());
      switch (dateFilter) {
        case 'today':    return d.getTime() === today.getTime();
        case 'tomorrow': return d.getTime() === tomorrow.getTime();
        case 'week':     return d >= today && d <= weekEnd;
        case 'weekend':  return d.getTime() === fri.getTime() || d.getTime() === sat.getTime();
        default:         return true;
      }
    });
  }

  return results;
}
