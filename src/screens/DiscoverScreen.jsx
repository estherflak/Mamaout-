import { useState, useMemo, useEffect } from 'react';
import { useActivities, resolveCity } from '../hooks/useActivities';
import { useRsvpCounts } from '../hooks/useRsvpCounts';
import { useSavedSearches } from '../hooks/useSavedSearches';
import { useFriends } from '../hooks/useFriends';
import { useFriendsGoing } from '../hooks/useFriendsGoing';
import { useAuthContext } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { rankActivities } from '../lib/rank';
import { matchesDateRange } from '../lib/dates';
import SearchBar from '../components/SearchBar';
import SuggestionChips from '../components/SuggestionChips';
import FilterPanel, { applyFilters } from '../components/FilterPanel';
import DayStrip from '../components/DayStrip';
import ActivityCard from '../components/ActivityCard';
import MapView from '../components/MapView';
import EmptyState from '../components/EmptyState';
import PlacesScreen from './PlacesScreen';

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden animate-pulse flex">
      <div className="w-1 flex-shrink-0 bg-stone-100" />
      <div className="flex-1 p-4 space-y-3">
        <div className="flex items-center gap-3">
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

export default function DiscoverScreen({ onSelect, onOpenSubmit, seed, onSeedConsumed }) {
  const { activities, loading, error } = useActivities();
  const rsvpCounts = useRsvpCounts();
  const { add: addSavedSearch } = useSavedSearches();
  const { friends } = useFriends();
  const friendsMap = useFriendsGoing(friends);
  const { user, profile } = useAuthContext();
  const { lang, setLang } = useLanguage();
  const [section, setSection]         = useState('activities'); // 'activities' | 'places'
  const [query, setQuery]             = useState('');
  const [activeCity, setCity]         = useState('all');
  const [placesArea, setPlacesArea]   = useState('all');
  const [openNow, setOpenNow]         = useState(false);
  const [viewMode, setViewMode]       = useState('list'); // 'list' | 'map'
  const [filterOpen, setFilterOpen]   = useState(false);
  const [advFilters, setAdvFilters]   = useState({ ageMax: null, language: null });
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const [dateRange, setDateRange]     = useState(null); // null | 'week' | 'weekend'
  const [napTime, setNapTime]         = useState(false);
  const [napTimeValue, setNapTimeValue] = useState('12:00');

  // Quick date-range and specific-day selection are mutually exclusive
  function handleDaySelect(day) { setDateRange(null); setSelectedDay(day); }
  function handleRangeSelect(r) { setSelectedDay(null); setDateRange(prev => prev === r ? null : r); }
  const [profileInit, setProfileInit] = useState(false);

  // One-time initialization from profile once it loads
  useEffect(() => {
    if (!profile || profileInit) return;
    setProfileInit(true);

    const updates = {};

    if (profile.baby_birthdate) {
      const ageWeeks = Math.floor(
        (Date.now() - new Date(profile.baby_birthdate)) / (7 * 24 * 60 * 60 * 1000)
      );
      if (ageWeeks >= 0 && ageWeeks <= 52) updates.ageMax = ageWeeks;
    }

    if (profile.language && profile.language !== 'both') {
      updates.language = profile.language;
    }

    if (Object.keys(updates).length > 0) {
      setAdvFilters(f => ({ ...f, ...updates }));
    }

    // Pre-select area from neighborhood
    if (profile.neighborhood) {
      setCity(resolveCity(profile.neighborhood));
    }
  }, [profile, profileInit]);

  // Re-run a saved search handed in from the Profile tab
  useEffect(() => {
    if (!seed) return;
    setSection('activities');
    setQuery(seed.query || '');
    setCity(seed.area || 'all');
    setSelectedDay(null);
    setDateRange(null);
    setNapTime(false);
    onSeedConsumed?.();
  }, [seed]);

  const handleChipSelect = chip => setQuery(chip);

  // Human-readable summary for a saved search, e.g. "Pottery in Tel Aviv"
  function searchLabel() {
    const q = query.trim();
    const areaLabel = activeCity === 'all' ? '' : ` in ${activeCity}`;
    return (q ? q : 'All activities') + areaLabel;
  }

  // City filter options derived from the data: primary cities first, then any
  // others (Givatayim, Petah Tikva…) by frequency — so new metro cities appear
  // automatically without hardcoding.
  const cityOptions = useMemo(() => {
    const counts = {};
    for (const a of activities) counts[a.city] = (counts[a.city] || 0) + 1;
    const PRIMARY = ['Tel Aviv', 'Ramat Gan'];
    const others = Object.keys(counts)
      .filter(c => c && !PRIMARY.includes(c))
      .sort((a, b) => counts[b] - counts[a]);
    const ordered = [...PRIMARY.filter(c => counts[c]), ...others];
    return [{ id: 'all', label: 'All areas' }, ...ordered.map(c => ({ id: c, label: c }))];
  }, [activities]);

  const filtered = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let r = activities;

    // Drop past one-off events; keep recurring (no eventDate)
    r = r.filter(a => !a.eventDate || a.eventDate >= today);

    if (activeCity !== 'all') r = r.filter(a => a.city === activeCity);

    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.neighborhood.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }

    // Day strip filter — match on specific date in next_dates
    if (selectedDay) {
      r = r.filter(a =>
        a.nextDates?.includes(selectedDay) ||
        (a.eventDate && a.eventDate.toISOString().slice(0, 10) === selectedDay)
      );
    }

    // Quick date-range filter — This week / Weekend
    if (dateRange) {
      r = r.filter(a => matchesDateRange(a, dateRange));
    }

    // Nap time — only activities ending by the selected nap time
    if (napTime && napTimeValue) {
      r = r.filter(a => a.timeEnd != null && a.timeEnd <= napTimeValue);
    }

    r = applyFilters(r, advFilters);

    // Attach which friends are going, then rank best-first for this mom
    r = r.map(a => ({ ...a, friendsGoing: friendsMap[a.id] || [] }));
    return rankActivities(r, { profile, friendsMap });
  }, [activities, query, activeCity, advFilters, selectedDay, dateRange, napTime, napTimeValue, friendsMap, profile]);

  const friendActivities = filtered.filter(a => a.friendsGoing?.length > 0);
  const otherActivities  = filtered.filter(a => !a.friendsGoing?.length);
  const isFiltered = query.trim() || activeCity !== 'all' || selectedDay || dateRange || napTime;
  const showSections = !isFiltered && friendActivities.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header area */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-cream-50">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold text-stone-800 leading-snug">What are you up for?</h2>
            <p className="text-xs text-stone-400 mt-0.5">Tel Aviv &amp; Ramat Gan</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Content language toggle */}
            <div className="flex bg-stone-100 rounded-xl p-0.5">
              {[
                { id: 'en', label: 'EN' },
                { id: 'he', label: 'עב' },
              ].map(l => (
                <button
                  key={l.id}
                  onClick={() => setLang(l.id)}
                  aria-label={l.id === 'en' ? 'English' : 'Hebrew'}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    lang === l.id ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* List / Map toggle — only in activities section */}
            {section === 'activities' && (
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
            )}
          </div>
        </div>

        {/* Activities / Places segment control */}
        <div className="flex bg-stone-100 rounded-xl p-0.5 mb-3">
          {[
            { id: 'activities', label: '✨ Activities' },
            { id: 'places',     label: '📍 Places' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                section === s.id ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Activities-specific filters */}
        {section === 'activities' && (
          <>
            <div className="space-y-2 mb-2">
              <SearchBar value={query} onChange={setQuery} />
              <SuggestionChips value={query} onSelect={handleChipSelect} />
              <DayStrip
                activities={activities}
                selectedDay={selectedDay}
                onDaySelect={handleDaySelect}
                dateRange={dateRange}
                onRangeSelect={handleRangeSelect}
                napTime={napTime}
                onNapTimeToggle={() => setNapTime(n => !n)}
                napTimeValue={napTimeValue}
                onNapTimeChange={setNapTimeValue}
              />
            </div>

            <div className="flex gap-2 mb-1 overflow-x-auto flex-nowrap -mx-1 px-1">
              {cityOptions.map(city => (
                <button
                  key={city.id}
                  onClick={() => setCity(city.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeCity === city.id
                      ? 'bg-sage-300 text-white'
                      : 'bg-sage-50 border border-sage-200 text-stone-500'
                  }`}
                >
                  {city.label}
                </button>
              ))}
            </div>

            <div className="flex justify-end pb-1">
              <FilterPanel
                filters={advFilters}
                onChange={setAdvFilters}
                isOpen={filterOpen}
                onToggle={() => setFilterOpen(o => !o)}
              />
            </div>
          </>
        )}

        {/* Places-specific filters */}
        {section === 'places' && (
          <div className="flex items-center gap-2 pb-1">
            {[
              { id: 'all',       label: 'All areas' },
              { id: 'tel_aviv',  label: 'Tel Aviv' },
              { id: 'ramat_gan', label: 'Ramat Gan' },
            ].map(area => (
              <button
                key={area.id}
                onClick={() => setPlacesArea(area.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  placesArea === area.id
                    ? 'bg-sage-300 text-white'
                    : 'bg-sage-50 border border-sage-200 text-stone-500'
                }`}
              >
                {area.label}
              </button>
            ))}
            <button
              onClick={() => setOpenNow(o => !o)}
              className={`ml-auto px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                openNow
                  ? 'bg-green-500 text-white'
                  : 'bg-sage-50 border border-sage-200 text-stone-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${openNow ? 'bg-white' : 'bg-green-400'}`} />
              Open now
            </button>
          </div>
        )}
      </div>

      {/* Places content */}
      {section === 'places' && (
        <PlacesScreen
          activeArea={placesArea}
          onAreaChange={setPlacesArea}
          openNow={openNow}
          onOpenNowToggle={() => setOpenNow(o => !o)}
        />
      )}

      {/* Activities content area */}
      {section === 'activities' && <div className={`flex-1 ${viewMode === 'map' ? 'overflow-hidden' : 'overflow-y-auto px-4 pb-6'}`}>
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
          <EmptyState
            query={query}
            dateFilter={selectedDay}
            onClearDate={selectedDay ? () => setSelectedDay(null) : null}
            onClearSearch={() => { setQuery(''); setSelectedDay(null); setDateRange(null); setNapTime(false); }}
            canSave={!!user}
            onSaveSearch={() => addSavedSearch({ query, area: activeCity, label: searchLabel() })}
          />
        ) : showSections ? (
          <>
            <section className="mb-5 pt-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">👯</span>
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Friends are going</h3>
              </div>
              <div className="space-y-3">
                {friendActivities.map(a => <ActivityCard key={a.id} activity={a} onSelect={onSelect} rsvpCounts={rsvpCounts} friendsGoing={a.friendsGoing} />)}
              </div>
            </section>
            {otherActivities.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">✨</span>
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">More to explore</h3>
                </div>
                <div className="space-y-3">
                  {otherActivities.map(a => <ActivityCard key={a.id} activity={a} onSelect={onSelect} rsvpCounts={rsvpCounts} friendsGoing={a.friendsGoing} />)}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="pt-2">
            <p className="text-xs text-stone-400 mb-3">{filtered.length} {filtered.length === 1 ? 'activity' : 'activities'} found</p>
            <div className="space-y-3">
              {filtered.map(a => <ActivityCard key={a.id} activity={a} onSelect={onSelect} rsvpCounts={rsvpCounts} friendsGoing={a.friendsGoing} />)}
            </div>
          </div>
        )}

        {viewMode !== 'map' && onOpenSubmit && (
          <div className="mt-8 mb-4 text-center">
            <button
              onClick={onOpenSubmit}
              className="text-xs text-stone-400 underline underline-offset-2 hover:text-dusty-roseDark transition-colors"
            >
              Are you an instructor or organizer? Submit your activity →
            </button>
          </div>
        )}
      </div>}
    </div>
  );
}
