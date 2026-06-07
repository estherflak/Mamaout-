import { useFavorites } from '../hooks/useFavorites';
import ActivityCard from '../components/ActivityCard';

export default function SavedScreen({ onSelect }) {
  const { favoritedActivities, loading } = useFavorites();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-cream-50">
        <h2 className="text-xl font-semibold text-stone-800 leading-snug">Saved</h2>
        <p className="text-xs text-stone-400 mt-0.5">Activities you've hearted</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-32 bg-stone-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : favoritedActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pt-16">
            <span className="text-5xl mb-4">🤍</span>
            <p className="text-stone-600 font-medium mb-1">Nothing saved yet</p>
            <p className="text-sm text-stone-400">Tap the heart on any activity to save it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-stone-400 mb-1">{favoritedActivities.length} saved</p>
            {favoritedActivities.map(a => (
              <ActivityCard key={a.id} activity={a} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
