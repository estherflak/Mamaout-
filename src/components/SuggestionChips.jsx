import { SUGGESTION_CHIPS } from '../data/activities';
import { useLanguage } from '../contexts/LanguageContext';

export default function SuggestionChips({ onSelect, value = '' }) {
  const { t } = useLanguage();
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
      {SUGGESTION_CHIPS.map(chip => {
        // Search with the label the user actually sees (Hebrew UI → Hebrew
        // query), so the empty state and search box never show foreign text.
        const label = t(`suggestionChips.${chip}`);
        const active = value.trim().toLowerCase() === label.toLowerCase();
        return (
          <button
            key={chip}
            onClick={() => onSelect(active ? '' : label)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
              transition-colors shadow-sm border ${
              active
                ? 'bg-dusty-rose border-dusty-rose text-white'
                : 'bg-white border-dusty-roseLight text-stone-600 active:bg-dusty-rosePale active:border-dusty-rose hover:bg-dusty-rosePale hover:border-dusty-rose'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
