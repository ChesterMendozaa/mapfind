import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import MapView from './components/MapView.jsx';
import SearchResults from './components/SearchResults.jsx';
import PlaceDetails from './components/PlaceDetails.jsx';
import FilterBar from './components/FilterBar.jsx';
import BottomSheet from './components/BottomSheet.jsx';
import Home from './pages/Home.jsx';
import SavedPlaces from './pages/SavedPlaces.jsx';
import { FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';
import {
  searchPlaces,
  searchByCategory,
  DEFAULT_CENTER,
} from './data/places.js';
import { haversineKm, applyFilters } from './utils/location.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { fetchRoute } from './utils/routing.js';

export default function App() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [recenterTarget, setRecenterTarget] = useState(null);
  const [locating, setLocating] = useState(false);
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 900 : false
  );

  const [rawResults, setRawResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);

  const [savedIds, setSavedIds] = useLocalStorage('mapfind.saved', []);
  const [recentSearches, setRecentSearches] = useLocalStorage('mapfind.recent', []);
  const [placeCache, setPlaceCache] = useState({});

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  useEffect(() => {
    let cancelled = false;

    if (!submittedQuery && !activeCategory) {
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

        let places = [];
        if (activeCategory) {
          places = await searchByCategory(activeCategory, center);
        } else {
          places = await searchPlaces(submittedQuery, center);
        }

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
  }, [submittedQuery, activeCategory, userLocation]);

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

  // ---------- Handlers ----------
  const runSearch = useCallback((q) => {
    const trimmed = (q ?? '').trim();
    setQuery(trimmed);
    setSubmittedQuery(trimmed);
    setActiveCategory(null);
    setSelectedId(null);
    setSavedPanelOpen(false);
    setRoute(null);
    setRouteError(null);
    if (trimmed) {
      setRecentSearches((prev) => {
        const next = [trimmed, ...prev.filter((x) => x.toLowerCase() !== trimmed.toLowerCase())];
        return next.slice(0, 6);
      });
    }
    if (isMobile) setSheetOpen(true);
  }, [isMobile, setRecentSearches]);

  const handleQueryChange = useCallback((value) => {
    setQuery(value);
    if (value && activeCategory) {
      setActiveCategory(null);
    }
  }, [activeCategory]);

  const handleCategory = useCallback((cat) => {
    setActiveCategory((prev) => (prev === cat.id ? null : cat.id));
    setSubmittedQuery('');
    setQuery('');
    setSelectedId(null);
    setRoute(null);
    setRouteError(null);
    if (isMobile) setSheetOpen(true);
  }, [isMobile]);

  const clearCategory = useCallback(() => {
    setActiveCategory(null);
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
    } catch (err) {
      console.error(err);
      setRouteError(err.message || 'Could not calculate route.');
    } finally {
      setRouteLoading(false);
    }
  }, [userLocation]);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setRouteError(null);
  }, []);

  const selectPlace = useCallback((id) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setRoute(null);
    setRouteError(null);
    if (isMobile) setSheetOpen(true);
  }, [isMobile]);

  const selectSaved = useCallback((id) => {
    setSavedPanelOpen(false);
    setSelectedId(id);
  }, []);

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
    if (submittedQuery || activeCategory) {
      return (
        <div className="results">
          <div className="results-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <button
                className="icon-btn"
                onClick={() => {
                  setSubmittedQuery('');
                  setActiveCategory(null);
                  setSelectedId(null);
                  setQuery('');
                }}
                style={{ padding: 8, minHeight: 34, minWidth: 34 }}
                aria-label="Back to discovery"
                title="Back"
              >
                <FaArrowLeft size={12} />
              </button>
              <h2 className="results-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {submittedQuery ? `"${submittedQuery}"` : `Category: ${activeCategory}`}
              </h2>
            </div>
            <span className="results-count">
              {loading ? 'Searching…' : `${results.length} found`}
            </span>
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
              query={submittedQuery}
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
    }
    return (
      <Home
        onSelectCategory={handleCategory}
        activeCategory={activeCategory}
        onClearCategory={clearCategory}
        onSearch={runSearch}
        recentSearches={recentSearches}
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
    if (submittedQuery || activeCategory) {
      return (
        <div className="results">
          <div className="results-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <button
                className="icon-btn"
                onClick={() => {
                  setSubmittedQuery('');
                  setActiveCategory(null);
                  setSelectedId(null);
                  setQuery('');
                }}
                style={{ padding: 8, minHeight: 34, minWidth: 34 }}
                aria-label="Back to discovery"
                title="Back"
              >
                <FaArrowLeft size={12} />
              </button>
              <h2 className="results-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {submittedQuery ? `"${submittedQuery}"` : `Category: ${activeCategory}`}
              </h2>
            </div>
            <span className="results-count">
              {loading ? 'Searching…' : `${results.length} found`}
            </span>
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
          {!error && !loading && (
            <SearchResults
              query={submittedQuery}
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
    }
    return (
      <Home
        onSelectCategory={handleCategory}
        activeCategory={activeCategory}
        onClearCategory={clearCategory}
        onSearch={runSearch}
        recentSearches={recentSearches}
        userLocation={userLocation}
        onNearMe={handleNearMe}
      />
    );
  })();

  return (
    <div className="app">
      <Header
        query={query}
        onQueryChange={handleQueryChange}
        onSubmit={runSearch}
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
        <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} peek={260}>
          {sheetContent}
        </BottomSheet>
      )}
    </div>
  );
}