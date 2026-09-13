import CategoryButtons from '../components/CategoryButtons.jsx';
import { POPULAR_SEARCHES } from '../data/places.js';
import { FaRegClock, FaCrosshairs, FaFire } from 'react-icons/fa';

export default function Home({
  onSelectCategory,
  activeCategory,
  onClearCategory,
  onSearch,
  recentSearches,
  userLocation,
  onNearMe,
}) {
  return (
    <div className="discovery">
      <h1 className="greeting">Good afternoon</h1>
      <p className="subtitle">What are you looking for?</p>

      <CategoryButtons
        onSelect={onSelectCategory}
        activeCategory={activeCategory}
        onClear={onClearCategory}
      />

      <div className="section-title">
        <FaFire size={10} style={{ marginRight: 6, color: 'var(--amber)' }} />
        Popular Searches
      </div>
      <div className="pop-list">
        {POPULAR_SEARCHES.map((s) => (
          <button key={s} className="pop-chip" onClick={() => onSearch(s)}>
            {s}
          </button>
        ))}
      </div>

      {recentSearches.length > 0 && (
        <>
          <div className="section-title">Recent Searches</div>
          <div className="pop-list">
            {recentSearches.map((s) => (
              <button key={s} className="pop-chip" onClick={() => onSearch(s)}>
                <FaRegClock size={11} />
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      {!userLocation && (
        <>
          <div className="section-title">Location</div>
          <button className="icon-btn primary" onClick={onNearMe}>
            <FaCrosshairs size={12} />
            Use my location
          </button>
        </>
      )}
    </div>
  );
}