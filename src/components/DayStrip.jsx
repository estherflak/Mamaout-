import { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DayStrip({
  activities,
  selectedDay,
  onDaySelect,
  dateRange,
  onRangeSelect,
  napTime,
  onNapTimeToggle,
  napTimeValue,
  onNapTimeChange,
}) {
  const { lang, t } = useLanguage();
  const locale = lang === 'he' ? 'he-IL' : 'en-IL';

  // 30 days out — matches how far ahead the scrapers reliably have data.
  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      result.push(d);
    }
    return result;
  }, []);

  const datesWithActivity = useMemo(() => {
    const set = new Set();
    activities.forEach(a => a.nextDates?.forEach(s => set.add(s)));
    return set;
  }, [activities]);

  return (
    <div className="space-y-2">
      {/* Day pills — a month label separates the strip at each month boundary
          so identical day numbers (e.g. two "15"s) stay unambiguous. */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {days.map((d, i) => {
          const dateStr = toLocalDateStr(d);
          const isSelected = selectedDay === dateStr;
          const hasDot = datesWithActivity.has(dateStr);
          const weekday = d.toLocaleDateString(locale, { weekday: 'short' });
          const dayNum = d.getDate();
          const newMonth = i > 0 && d.getMonth() !== days[i - 1].getMonth();

          return (
            <div key={dateStr} className="flex-shrink-0 flex gap-2">
              {newMonth && (
                <div className="flex flex-col items-center justify-center px-0.5">
                  <span className="text-[10px] font-semibold text-plum-soft [writing-mode:vertical-rl] rotate-180">
                    {d.toLocaleDateString(locale, { month: 'short' })}
                  </span>
                </div>
              )}
              <button
                onClick={() => onDaySelect(isSelected ? null : dateStr)}
                aria-label={d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
                className={`flex flex-col items-center px-3 pt-2 pb-1.5 rounded-2xl border transition-colors ${
                  isSelected
                    ? 'bg-plum border-plum text-cream'
                    : 'bg-card border-warmline text-plum'
                }`}
              >
                <span className="text-[10px] font-medium leading-none mb-0.5">{weekday}</span>
                <span className="text-sm font-bold leading-none">{dayNum}</span>
                <span className={`w-1 h-1 rounded-full mt-1 ${
                  hasDot
                    ? isSelected ? 'bg-cream/70' : 'bg-lilac'
                    : 'bg-transparent'
                }`} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick filters: date ranges + nap time */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide items-center">
        {[
          { id: 'week',     label: t('dayStrip.thisWeek') },
          { id: 'weekend',  label: t('dayStrip.weekend') },
          { id: 'nextWeek', label: t('dayStrip.nextWeek') },
        ].map(r => (
          <button
            key={r.id}
            onClick={() => onRangeSelect?.(r.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              dateRange === r.id
                ? 'bg-plum border-plum text-cream'
                : 'bg-card border-warmline text-plum-soft'
            }`}
          >
            {r.label}
          </button>
        ))}

        <button
          onClick={onNapTimeToggle}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            napTime
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-card border-warmline text-plum-soft'
          }`}
        >
          <span>⏰</span>
          {t('dayStrip.backByNapTime')}
        </button>

        {napTime && (
          <input
            type="time"
            value={napTimeValue || '12:00'}
            onChange={e => onNapTimeChange?.(e.target.value)}
            onClick={e => e.stopPropagation()}
            className="flex-shrink-0 px-2 py-1 rounded-full text-xs border border-amber-300 bg-amber-50 text-amber-700 outline-none"
          />
        )}
      </div>
    </div>
  );
}
