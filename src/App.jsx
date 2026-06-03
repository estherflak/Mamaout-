import { useState, useMemo } from 'react';
import { useActivities } from './hooks/useActivities';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import SuggestionChips from './components/SuggestionChips';
import FilterBar from './components/FilterBar';
import ActivityCard from './components/ActivityCard';
import EmptyState from './components/EmptyState';

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden animate-pulse">
      <div className="h-1.5 bg-gradient-to-r from-dusty-roseLight via-stone-100 to-sage-100" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-stone-100 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-stone-100 rounded w-2/3" />
            <div className="h-3 bg-stone-100 rounded w-1/3" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-3 bg-stone-100 rounded w-full" />
          <div className="h-3 bg-stone-100 rounded w-4/5" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 bg-stone-100 rounded-full w-16" />
          <div className="h-5 bg-stone-100 rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { activities, loading, error, dataSource } = useActivities();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeCity, setActiveCity] = useState('all');

  const handleChipSelect = (chip) => {
    setQuery(chip);
    setActiveCategory('all');
  };

  const filtered = useMemo(() => {
    let results = activities;

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
  }, [activities, query, activeCategory, activeCity]);

  const friendActivities = filtered.filter(a => a.friendsGoing?.length > 0);
  const otherActivities = filtered.filter(a => !a.friendsGoing?.length);

  const isFiltered = query.trim() || activeCategory !== 'all' || activeCity !== 'all';
  const showSections = !isFiltered && friendActivities.length > 0;

  return (
    <div className="min-h-screen bg-cream-50">
      <Header />

      <main className="max-w-xl mx-auto px-4 pb-16">
        <div className="pt-5 pb-4">
          <h2 className="text-xl font-semibold text-stone-800 leading-snug">
            What are you up for today?
          </h2>
          <p className="text-sm text-stone-400 mt-0.5">
            Activities for you and your little one in Tel Aviv &amp; Ramat Gan
            {dataSource === 'supabase' && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-sage-400">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-400 inline-block" />
                live
              </span>
            )}
          </p>
        </div>

        <div className="space-y-3 mb-4">
          <SearchBar value={query} onChange={setQuery} />
          <SuggestionChips onSelect={handleChipSelect} />
        </div>

        <div className="mb-5">
          <FilterBar
            activeCategory={activeCategory}
            onCategory={setActiveCategory}
            activeCity={activeCity}
            onCity={setActiveCity}
          />
        </div>

        {/* Error banner — non-blocking, shows mock data below */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            Could not load live data — showing sample activities.
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState query={query} />
        ) : showSections ? (
          <>
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">👯</span>
                <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">
                  Friends are going
                </h3>
              </div>
              <div className="space-y-3">
                {friendActivities.map(a => <ActivityCard key={a.id} activity={a} />)}
              </div>
            </section>

            {otherActivities.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">✨</span>
                  <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wide">
                    More to explore
                  </h3>
                </div>
                <div className="space-y-3">
                  {otherActivities.map(a => <ActivityCard key={a.id} activity={a} />)}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-stone-400 mb-3">
              {filtered.length} {filtered.length === 1 ? 'activity' : 'activities'} found
            </p>
            <div className="space-y-3">
              {filtered.map(a => <ActivityCard key={a.id} activity={a} />)}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
