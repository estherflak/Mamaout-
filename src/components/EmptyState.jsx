function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-IL', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function EmptyState({ query, dateFilter, onClearDate }) {
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
