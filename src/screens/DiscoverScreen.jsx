import { useState, useMemo, useEffect } from 'react';
import { useActivities } from '../hooks/useActivities';
import { useAuthContext } from '../contexts/AuthContext';
import SearchBar from '../components/SearchBar';
import SuggestionChips from '../components/SuggestionChips';
import FilterBar from '../components/FilterBar';
import FilterPanel, { applyFilters } from '../components/FilterPanel';
import ActivityCard from '../components/ActivityCard';
import MapView from '../components/MapView';
import EmptyState from '../components/EmptyState';

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

export default function DiscoverScreen({ onSelect }) {
  const { activities, loading, error, dataSource } = useActivities();
  const { profile } = useAuthContext();
  const [query, setQuery]             = useState('');
  const [activeCategory, setCategory] = useState('all');
  const [activeCity, setCity]         = useState('all');
  const [viewMode, setViewMode]       = useState('list'); // 'list' | 'map'
  const [filterOpen, setFilterOpen]   = useState(false);
  const [advFilters, setAdvFilters]   = useState({ ageMax: null, dateFilter: null });
  const [profileInit, setProfileInit] = useState(false);

  // Maps DB interest keys → FilterBar category IDs
  const INTEREST_TO_CAT = {
    movement: 'Movement', wellness: 'Wellness', creative: 'Creative',
    social: 'Social', 'baby-focused': 'Baby',
  };

  // One-time initialization from profile once it loads
  useEffect(() => {
    if (!profile || profileInit) return;
    setProfileInit(true);
    if (profile.interests?.length === 1) {
      const cat = INTEREST_TO_CAT[profile.interests[0]];
      if (cat) setCategory(cat);
    }
    if (profile.baby_birthdate) {
      const ageWeeks = Math.floor(
        (Date.now() - new Date(profile.baby_birthdate)) / (7 * 24 * 60 * 60 * 1000)
      );
      if (ageWeeks >= 0 && ageWeeks <= 52) {
        setAdvFilters(f => ({ ...f, ageMax: ageWeeks }));
      }
    }
  }, [profile, profileInit]);

  const handleChipSelect = chip => { setQuery(chip); setCategory('all'); };

  const filtered = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let r = activities;

    // Drop past one-off events; keep recurring (no eventDate)
    r = r.filter(a => !a.eventDate || a.eventDate >= today);

    if (activeCategory !== 'all') r = r.filter(a => a.category === activeCategory);
    if (activeCity !== 'all')     r = r.filter(a => a.city === activeCity);

    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.neighborhood.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }

    return applyFilters(r, advFilters);
  }, [activities, query, activeCategory, activeCity, advFilters]);

  const friendActivities = filtered.filter(a => a.friendsGoing?.length > 0);
  const otherActivities  = filtered.filter(a => !a.friendsGoing?.length);
  const isFiltered       = query.trim() || activeCategory !== 'all' || activeCity !== 'all';
  const showSections     = !isFiltered && friendActivities.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header area */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-cream-50">
        {/* Title row + view toggle */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold text-stone-800 leading-snug">What are you up for?</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Tel Aviv &amp; Ramat Gan
              {dataSource === 'supabase' && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-sage-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-400 inline-block" />
                  live
                </span>
              )}
            </p>
          </div>

          {/* List / Map toggle */}
          <div className="flex bg-stone-100 rounded-xl p-0.5">
            {['list', 'map'].map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === m ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'
                }`}
              >
                {m === 'list' ? '☰ List' : '🗺 Map'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 mb-2">
          <SearchBar value={query} onChange={setQuery} />
          <SuggestionChips onSelect={handleChipSelect} />
        </div>

        <div className="mb-1 overflow-x-auto scrollbar-hide">
          <FilterBar
            activeCategory={activeCategory}
            onCategory={setCategory}
            activeCity={activeCity}
            onCity={setCity}
          />
        </div>

        {/* Filter button */}
        <div className="flex justify-end pb-1">
          <FilterPanel
            filters={advFilters}
            onChange={f => { setAdvFilters(f); setFilterOpen(false); }}
            isOpen={filterOpen}
            onToggle={() => setFilterOpen(o => !o)}
          />
        </div>
      </div>

      {/* Content area */}
      <div className={`flex-1 ${viewMode === 'map' ? 'overflow-hidden' : 'overflow-y-auto px-4 pb-6'}`}>
        {error && (
          <div className="mb-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            Could not load live data — showing sample activities.
          </div>
        )}

        {viewMode === 'map' ? (
          <MapView activities={filtered} onSelect={onSelect} className="h-full" />
        ) : loading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState query={query} />
        ) : showSections ? (
          <>
            <section className="mb-5 pt-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">👯</span>
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Friends are going</h3>
              </div>
              <div className="space-y-3">
                {friendActivities.map(a => <ActivityCard key={a.id} activity={a} onSelect={onSelect} />)}
              </div>
            </section>
            {otherActivities.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">✨</span>
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">More to explore</h3>
                </div>
                <div className="space-y-3">
                  {otherActivities.map(a => <ActivityCard key={a.id} activity={a} onSelect={onSelect} />)}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="pt-2">
            <p className="text-xs text-stone-400 mb-3">{filtered.length} {filtered.length === 1 ? 'activity' : 'activities'} found</p>
            <div className="space-y-3">
              {filtered.map(a => <ActivityCard key={a.id} activity={a} onSelect={onSelect} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
