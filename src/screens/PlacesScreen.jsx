import { useMemo, useState } from 'react';
import { usePlaces, isOpenNow, getTodayHours } from '../hooks/usePlaces';
import { ageRangeLabelFromMonths } from '../lib/formatAge';
import { areaLabel } from '../lib/localize';
import { useLanguage } from '../contexts/LanguageContext';
import { placeBookingUrl, activitiesAtPlace } from '../data/placeDetails';
import ActivityCard from '../components/ActivityCard';

function PlaceCard({ place, activities, onSelectActivity, rsvpCounts }) {
  const { lang, t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const bookingUrl = placeBookingUrl(place);
  const placeActivities = useMemo(
    () => activitiesAtPlace(place, activities),
    [place, activities]
  );
  const openNow = isOpenNow(place.opening_hours);
  const todayHours = getTodayHours(place.opening_hours);
  const isClosed = place.opening_hours && !todayHours;
  const placeArea = areaLabel(place.area, lang);
  // notes is stored in English; notes_he is backfilled by the translation cron
  const notes = lang === 'he' && place.notes_he ? place.notes_he : place.notes;
  // Neighborhood is stored in English; compare against both language labels so
  // "Ramat Gan · רמת גן" doesn't duplicate in either UI language.
  const hoodIsArea = !place.neighborhood
    || place.neighborhood === placeArea
    || place.neighborhood === areaLabel(place.area, 'en');

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      className="bg-card rounded-2xl shadow-soft border border-warmline overflow-hidden cursor-pointer"
    >
      <div className="flex">
        <div className="flex-1 p-4 min-w-0">
          {/* Name + open badge + expand chevron */}
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <h3 dir="auto" className="font-semibold text-plum text-base leading-tight">{place.name}</h3>
            {place.opening_hours && (
              <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                isClosed
                  ? 'bg-lilac-pale text-plum-soft'
                  : openNow
                  ? 'bg-sage-50 text-sage-500'
                  : 'bg-lilac-pale text-plum-soft'
              }`}>
                {isClosed ? t('placesScreen.closedToday') : openNow ? t('placesScreen.openNow') : t('placesScreen.closedNow')}
              </span>
            )}
            <svg
              className={`w-4 h-4 flex-shrink-0 text-plum-disabled transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>

          {/* Location */}
          <p className="text-xs text-plum-soft mb-2">
            {hoodIsArea ? placeArea : `${place.neighborhood} · ${placeArea}`}
          </p>

          {/* Today's hours */}
          {todayHours && (
            <p className="text-xs text-plum-soft mb-2">{t('placesScreen.today', { hours: todayHours })}</p>
          )}

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {place.price === 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-sage-50 text-sage-500">{t('common.free')}</span>
            ) : place.price != null ? (
              <span className="text-xs font-semibold text-plum">₪{place.price}</span>
            ) : null}

            {ageRangeLabelFromMonths(place.age_min_months, place.age_max_months, lang) && (
              <span className="text-xs text-plum-soft">
                {ageRangeLabelFromMonths(place.age_min_months, place.age_max_months, lang)}
              </span>
            )}

            {place.story_hour_schedule && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-lilac-pale text-plum flex items-center gap-1">
                <span>📖</span>
                <span dir="auto">{place.story_hour_schedule}</span>
              </span>
            )}

            {placeActivities.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-lilac-pale text-plum font-medium">
                {placeActivities.length === 1
                  ? t('placesScreen.oneActivity')
                  : t('placesScreen.activityCount', { count: placeActivities.length })}
              </span>
            )}
          </div>

          {/* Notes */}
          {notes && (
            <p dir="auto" className="text-xs text-plum-soft mt-2 leading-relaxed line-clamp-2">{notes}</p>
          )}

          {/* Contact row */}
          {(bookingUrl || place.phone || place.whatsapp || place.instagram) && (
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-warmline">
              {bookingUrl && (
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="px-3 py-1 rounded-full bg-butter text-plum text-xs font-semibold active:scale-95 transition-transform"
                >
                  {t('placesScreen.reserve')}
                </a>
              )}
              {place.whatsapp && (
                <a
                  href={`https://wa.me/${place.whatsapp}`}
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-green-600 font-medium"
                >
                  <svg className="w-3.5 h-3.5 fill-green-500" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {t('placesScreen.whatsapp')}
                </a>
              )}
              {place.phone && !place.whatsapp && (
                <a href={`tel:${place.phone}`} onClick={e => e.stopPropagation()} className="text-xs text-plum-soft">
                  {place.phone}
                </a>
              )}
              {place.instagram && (
                <a
                  href={`https://instagram.com/${place.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-xs text-plum-soft flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  @{place.instagram}
                </a>
              )}
            </div>
          )}

          {/* Expanded: scheduled activities held at this place */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-warmline" onClick={e => e.stopPropagation()}>
              {placeActivities.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-plum-soft mb-2">
                    {t('placesScreen.activitiesHere')}
                  </p>
                  <div className="space-y-2">
                    {placeActivities.map(a => (
                      <ActivityCard
                        key={a.id}
                        activity={a}
                        onSelect={onSelectActivity}
                        rsvpCounts={rsvpCounts}
                        friendsGoing={a.friendsGoing}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-plum-soft">{t('placesScreen.noActivities')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl shadow-soft border border-warmline overflow-hidden animate-pulse flex">
      <div className="w-1 flex-shrink-0 bg-lilac-pale" />
      <div className="flex-1 p-4 space-y-2">
        <div className="flex justify-between">
          <div className="h-4 bg-lilac-pale rounded w-1/2" />
          <div className="h-5 bg-lilac-pale rounded-full w-16" />
        </div>
        <div className="h-3 bg-lilac-pale rounded w-1/3" />
        <div className="h-3 bg-lilac-pale rounded w-1/4" />
        <div className="flex gap-2">
          <div className="h-5 bg-lilac-pale rounded-full w-12" />
          <div className="h-5 bg-lilac-pale rounded-full w-24" />
        </div>
      </div>
    </div>
  );
}

export default function PlacesScreen({ activeArea, openNow, activities = [], onSelectActivity, rsvpCounts }) {
  const { t } = useLanguage();
  const { places, loading } = usePlaces();

  const filtered = useMemo(() => {
    let r = places;
    if (activeArea !== 'all') r = r.filter(p => p.area === activeArea);
    if (openNow) r = r.filter(p => isOpenNow(p.opening_hours));
    return r;
  }, [places, activeArea, openNow]);

  const playgrounds = filtered.filter(p => p.place_type === 'playground');
  const libraries   = filtered.filter(p => p.place_type === 'library');

  return (
    <div className="px-4 pb-6">
      {loading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {playgrounds.length > 0 && (
            <section className="mb-6 pt-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🛝</span>
                <h3 className="text-xs font-semibold text-plum-soft">
                  {t('placesScreen.indoorPlaygrounds')} ({playgrounds.length})
                </h3>
              </div>
              <div className="space-y-3">
                {playgrounds.map(p => (
                  <PlaceCard key={p.id} place={p} activities={activities} onSelectActivity={onSelectActivity} rsvpCounts={rsvpCounts} />
                ))}
              </div>
            </section>
          )}

          {libraries.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📚</span>
                <h3 className="text-xs font-semibold text-plum-soft">
                  {t('placesScreen.libraries')} ({libraries.length})
                </h3>
              </div>
              <div className="space-y-3">
                {libraries.map(p => (
                  <PlaceCard key={p.id} place={p} activities={activities} onSelectActivity={onSelectActivity} rsvpCounts={rsvpCounts} />
                ))}
              </div>
            </section>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">🗺️</span>
              <p className="text-plum-soft font-medium mb-1">
                {openNow ? t('placesScreen.nothingOpenRightNow') : t('placesScreen.noPlacesFound')}
              </p>
              <p className="text-xs text-plum-soft">
                {openNow ? t('placesScreen.tryTurningOffOpenNow') : t('placesScreen.tryDifferentArea')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
