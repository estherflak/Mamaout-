import { useState, useMemo } from 'react';
import { ACTIVITIES } from './data/activities';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import SuggestionChips from './components/SuggestionChips';
import FilterBar from './components/FilterBar';
import ActivityCard from './components/ActivityCard';
import EmptyState from './components/EmptyState';

export default function App() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeCity, setActiveCity] = useState('all');

  const handleChipSelect = (chip) => {
    setQuery(chip);
    setActiveCategory('all');
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
  };

  const filtered = useMemo(() => {
    let results = ACTIVITIES;

    if (activeCategory !== 'all') {
      results = results.filter(a => a.category === activeCategory);
    }

    if (activeCity !== 'all') {
      results = results.filter(a => a.city === activeCity);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.neighborhood.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q)) ||
        a.category.toLowerCase().includes(q)
      );
    }

    return results;
  }, [query, activeCategory, activeCity]);

  const friendActivities = filtered.filter(a => a.friendsGoing.length > 0);
  const otherActivities = filtered.filter(a => a.friendsGoing.length === 0);

  const isFiltered = query.trim() || activeCategory !== 'all' || activeCity !== 'all';
  const showSections = !isFiltered && friendActivities.length > 0;

  return (
    <div className="min-h-screen bg-cream-50">
      <Header />

      <main className="max-w-xl mx-auto px-4 pb-16">
        {/* Hero blurb */}
        <div className="pt-5 pb-4">
          <h2 className="text-xl font-semibold text-stone-800 leading-snug">
            What are you up for today?
          </h2>
          <p className="text-sm text-stone-400 mt-0.5">
            Activities for you and your little one in Tel Aviv & Ramat Gan
          </p>
        </div>

        {/* Search */}
        <div className="space-y-3 mb-4">
          <SearchBar value={query} onChange={setQuery} />
          <SuggestionChips onSelect={handleChipSelect} />
        </div>

        {/* Filters */}
        <div className="mb-5">
          <FilterBar
            activeCategory={activeCategory}
            onCategory={handleCategoryChange}
            activeCity={activeCity}
            onCity={setActiveCity}
          />
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <EmptyState query={query} />
        ) : showSections ? (
          <>
            {/* Friends going section */}
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">👯</span>
                <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">
                  Friends are going
                </h3>
              </div>
              <div className="space-y-3">
                {friendActivities.map(a => (
                  <ActivityCard key={a.id} activity={a} />
                ))}
              </div>
            </section>

            {/* All other activities */}
            {otherActivities.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">✨</span>
                  <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">
                    More to explore
                  </h3>
                </div>
                <div className="space-y-3">
                  {otherActivities.map(a => (
                    <ActivityCard key={a.id} activity={a} />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            {filtered.length > 0 && (
              <p className="text-xs text-stone-400 mb-3">
                {filtered.length} {filtered.length === 1 ? 'activity' : 'activities'} found
              </p>
            )}
            <div className="space-y-3">
              {filtered.map(a => (
                <ActivityCard key={a.id} activity={a} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
