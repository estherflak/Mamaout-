import { useFavorites } from '../hooks/useFavorites';
import { useAuthContext } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { localizedName } from '../lib/localize';
import { shareActivityOnWhatsApp } from '../lib/share';

// Left-border accent color per DB category key
const CATEGORY_BORDER = {
  movement:         '#d4a5a5',  // terracotta
  wellness:         '#7da37d',  // sage green
  'baby-focused':   '#f9a8d4',  // soft pink
  social:           '#fbbf24',  // warm amber
  creative:         '#c084fc',  // lavender
  activities_kids:  '#7dd3fc',  // light blue
  workshops:        '#c4b5fd',  // lavender
};

function shareOnWhatsApp(e, activity, lang) {
  e.stopPropagation();
  shareActivityOnWhatsApp(activity, lang);
}

export default function ActivityCard({ activity, onSelect, friendsGoing = [], rsvpCounts }) {
  const { user } = useAuthContext();
  const { lang } = useLanguage();
  const { favoriteIds, toggle } = useFavorites();
  const isFav = favoriteIds.has(activity.id);
  const firstFriend = friendsGoing[0];
  const borderColor = CATEGORY_BORDER[activity.categoryKey] || CATEGORY_BORDER.social;
  const rsvp = rsvpCounts?.[activity.id];
  const interestedCount = rsvp?.interested || 0;
  const goingCount = rsvp?.going || 0;

  return (
    <div
      onClick={() => onSelect?.(activity)}
      className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden cursor-pointer active:scale-[0.99] transition-transform flex"
    >
      {/* Left category border */}
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: borderColor }} />

      <div className="flex-1 p-4 min-w-0">
        {/* Title row + actions */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1.5 min-w-0">
              <h2 dir="auto" className="font-semibold text-stone-800 text-base leading-tight line-clamp-2">
                {localizedName(activity, lang)}
              </h2>
              {activity.isVerified && (
                <span title="Verified source" className="flex-shrink-0 text-sage-400 mt-0.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {user && (
              <button
                onClick={e => { e.stopPropagation(); toggle(activity.id); }}
                className="p-1"
                aria-label="Favorite"
              >
                <svg className={`w-4 h-4 ${isFav ? 'fill-dusty-rose stroke-dusty-rose' : 'fill-none stroke-stone-300'}`} strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            )}
            <button
              onClick={e => shareOnWhatsApp(e, activity, lang)}
              className="p-1"
              aria-label="Share on WhatsApp"
            >
              <svg className="w-4 h-4 fill-green-400" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Day + time line */}
        {(() => {
          const timeRange = activity.timeStart
            ? (activity.timeEnd ? `${activity.timeStart}–${activity.timeEnd}` : activity.timeStart)
            : null;
          const dateLabel = (() => {
            const d = activity.nextDates?.[0];
            if (!d) return null;
            return new Date(`${d}T00:00:00`).toLocaleDateString('en-IL', {
              weekday: 'short', day: 'numeric', month: 'short',
            });
          })();
          const scheduleLabel = activity.scheduleLabel || dateLabel;
          let line;
          if (!scheduleLabel) {
            line = timeRange || '';
          } else if (!timeRange) {
            line = scheduleLabel;
          } else if (activity.timeStart && scheduleLabel.includes(activity.timeStart)) {
            line = scheduleLabel.replace(activity.timeStart, timeRange);
          } else {
            line = `${scheduleLabel} · ${timeRange}`;
          }
          return line ? (
            <p dir="auto" className="text-sm font-medium text-stone-700 mb-0.5">{line}</p>
          ) : null;
        })()}

        {/* Neighborhood · City */}
        <p dir="auto" className="text-xs text-stone-400 mb-2.5">
          {activity.neighborhood}{activity.neighborhood !== activity.city ? ` · ${activity.city}` : ''}
        </p>

        {/* Footer: price · stroller · age · friends */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Price */}
          {activity.isFree ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-50 text-green-600">
              Free
            </span>
          ) : activity.priceNis != null ? (
            <span className="text-xs font-semibold text-stone-600">₪{activity.priceNis}</span>
          ) : activity.price ? (
            <span className="text-xs text-stone-400">{activity.price}</span>
          ) : null}

          {/* Stroller accessible */}
          {activity.strollerAccessible && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 inline-flex items-center gap-1" title="Stroller accessible">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M3 4h2l1.5 9h11" />
                <path d="M5.5 13a8 8 0 0 0 8-8h-8" />
                <circle cx="8.5" cy="18" r="1.6" />
                <circle cx="16" cy="18" r="1.6" />
              </svg>
              Stroller OK
            </span>
          )}

          {/* English-friendly */}
          {activity.language === 'en' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 font-medium" title="Held in English">
              🌐 EN
            </span>
          )}

          {/* Community-submitted */}
          {activity.sourceName === 'Community' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium" title="Shared by a mom">
              💎 Mom tip
            </span>
          )}

          {/* Age */}
          <span className="text-xs text-stone-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            {activity.ageLabel}
          </span>

          {/* Friends going */}
          {firstFriend && (
            <div className="flex items-center gap-1 bg-sage-50 border border-sage-200 px-2.5 py-1 rounded-full ml-auto">
              <div className="w-4 h-4 rounded-full bg-dusty-rose flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">{firstFriend.name[0]}</span>
              </div>
              <span className="text-xs text-sage-500 font-medium">
                {firstFriend.name}
                {friendsGoing.length > 1 ? ` +${friendsGoing.length - 1} going` : ' is going'} ✓
              </span>
            </div>
          )}
        </div>

        {/* Social proof — aggregated RSVP counts */}
        {(interestedCount > 0 || goingCount > 0) && (
          <p className="text-xs text-sage-500 mt-2">
            {[
              interestedCount > 0 && `⭐ ${interestedCount} interested`,
              goingCount > 0 && `✓ ${goingCount} going`,
            ].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}
