import { useState } from 'react';

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-IL', { weekday: 'short', day: 'numeric', month: 'short' });
}

function SaveSearch({ canSave, onSaveSearch }) {
  const [state, setState] = useState('idle'); // idle | saving | saved | duplicate

  if (!canSave) {
    return (
      <p className="text-xs text-stone-300">Sign in to save this search and we'll keep an eye out.</p>
    );
  }

  if (state === 'saved' || state === 'duplicate') {
    return (
      <p className="text-xs text-sage-500 font-medium">
        {state === 'saved' ? '✓ Saved — we\'ll keep an eye out' : '✓ Already in your saved searches'}
      </p>
    );
  }

  async function handleSave() {
    setState('saving');
    const res = await onSaveSearch();
    setState(res?.duplicate ? 'duplicate' : res?.saved ? 'saved' : 'idle');
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs text-stone-400">Want to know when one is added?</p>
      <button
        onClick={handleSave}
        disabled={state === 'saving'}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-dusty-rose text-dusty-roseDark text-sm font-medium disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {state === 'saving' ? 'Saving…' : 'Save this search'}
      </button>
    </div>
  );
}

export default function EmptyState({ query, dateFilter, onClearDate, onClearSearch, canSave, onSaveSearch }) {
  // Search/category came up empty — lead with that, even if a day is also selected.
  if (query?.trim()) {
    const term = query.trim();
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <span className="text-5xl mb-4">🌱</span>
        <h3 dir="auto" className="text-stone-700 font-medium text-lg mb-2">
          No {term} {dateFilter ? `on ${formatDateLabel(dateFilter)}` : 'yet'}
        </h3>
        <p className="text-stone-400 text-sm max-w-xs leading-relaxed mb-5">
          We're adding new activities every week. Try clearing this search or browsing everything.
        </p>
        <div className="flex flex-col gap-3 items-center">
          {onSaveSearch && <SaveSearch canSave={canSave} onSaveSearch={onSaveSearch} />}
          {onClearSearch && (
            <button
              onClick={onClearSearch}
              className="px-4 py-2 rounded-full bg-dusty-rose text-white text-sm font-medium"
            >
              Browse all activities
            </button>
          )}
          {dateFilter && onClearDate && (
            <button
              onClick={onClearDate}
              className="text-xs text-stone-400 underline underline-offset-2"
            >
              Show {term} on any day
            </button>
          )}
        </div>
      </div>
    );
  }

  // No search, but a specific day is selected
  if (dateFilter) {
    const label = formatDateLabel(dateFilter);
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <span className="text-5xl mb-4">📅</span>
        <h3 className="text-stone-700 font-medium text-lg mb-2">
          Nothing on {label}
        </h3>
        <p className="text-stone-400 text-sm max-w-xs leading-relaxed mb-5">
          No sessions scheduled — try another day or browse all.
        </p>
        {onClearDate && (
          <button
            onClick={onClearDate}
            className="px-4 py-2 rounded-full bg-dusty-rose text-white text-sm font-medium"
          >
            Browse all activities
          </button>
        )}
      </div>
    );
  }

  // Generic (filters/area narrowed everything out)
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-5xl mb-4">🌸</span>
      <h3 className="text-stone-700 font-medium text-lg mb-2">
        Nothing matches your filters
      </h3>
      <p className="text-stone-400 text-sm max-w-xs leading-relaxed">
        Try widening the area or age range — new activities are added regularly.
      </p>
    </div>
  );
}
