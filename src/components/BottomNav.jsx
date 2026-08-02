import { useLanguage } from '../contexts/LanguageContext';

const TABS = [
  { id: 'discover', key: 'nav.discover', icon: (active) => (
    <svg className={`w-6 h-6 ${active ? 'stroke-lilac' : 'stroke-plum-soft'}`} fill="none" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )},
  { id: 'saved', key: 'nav.saved', icon: (active) => (
    <svg className={`w-6 h-6 ${active ? 'fill-lilac stroke-lilac' : 'fill-none stroke-plum-soft'}`} strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )},
  { id: 'friends', key: 'nav.friends', icon: (active) => (
    <svg className={`w-6 h-6 ${active ? 'stroke-lilac' : 'stroke-plum-soft'}`} fill="none" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )},
  { id: 'profile', key: 'nav.profile', icon: (active) => (
    <svg className={`w-6 h-6 ${active ? 'stroke-lilac' : 'stroke-plum-soft'}`} fill="none" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )},
];

export default function BottomNav({ activeTab, onChange, requestCount = 0 }) {
  const { t } = useLanguage();
  return (
    <nav className="flex-shrink-0 bg-card border-t border-warmline">
      <div className="flex">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative ${
              activeTab === tab.id ? 'text-plum' : 'text-plum-soft'
            }`}
          >
            {tab.icon(activeTab === tab.id)}
            <span className="text-[10px] font-medium">{t(tab.key)}</span>
            {tab.id === 'friends' && requestCount > 0 && (
              <span className="absolute top-1.5 end-[calc(50%-12px)] w-4 h-4 bg-blush rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                {requestCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
