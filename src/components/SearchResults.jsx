import PlaceCard from './PlaceCard.jsx';
import { FaSearch } from 'react-icons/fa';

export default function SearchResults({
  query,
  results,
  selectedId,
  savedIds,
  onSelect,
  onToggleSave,
  onDirections,
}) {
  if (results.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">
          <FaSearch size={22} />
        </div>
        <h3>No places found</h3>
        <p>
          Try searching for another place, brand, or category.
          {query && <> You searched for <b>{query}</b>.</>}
        </p>
      </div>
    );
  }

  return (
    <div className="result-list">
      {results.map((p) => (
        <PlaceCard
          key={p.id}
          place={p}
          selected={p.id === selectedId}
          isSaved={savedIds.has(p.id)}
          onSelect={onSelect}
          onToggleSave={onToggleSave}
          onDirections={onDirections}
        />
      ))}
    </div>
  );
}