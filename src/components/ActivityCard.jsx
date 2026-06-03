import { FRIENDS } from '../data/activities';

const PRICE_COLORS = {
  'Free': 'bg-sage-100 text-sage-500',
  '₪': 'bg-cream-100 text-amber-600',
  '₪₪': 'bg-cream-200 text-amber-700',
  '₪₪₪': 'bg-orange-100 text-orange-600',
};

const CATEGORY_COLORS = {
  Movement: 'bg-sky-50 text-sky-600',
  Wellness: 'bg-dusty-rosePale text-dusty-roseDark',
  Creative: 'bg-purple-50 text-purple-500',
  Social: 'bg-amber-50 text-amber-600',
  Baby: 'bg-sage-50 text-sage-500',
};

export default function ActivityCard({ activity }) {
  const goingFriends = activity.friendsGoing
    .map(id => FRIENDS.find(f => f.id === id))
    .filter(Boolean);

  const firstFriend = goingFriends[0];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden
      active:scale-[0.99] transition-transform cursor-pointer">
      {/* Card top accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-dusty-rose via-dusty-roseLight to-sage-200" />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl flex-shrink-0" role="img" aria-label={activity.category}>
              {activity.emoji}
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-stone-800 text-base leading-tight truncate">
                {activity.name}
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                {activity.neighborhood} · {activity.city}
              </p>
            </div>
          </div>
          {/* Price badge */}
          <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${PRICE_COLORS[activity.price] || 'bg-stone-100 text-stone-500'}`}>
            {activity.price}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-stone-500 leading-relaxed line-clamp-2 mb-3">
          {activity.description}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category tag */}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[activity.category] || 'bg-stone-100 text-stone-500'}`}>
              {activity.category}
            </span>
            {/* Age suitability */}
            <span className="text-xs text-stone-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              {activity.ageLabel}
            </span>
          </div>

          {/* Friends badge */}
          {firstFriend && (
            <div className="flex items-center gap-1 bg-sage-50 border border-sage-200 px-2.5 py-1 rounded-full">
              <div className="w-4 h-4 rounded-full bg-dusty-rose flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">
                  {firstFriend.name[0]}
                </span>
              </div>
              <span className="text-xs text-sage-500 font-medium">
                {firstFriend.name}
                {goingFriends.length > 1
                  ? ` +${goingFriends.length - 1} going`
                  : ' is going'
                } ✓
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
