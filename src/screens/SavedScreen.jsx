import { useFavorites } from '../hooks/useFavorites';
import ActivityCard from '../components/ActivityCard';
import { useLanguage } from '../contexts/LanguageContext';

export default function SavedScreen({ onSelect }) {
  const { t } = useLanguage();
  const { favoritedActivities, loading } = useFavorites();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-canvas">
        <h2 className="text-xl font-serif font-semibold text-plum leading-snug">{t('savedScreen.title')}</h2>
        <p className="text-xs text-plum-soft mt-0.5">{t('savedScreen.subtitle')}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-32 bg-lilac-pale rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : favoritedActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pt-16">
            <span className="text-5xl mb-4">🤍</span>
            <p className="text-plum font-medium mb-1">{t('savedScreen.nothingSaved')}</p>
            <p className="text-sm text-plum-soft">{t('savedScreen.tapHeartHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-plum-soft mb-1">{t('savedScreen.savedCount', { count: favoritedActivities.length })}</p>
            {favoritedActivities.map(a => (
              <ActivityCard key={a.id} activity={a} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
