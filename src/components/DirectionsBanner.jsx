import { FaRoute, FaClock, FaTimes } from 'react-icons/fa';
import { formatKm } from '../utils/location.js';

export default function DirectionsBanner({ route, destinationName, onClose }) {
  if (!route) return null;

  return (
    <div className="directions-banner">
      <div className="directions-info">
        <div className="directions-title">
          <FaRoute size={12} />
          <span>Route to {destinationName}</span>
        </div>
        <div className="directions-meta">
          <span>
            <FaClock size={10} />
            {route.durationMin} min
          </span>
          <span>·</span>
          <span>{formatKm(route.distanceKm)}</span>
        </div>
      </div>
      <button
        className="directions-close"
        onClick={onClose}
        aria-label="Close directions"
        title="Close"
      >
        <FaTimes size={12} />
      </button>
    </div>
  );
}