import { FaHeart, FaTimes, FaRegHeart } from 'react-icons/fa';

export default function SavedPlaces({ savedPlaces, onSelect, onRemove }) {
  if (savedPlaces.length === 0) {
    return (
      <div className="saved-panel">
        <div className="empty">
          <div className="empty-icon">
            <FaRegHeart size={22} />
          </div>
          <h3>No saved places yet</h3>
          <p>Tap the Save button on any place to keep it here for later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-panel">
      <h2 className="results-title">Saved Places</h2>
      <p className="results-count" style={{ marginBottom: 14 }}>
        {savedPlaces.length} place{savedPlaces.length !== 1 ? 's' : ''}
      </p>

      {savedPlaces.map((p) => (
        <div key={p.id} className="saved-item" onClick={() => onSelect(p.id)}>
          <div className="saved-heart">
            <FaHeart size={13} />
          </div>
          <div className="info">
            <b>{p.name}</b>
            <small>{p.address}</small>
          </div>
          <button
            className="remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(p.id);
            }}
            title="Remove"
            aria-label="Remove saved place"
          >
            <FaTimes size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}