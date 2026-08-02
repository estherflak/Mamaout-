import { useLanguage } from '../contexts/LanguageContext';

const TABS = [
  { id: 'discover', key: 'nav.discover', emoji: '☀️' },
  { id: 'saved',    key: 'nav.saved',    emoji: '💜' },
  { id: 'friends',  key: 'nav.friends',  emoji: '👭' },
  { id: 'profile',  key: 'nav.profile',  emoji: '👤' },
];

export default function BottomNav({ activeTab, onChange, requestCount = 0 }) {
  const { t } = useLanguage();
  return (
    <nav className="flex-shrink-0 bg-card border-t border-warmline">
      <div className="flex">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative ${
                active ? 'text-plum' : 'text-plum-soft'
              }`}
            >
              <span className={`text-xl leading-none ${active ? '' : 'grayscale opacity-55'}`}>{tab.emoji}</span>
              <span className="text-[10px] font-medium">{t(tab.key)}</span>
              <span className={`w-4 h-[3px] rounded-full mt-0.5 ${active ? 'bg-butter' : 'bg-transparent'}`} />
              {tab.id === 'friends' && requestCount > 0 && (
                <span className="absolute top-1.5 end-[calc(50%-12px)] w-4 h-4 bg-blush rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                  {requestCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
