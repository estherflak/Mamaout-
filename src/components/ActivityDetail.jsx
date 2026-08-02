import { useEffect, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { localizedName, localizedDesc, categoryLabel, localizedScheduleLabel, localizedPriceNotes, locationLine } from '../lib/localize';
import { useFavorites } from '../hooks/useFavorites';
import { useParticipants, logClick } from '../hooks/useParticipants';
import { SHARE_TEMPLATES, shareActivityOnWhatsApp, addToCalendar } from '../lib/share';
import { ageRangeLabelFromWeeks } from '../lib/formatAge';

function NavigateButton({ address, label }) {
  const query = encodeURIComponent(address);
  return (
    <a
      href={`https://maps.google.com/?q=${query}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border border-warmline text-xs text-plum-soft hover:border-plum-soft transition-colors"
      onClick={e => e.stopPropagation()}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
      </svg>
      {label}
    </a>
  );
}

export default function ActivityDetail({ activity, onClose }) {
  const { user, promptSignIn } = useAuthContext();
  const { lang, t } = useLanguage();
  const { favoriteIds, toggle: toggleFav } = useFavorites();
  const { participants, myStatus, setStatus } = useParticipants(activity.id);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const isFav = favoriteIds.has(activity.id);
  const interestedCount = participants.filter(p => p.status === 'interested').length;
  const goingCount      = participants.filter(p => p.status === 'going').length;
  const ageLabel = ageRangeLabelFromWeeks(activity.ageFrom, activity.ageTo, lang);

  const hasCalendarDate = !!(activity.nextDates?.[0] || activity.eventDate);

  const scheduleStr = (() => {
    const timeRange = activity.timeStart
      ? (activity.timeEnd ? `${activity.timeStart}–${activity.timeEnd}` : activity.timeStart)
      : null;
    // Localized label; falls back to the first upcoming date in the UI locale.
    let label = localizedScheduleLabel(activity, lang);
    if (!label && activity.nextDates?.[0]) {
      label = new Date(`${activity.nextDates[0]}T00:00:00`).toLocaleDateString(
        lang === 'he' ? 'he-IL' : 'en-IL',
        { weekday: 'short', day: 'numeric', month: 'short' },
      );
    }
    if (!label) return timeRange || '';
    if (!timeRange) return label;
    if (activity.timeStart && label.includes(activity.timeStart)) {
      return label.replace(activity.timeStart, timeRange);
    }
    return `${label} · ${timeRange}`;
  })();

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  async function handleCta() {
    if (user) await logClick(user.id, activity.id);
    window.open(activity.sourceUrl, '_blank', 'noopener');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-xl mx-auto bg-card rounded-t-3xl max-h-[90vh] overflow-y-auto">
        {/* Drag handle + close */}
        <div className="relative flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-lilac-pale" />
          <button
            onClick={onClose}
            aria-label={t('activityDetail.close')}
            className="absolute end-3 top-2 w-8 h-8 flex items-center justify-center rounded-full bg-lilac-pale text-plum-soft active:scale-95 transition-transform"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-lilac via-lilac-pale to-butter mb-4" />

        <div className="px-5 pb-8 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 dir="auto" className="font-serif font-bold text-plum text-lg leading-tight">{localizedName(activity, lang)}</h2>
                {activity.isVerified && (
                  <svg className="w-4 h-4 flex-shrink-0 text-sage-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p dir="auto" className="text-sm text-plum-soft mt-0.5">
                {locationLine(activity, lang)}
              </p>
            </div>
            <button
              onClick={() => user ? toggleFav(activity.id) : promptSignIn('signup', 'loginScreen.saveFavesPrompt')}
              className="flex-shrink-0 p-1.5"
              aria-label={t('activityCard.favoriteAria')}
            >
              <svg className={`w-6 h-6 ${isFav ? 'fill-lilac stroke-lilac' : 'fill-none stroke-plum-disabled'}`} strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>

          {/* Schedule */}
          {scheduleStr && (
            <div className="flex items-center gap-2 text-sm text-plum font-medium">
              <svg className="w-4 h-4 text-plum-soft flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span dir="auto">{scheduleStr}</span>
            </div>
          )}

          {/* Price */}
          {(activity.isFree || activity.priceNis != null) && (
            <div>
              {activity.isFree ? (
                <p className="text-2xl font-bold text-green-600">{t('activityDetail.free')}</p>
              ) : (
                <p className="text-2xl font-bold text-plum">₪{activity.priceNis}</p>
              )}
              {activity.priceNotes && (
                <p dir="auto" className="text-xs text-plum-soft mt-0.5">{localizedPriceNotes(activity, lang)}</p>
              )}
            </div>
          )}

          {/* Info row: stroller · language · address */}
          <div className="space-y-2">
            {activity.strollerAccessible === true ? (
              <p className="text-sm text-green-600 font-medium">{t('activityDetail.strollerAccessible')}</p>
            ) : (
              <p className="text-sm text-plum-soft">{t('activityDetail.askOrganizer')}</p>
            )}

            {activity.language === 'en' && (
              <span className="inline-block px-2.5 py-1 rounded-full bg-sky-50 text-sky-600 text-xs font-medium">
                {t('activityDetail.heldInEnglish')}
              </span>
            )}

            {activity.address && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-plum-soft flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span dir="auto" className="text-sm text-plum flex-1">{activity.address}</span>
                <NavigateButton address={activity.address} label={t('activityDetail.navigate')} />
              </div>
            )}
          </div>

          {/* Organizer */}
          {(activity.organizerName || activity.organizerWhatsapp) && (
            <div className="flex items-center justify-between gap-3 py-2 border-t border-warmline">
              <div>
                <p className="text-xs text-plum-soft">{t('activityDetail.organizer')}</p>
                <p dir="auto" className="text-sm text-plum font-medium">{activity.organizerName || t('activityDetail.contact')}</p>
              </div>
              {activity.organizerWhatsapp && (
                <a
                  href={`https://wa.me/${activity.organizerWhatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-600 text-xs font-medium"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {t('activityDetail.whatsapp')}
                </a>
              )}
            </div>
          )}

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full bg-lilac-pale text-plum text-xs font-medium">{categoryLabel(activity, lang)}</span>
            <span className="px-2.5 py-1 rounded-full bg-sage-50 text-sage-500 text-xs">{ageLabel}</span>
          </div>

          {/* Description */}
          {localizedDesc(activity, lang) && (
            <p dir="auto" className="text-sm text-plum leading-relaxed">{localizedDesc(activity, lang)}</p>
          )}

          {/* RSVP + social proof */}
          <div className="bg-lilac-pale rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-plum">{t('activityDetail.areYouGoing')}</p>
            <div className="flex gap-2">
              {[
                { status: 'interested', label: t('activityDetail.interested') },
                { status: 'going',      label: t('activityDetail.going') },
              ].map(opt => (
                <button
                  key={opt.status}
                  onClick={() => user
                    ? setStatus(myStatus === opt.status ? null : opt.status)
                    : promptSignIn('signup', 'loginScreen.rsvpPrompt')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    myStatus === opt.status
                      ? 'bg-plum border-plum text-cream'
                      : 'bg-card border-warmline text-plum'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {(interestedCount > 0 || goingCount > 0) && (
              <p className="text-xs text-plum-soft pt-0.5">
                {[
                  interestedCount > 0 && t(interestedCount === 1 ? 'activityDetail.momInterested' : 'activityDetail.momsInterested', { n: interestedCount }),
                  goingCount > 0      && t(goingCount === 1 ? 'activityDetail.momGoing' : 'activityDetail.momsGoing', { n: goingCount }),
                ].filter(Boolean).join(' · ')}
              </p>
            )}
            {!user && (
              <p className="text-xs text-plum-soft">{t('activityDetail.signInToGoing')}</p>
            )}
          </div>

          {/* CTA + Share + Calendar */}
          <div className="flex gap-3">
            {activity.sourceUrl && (
              <button
                onClick={handleCta}
                dir="auto"
                className="flex-1 py-3.5 rounded-2xl bg-butter text-plum font-semibold text-sm active:scale-[0.98] transition-transform"
              >
                {activity.ctaLabel || t('activityDetail.moreInfo')} {lang === 'he' ? '←' : '→'}
              </button>
            )}

            {/* Add to calendar */}
            {hasCalendarDate && (
              <button
                onClick={() => addToCalendar(activity)}
                className="w-14 py-3.5 rounded-2xl border border-warmline bg-card flex items-center justify-center text-plum-soft active:scale-[0.98] transition-transform"
                title={t('activityDetail.addToCalendarTitle')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                  <line x1="12" y1="15" x2="12" y2="19"/>
                  <line x1="10" y1="17" x2="14" y2="17"/>
                </svg>
              </button>
            )}

            {/* WhatsApp share */}
            <button
              onClick={() => setShowShareMenu(v => !v)}
              className="w-14 py-3.5 rounded-2xl border border-warmline bg-card flex items-center justify-center text-green-500 active:scale-[0.98] transition-transform"
              title={t('activityDetail.shareOnWhatsAppTitle')}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>
          </div>

          {/* WhatsApp template picker */}
          {showShareMenu && (
            <div className="border border-warmline rounded-2xl overflow-hidden">
              <p className="text-xs font-semibold text-plum px-4 py-2.5 bg-lilac-pale border-b border-warmline">
                {t('activityDetail.chooseMessageStyle')}
              </p>
              {SHARE_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => { shareActivityOnWhatsApp(activity, tpl.id, lang); setShowShareMenu(false); }}
                  className="w-full text-start px-4 py-3 border-b border-warmline hover:bg-lilac-pale transition-colors"
                >
                  <span className="text-xs font-semibold text-plum block mb-0.5">{t(tpl.labelKey)}</span>
                  <span dir="auto" className="text-xs text-plum-soft line-clamp-2">{tpl.build(activity, lang)}</span>
                </button>
              ))}
              <button
                onClick={() => setShowShareMenu(false)}
                className="w-full py-2.5 text-xs text-plum-soft hover:bg-lilac-pale transition-colors"
              >
                {t('activityDetail.cancel')}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
