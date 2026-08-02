import { useLanguage } from '../contexts/LanguageContext';

export default function SearchBar({ value, onChange }) {
  const { t } = useLanguage();
  return (
    <div className="relative">
      <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none">
        <svg className="w-5 h-5 text-plum-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="search"
        placeholder={t('searchBar.placeholder')}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full ps-12 pe-10 py-4 rounded-2xl bg-card border border-lilac-pale
          text-plum placeholder-plum-soft text-base
          focus:outline-none focus:ring-2 focus:ring-lilac focus:border-transparent
          shadow-soft transition-shadow"
        autoComplete="off"
        enterKeyHint="search"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 end-4 flex items-center text-plum-disabled hover:text-plum-soft transition-colors"
          aria-label={t('searchBar.clearAria')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
