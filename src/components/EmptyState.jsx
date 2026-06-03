export default function EmptyState({ query }) {
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
