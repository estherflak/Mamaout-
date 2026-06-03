import { SUGGESTION_CHIPS } from '../data/activities';

export default function SuggestionChips({ onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
      {SUGGESTION_CHIPS.map(chip => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className="flex-shrink-0 px-4 py-2 rounded-full bg-white border border-dusty-roseLight
            text-stone-600 text-sm font-medium whitespace-nowrap
            active:bg-dusty-rosePale active:border-dusty-rose
            hover:bg-dusty-rosePale hover:border-dusty-rose
            transition-colors shadow-sm"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
