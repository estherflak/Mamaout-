import { CATEGORIES, CITIES } from '../data/activities';

export default function FilterBar({ activeCategory, onCategory, activeCity, onCity }) {
  return (
    <div className="space-y-3">
      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-4 px-4 scrollbar-hide">
        {CATEGORIES.map(cat => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium
                transition-all shadow-sm
                ${active
                  ? 'bg-dusty-rose text-white shadow-md'
                  : 'bg-white border border-dusty-roseLight text-stone-600 hover:bg-dusty-rosePale'
                }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* City toggle */}
      <div className="flex gap-2">
        {CITIES.map(city => {
          const active = activeCity === city.id;
          return (
            <button
              key={city.id}
              onClick={() => onCity(city.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${active
                  ? 'bg-sage-300 text-white'
                  : 'bg-sage-50 border border-sage-200 text-stone-500 hover:bg-sage-100'
                }`}
            >
              {city.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
