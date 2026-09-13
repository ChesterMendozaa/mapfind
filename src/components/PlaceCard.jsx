import { formatHours, isOpenNow, formatKm } from '../utils/location.js';
import { FaStar, FaMapMarkerAlt, FaRulerCombined, FaTag, FaDirections, FaHeart, FaRegHeart } from 'react-icons/fa';

export default function PlaceCard({ place, selected, isSaved, onSelect, onToggleSave, onDirections }) {
  const open = isOpenNow(place.hours);
  const distance = place._distance;

  return (
    <div
      className={`result-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(place.id)}
    >
      <h3>{place.name}</h3>

      <div className="meta">
        <span className="meta-item">
          <FaStar size={11} style={{ color: 'var(--amber)' }} />
          {place.rating.toFixed(1)}
        </span>
        {distance != null && (
          <span className="meta-item">
            <FaRulerCombined size={11} />
            {formatKm(distance)}
          </span>
        )}
        <span className="meta-item" style={{ textTransform: 'capitalize' }}>
          <FaTag size={11} />
          {place.category}
        </span>
      </div>

      <div className="meta">
        <span className="meta-item">
          <FaMapMarkerAlt size={11} />
          {place.address}
        </span>
      </div>

      <div className="meta">
        <span className={`meta-item ${open ? 'open' : 'closed'}`}>
          {open ? 'Open' : 'Closed'}
        </span>
        <span className="meta-item">{formatHours(place.hours)}</span>
      </div>

      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
        <button className="btn-sm primary" onClick={() => onDirections(place)}>
          <FaDirections size={12} />
          Directions
        </button>
        <button
          className={`btn-sm ${isSaved ? 'saved' : ''}`}
          onClick={() => onToggleSave(place.id)}
        >
          {isSaved ? <FaHeart size={12} /> : <FaRegHeart size={12} />}
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}