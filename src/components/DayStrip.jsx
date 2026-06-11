import { useMemo } from 'react';

function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DayStrip({ activities, selectedDay, onDaySelect, napTime, onNapTimeToggle }) {
  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      result.push(d);
    }
    return result;
  }, []);

  // Build set of dates that have at least one activity
  const datesWithActivity = useMemo(() => {
    const set = new Set();
    activities.forEach(a => a.nextDates?.forEach(s => set.add(s)));
    return set;
  }, [activities]);

  return (
    <div className="space-y-2">
      {/* Day pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {days.map(d => {
          const dateStr = toLocalDateStr(d);
          const isSelected = selectedDay === dateStr;
          const hasDot = datesWithActivity.has(dateStr);
          const weekday = d.toLocaleDateString('en-IL', { weekday: 'short' });
          const dayNum = d.getDate();

          return (
            <button
              key={dateStr}
              onClick={() => onDaySelect(isSelected ? null : dateStr)}
              className={`flex-shrink-0 flex flex-col items-center px-3 pt-2 pb-1.5 rounded-2xl border transition-colors ${
                isSelected
                  ? 'bg-dusty-rose border-dusty-rose text-white'
                  : 'bg-white border-stone-200 text-stone-600'
              }`}
            >
              <span className="text-[10px] font-medium leading-none mb-0.5">{weekday}</span>
              <span className="text-sm font-bold leading-none">{dayNum}</span>
              <span className={`w-1 h-1 rounded-full mt-1 ${
                hasDot
                  ? isSelected ? 'bg-white/70' : 'bg-dusty-rose'
                  : 'bg-transparent'
              }`} />
            </button>
          );
        })}
      </div>

      {/* Nap time toggle */}
      <button
        onClick={onNapTimeToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          napTime
            ? 'bg-amber-50 border-amber-300 text-amber-700'
            : 'bg-white border-stone-200 text-stone-500'
        }`}
      >
        <span>⏰</span>
        Back by nap time
      </button>
    </div>
  );
}
