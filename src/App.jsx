import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import MapView from './components/MapView.jsx';
import SearchResults from './components/SearchResults.jsx';
import PlaceDetails from './components/PlaceDetails.jsx';
import FilterBar from './components/FilterBar.jsx';
import BottomSheet from './components/BottomSheet.jsx';
import SearchBar from './components/SearchBar.jsx';
import RecentDropdown from './components/RecentDropdown.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import Home from './pages/Home.jsx';
import SavedPlaces from './pages/SavedPlaces.jsx';
import { FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';
import { searchByCategory, DEFAULT_CENTER } from './data/places.js';
import { haversineKm, applyFilters } from './utils/location.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { fetchRoute } from './utils/routing.js';

// Keep only valid { query, category, at } entries
function sanitizeRecents(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((r) => {
      if (
        r &&
        typeof r === 'object' &&
        typeof r.query === 'string' &&
        typeof r.category === 'string'
      ) {
        return { query: r.query, category: r.category, at: r.at || 0 };
      }
      return null;
    })
    .filter(Boolean);
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [recenterTarget, setRecenterTarget] = useState(null);
  const [locating, setLocating] = useState(false);
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 900 : false
  );

  // Splash screen
  const [appReady, setAppReady] = useState(false);

  const [rawResults, setRawResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);

  const [savedIds, setSavedIds] = useLocalStorage('mapfind.saved', []);
  const [recentSearches, setRecentSearchesRaw] = useLocalStorage('mapfind.recent', []);
  const [placeCache, setPlaceCache] = useState({});

  // Sanitized setter — never let bad data in or out
  const setRecentSearches = useCallback((updater) => {
    setRecentSearchesRaw((prev) => {
      const cleaned = sanitizeRecents(prev);
      const next = typeof updater === 'function' ? updater(cleaned) : updater;
      return sanitizeRecents(next);
    });
  }, [setRecentSearchesRaw]);

  // One-time migration on mount
  useEffect(() => {
    setRecentSearchesRaw((prev) => {
      const cleaned = sanitizeRecents(prev);
      if (cleaned.length !== (Array.isArray(prev) ? prev.length : 0)) {
        return cleaned;
      }
      return prev;
    });
  }, [setRecentSearchesRaw]);

  // Hide splash on first paint. Minimum 800 ms so it doesn't flash.
  useEffect(() => {
    const MIN_SHOW = 800;
    const start = performance.now();
    const t = setTimeout(() => {
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, MIN_SHOW - elapsed);
      setTimeout(() => setAppReady(true), remaining);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Fetch debounce — 300 ms (feels responsive)
  const fetchTimer = useRef(null);
  useEffect(() => {
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(() => {
      setDebouncedQuery(categoryQuery);
    }, 300);
    return () => {
      if (fetchTimer.current) clearTimeout(fetchTimer.current);
    };
  }, [categoryQuery]);

  // Commit a query to recents (dedupes within same category)
  const commitRecent = useCallback((q) => {
    const trimmed = (q || '').trim();
    if (!trimmed || !activeCategory) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (r) =>
          !(
            r.query.toLowerCase() === trimmed.toLowerCase() &&
            r.category === activeCategory
          )
      );
      return [
        { query: trimmed, category: activeCategory, at: Date.now() },
        ...filtered,
      ].slice(0, 24);
    });
  }, [activeCategory, setRecentSearches]);

  // Save timer — 1500 ms idle (means "user is done typing")
  const saveTimer = useRef(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const q = categoryQuery.trim();
    if (!q || !activeCategory) return;

    saveTimer.current = setTimeout(() => {
      commitRecent(q);
    }, 1500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [categoryQuery, activeCategory, commitRecent]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  const categoryRecents = useMemo(() => {
    if (!activeCategory) return [];
    return recentSearches
      .filter(
        (r) =>
          r &&
          typeof r.query === 'string' &&
          r.category === activeCategory
      )
      .slice(0, 6);
  }, [recentSearches, activeCategory]);

  // ---------- Fetch ----------
  useEffect(() => {
    let cancelled = false;

    if (!activeCategory) {
      setRawResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const center = userLocation
          ? [userLocation.lat, userLocation.lng]
          : DEFAULT_CENTER;

        let places = await searchByCategory(
          activeCategory,
          debouncedQuery,
          center
        );

        if (cancelled) return;

        if (userLocation) {
          places = places.map((p) => ({
            ...p,
            _distance: haversineKm(userLocation, { lat: p.lat, lng: p.lng }),
          }));
        }

        setRawResults(places);

        setPlaceCache((prev) => {
          const next = { ...prev };
          places.forEach((p) => { next[p.id] = p; });
          return next;
        });
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError(err.message || 'Failed to load places.');
          setRawResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [activeCategory, debouncedQuery, userLocation]);

  const results = useMemo(() => {
    let list = [...rawResults];
    if (filter === 'rated') {
      list.sort((a, b) => b.rating - a.rating);
    }
    if (filter === 'nearest' && userLocation) {
      list.sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity));
    }
    return applyFilters(list, { filter });
  }, [rawResults, filter, userLocation]);

  const selectedPlace = useMemo(
    () => results.find((p) => p.id === selectedId) || null,
    [results, selectedId]
  );

  const savedPlaces = useMemo(() => {
    return savedIds
      .map((id) => placeCache[id] || results.find((p) => p.id === id))
      .filter(Boolean);
  }, [savedIds, placeCache, results]);

  const activeCategoryLabel = useMemo(
    () => activeCategory
      ? activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)
      : '',
    [activeCategory]
  );

  // ---------- Handlers ----------
  const handleCategory = useCallback((cat) => {
    setActiveCategory((prev) => (prev === cat.id ? null : cat.id));
    setCategoryQuery('');
    setDebouncedQuery('');
    setDropdownOpen(false);
    setSelectedId(null);
    setRoute(null);
    setRouteError(null);
    if (isMobile) setSheetOpen(true);
  }, [isMobile]);

  const clearCategory = useCallback(() => {
    setActiveCategory(null);
    setCategoryQuery('');
    setDebouncedQuery('');
    setDropdownOpen(false);
    setSelectedId(null);
    setRoute(null);
    setRouteError(null);
  }, []);

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setRecenterTarget([loc.lat, loc.lng]);
        setFilter('nearest');
        setLocating(false);
      },
      () => {
        setLocating(false);
        alert('We could not access your location. You can still search and explore the map.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const toggleSave = useCallback((id) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]
    );
  }, [setSavedIds]);

  const handleDirections = useCallback(async (place) => {
    setRouteError(null);
    setRouteLoading(true);
    setSelectedId(place.id);

    try {
      let origin = userLocation;
      if (!origin) {
        origin = await new Promise((resolve) => {
          if (!navigator.geolocation) return resolve(null);
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 6000 }
          );
        });
        if (origin) setUserLocation(origin);
      }

      if (!origin) {
        origin = { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
      }

      const result = await fetchRoute(origin, { lat: place.lat, lng: place.lng });
      setRoute({
        ...result,
        destinationId: place.id,
        destinationName: place.name,
      });

      // Pull the sheet back to peek so the map + route are visible
      if (isMobile) sheetRef.current?.snapTo('peek');
    } catch (err) {
      console.error(err);
      setRouteError(err.message || 'Could not calculate route.');
    } finally {
      setRouteLoading(false);
    }
  }, [userLocation, isMobile]);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setRouteError(null);
  }, []);

  const selectPlace = useCallback((id) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setRoute(null);
    setRouteError(null);
    // Clicking a place = "this search was useful" → commit it
    commitRecent(categoryQuery);
    if (isMobile) setSheetOpen(true);
  }, [categoryQuery, commitRecent, isMobile]);

  const selectSaved = useCallback((id) => {
    setSavedPanelOpen(false);
    setSelectedId(id);
  }, []);

  const clearCategoryRecents = useCallback(() => {
    setRecentSearches((prev) => prev.filter((r) => r.category !== activeCategory));
  }, [activeCategory, setRecentSearches]);

  // ---------- Results panel ----------
  const renderResultsPanel = () => (
    <div className="results">
      <div className="results-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button
            className="icon-btn"
            onClick={clearCategory}
            style={{ padding: 8, minHeight: 34, minWidth: 34 }}
            aria-label="Back to discovery"
            title="Back"
          >
            <FaArrowLeft size={12} />
          </button>
          <h2
            className="results-title"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {activeCategoryLabel}
          </h2>
        </div>
        <span className="results-count">
          {loading ? 'Searching…' : `${results.length} found`}
        </span>
      </div>

      <div className="panel-search">
        <SearchBar
          value={categoryQuery}
          onChange={(v) => {
            setCategoryQuery(v);
            if (v === '') setDropdownOpen(true);
          }}
          onSubmit={() => {
            setDebouncedQuery(categoryQuery);
            commitRecent(categoryQuery);
          }}
          placeholder={`Search in ${activeCategoryLabel}…`}
          onFocus={() => {
            if (categoryQuery === '') setDropdownOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => setDropdownOpen(false), 120);
          }}
        >
          {dropdownOpen && categoryRecents.length > 0 && (
            <RecentDropdown
              items={categoryRecents}
              onPick={(q) => {
                setCategoryQuery(q);
                setDebouncedQuery(q);
                commitRecent(q);
              }}
              onClearAll={clearCategoryRecents}
              onClose={() => setDropdownOpen(false)}
            />
          )}
        </SearchBar>
      </div>

      <FilterBar
        value={filter}
        onChange={setFilter}
        disabledNearest={!userLocation}
      />

      {error && (
        <div className="empty error">
          <div className="empty-icon">
            <FaExclamationTriangle size={22} />
          </div>
          <h3>Something went wrong</h3>
          <p>{error}</p>
        </div>
      )}

      {!error && loading && (
        <div className="empty">
          <div className="empty-icon">
            <div className="spinner" />
          </div>
          <h3>Searching…</h3>
          <p>Looking for matches near you.</p>
        </div>
      )}

      {!error && !loading && (
        <SearchResults
          query={debouncedQuery}
          results={results}
          selectedId={selectedId}
          savedIds={savedSet}
          onSelect={selectPlace}
          onToggleSave={toggleSave}
          onDirections={handleDirections}
        />
      )}
    </div>
  );

  const sideContent = (() => {
    if (savedPanelOpen) {
      return (
        <SavedPlaces
          savedPlaces={savedPlaces}
          onSelect={selectSaved}
          onRemove={toggleSave}
        />
      );
    }
    if (selectedPlace) {
      return (
        <PlaceDetails
          place={selectedPlace}
          isSaved={savedSet.has(selectedPlace.id)}
          onClose={() => setSelectedId(null)}
          onToggleSave={toggleSave}
          onDirections={handleDirections}
        />
      );
    }
    if (activeCategory) {
      return renderResultsPanel();
    }
    return (
      <Home
        onSelectCategory={handleCategory}
        activeCategory={activeCategory}
        onClearCategory={clearCategory}
        userLocation={userLocation}
        onNearMe={handleNearMe}
      />
    );
  })();

  const sheetContent = (() => {
    if (selectedPlace) {
      return (
        <PlaceDetails
          place={selectedPlace}
          isSaved={savedSet.has(selectedPlace.id)}
          onClose={() => setSelectedId(null)}
          onToggleSave={toggleSave}
          onDirections={handleDirections}
        />
      );
    }
    if (savedPanelOpen) {
      return (
        <SavedPlaces
          savedPlaces={savedPlaces}
          onSelect={selectSaved}
          onRemove={toggleSave}
        />
      );
    }
    if (activeCategory) {
      return renderResultsPanel();
    }
    return (
      <Home
        onSelectCategory={handleCategory}
        activeCategory={activeCategory}
        onClearCategory={clearCategory}
        userLocation={userLocation}
        onNearMe={handleNearMe}
      />
    );
  })();

  return (
    <div className="app">
      <SplashScreen visible={!appReady} />

      <Header
        onNearMe={handleNearMe}
        savedCount={savedIds.length}
        savedPanelOpen={savedPanelOpen}
        onToggleSavedPanel={() => {
          setSavedPanelOpen((v) => !v);
          setSelectedId(null);
          if (isMobile) setSheetOpen(true);
        }}
        locating={locating}
      />

      <div className="body">
        <MapView
          places={results}
          selectedId={selectedId}
          onSelectPlace={selectPlace}
          userLocation={userLocation}
          recenterTarget={recenterTarget}
          route={route}
          routeLoading={routeLoading}
          routeError={routeError}
          onClearRoute={clearRoute}
        />

        {!isMobile && <aside className="side">{sideContent}</aside>}
      </div>

      {isMobile && (
        <BottomSheet
          ref={sheetRef}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          peek={260}
        >
          {sheetContent}
        </BottomSheet>
      )}
    </div>
  );
}