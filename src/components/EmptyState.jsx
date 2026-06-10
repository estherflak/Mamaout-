const DATE_LABELS = {
  today:    'today',
  tomorrow: 'tomorrow',
  week:     'this week',
  weekend:  'this weekend',
};

export default function EmptyState({ query, dateFilter, onClearDate }) {
  if (dateFilter) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <span className="text-5xl mb-4">📅</span>
        <h3 className="text-stone-700 font-medium text-lg mb-2">
          Nothing {DATE_LABELS[dateFilter] || dateFilter}
        </h3>
        <p className="text-stone-400 text-sm max-w-xs leading-relaxed mb-5">
          Check back later — new sessions are added weekly.
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

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-5xl mb-4">🌸</span>
      <h3 className="text-stone-700 font-medium text-lg mb-2">
        Nothing found{query ? ` for "${query}"` : ''}
      </h3>
      <p className="text-stone-400 text-sm max-w-xs leading-relaxed">
        Try a different search or clear the filters — new activities are added regularly.
      </p>
    </div>
  );
}
