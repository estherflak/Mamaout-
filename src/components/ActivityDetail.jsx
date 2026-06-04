import { useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import { useParticipants, logClick } from '../hooks/useParticipants';

const PRICE_LABELS = { free: 'Free', '₪': '₪', '₪₪': '₪₪', '₪₪₪': '₪₪₪' };

function shareOnWhatsApp(activity) {
  const dateStr = activity.eventDate
    ? activity.eventDate.toLocaleDateString('en-IL', { day: 'numeric', month: 'short' })
    : '';
  const msg = [
    'Found this on MamaOut — looks great:',
    activity.name,
    [activity.neighborhood, dateStr].filter(Boolean).join(' · '),
    '',
    `Book here: ${activity.sourceUrl}`,
  ].join('\n');
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

export default function ActivityDetail({ activity, onClose }) {
  const { user } = useAuthContext();
  const { favoriteIds, toggle: toggleFav } = useFavorites();
  const { participants, myStatus, setStatus } = useParticipants(activity.id);

  const isFav = favoriteIds.has(activity.id);
  const goingCount = participants.filter(p => p.status === 'going').length;

  // Close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  // Trap scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function handleCta() {
    if (user) await logClick(user.id, activity.id);
    window.open(activity.sourceUrl, '_blank', 'noopener');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-xl mx-auto bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-200" />
        </div>

        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-dusty-rose via-dusty-roseLight to-sage-200 mb-4" />

        <div className="px-5 pb-8 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="text-3xl flex-shrink-0">{activity.emoji}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-stone-800 text-lg leading-tight">{activity.name}</h2>
                  {activity.isVerified && (
                    <svg className="w-4 h-4 flex-shrink-0 text-sage-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-stone-400 mt-0.5">
                  {activity.neighborhood} · {activity.city}
                  {activity.eventDate && (
                    <span className="ml-1.5 text-dusty-roseDark font-medium">
                      · {activity.eventDate.toLocaleDateString('en-IL', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Heart */}
            <button onClick={() => toggleFav(activity.id)} className="flex-shrink-0 p-1.5">
              <svg className={`w-6 h-6 ${isFav ? 'fill-dusty-rose stroke-dusty-rose' : 'fill-none stroke-stone-300'}`} strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-medium">{activity.category}</span>
            <span className="px-2.5 py-1 rounded-full bg-cream-100 text-amber-700 text-xs font-semibold">{activity.price}</span>
            <span className="px-2.5 py-1 rounded-full bg-sage-50 text-sage-500 text-xs">{activity.ageLabel}</span>
          </div>

          {/* Description */}
          <p className="text-sm text-stone-600 leading-relaxed">{activity.description}</p>

          {/* Participation */}
          {user && (
            <div className="bg-sage-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-stone-600 mb-2">
                {goingCount > 0 ? `${goingCount} going` : 'Are you going?'}
              </p>
              <div className="flex gap-2">
                {[
                  { status: 'interested', label: '⭐ Interested' },
                  { status: 'going',      label: '✓ Going' },
                ].map(opt => (
                  <button
                    key={opt.status}
                    onClick={() => setStatus(myStatus === opt.status ? null : opt.status)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      myStatus === opt.status
                        ? 'bg-sage-400 border-sage-400 text-white'
                        : 'bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTA + Share */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleCta}
              className="flex-1 py-3.5 rounded-2xl bg-dusty-rose text-white font-semibold text-sm active:scale-[0.98] transition-transform"
            >
              {activity.ctaLabel} on {activity.sourceName}
            </button>
            <button
              onClick={() => shareOnWhatsApp(activity)}
              className="w-14 py-3.5 rounded-2xl border border-stone-200 bg-white flex items-center justify-center text-green-500 active:scale-[0.98] transition-transform"
              title="Share on WhatsApp"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>
          </div>

          <p className="text-[10px] text-stone-300 text-center">
            Source: {activity.sourceName}
          </p>
        </div>
      </div>
    </div>
  );
}
