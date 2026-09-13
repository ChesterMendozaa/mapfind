import { formatHours, isOpenNow, formatKm } from '../utils/location.js';
import {
  FaHamburger, FaCoffee, FaShoppingBag, FaUniversity, FaPills,
  FaGasPump, FaHotel, FaGraduationCap, FaMapMarkerAlt,
  FaPhone, FaClock, FaStar, FaRulerCombined,
  FaDirections, FaHeart, FaRegHeart, FaTimes,
} from 'react-icons/fa';

const ICONS = {
  food: FaHamburger,
  coffee: FaCoffee,
  shopping: FaShoppingBag,
  bank: FaUniversity,
  pharmacy: FaPills,
  gas: FaGasPump,
  hotel: FaHotel,
  school: FaGraduationCap,
};

export default function PlaceDetails({ place, isSaved, onClose, onToggleSave, onDirections }) {
  if (!place) return null;
  const open = isOpenNow(place.hours);
  const Icon = ICONS[place.category] || FaShoppingBag;

  return (
    <div className="details">
      <div className="details-hero">
        <div className="hero-icon">
          <Icon size={28} />
        </div>
        <button className="details-close" onClick={onClose} aria-label="Close">
          <FaTimes size={14} />
        </button>
      </div>

      <div className="details-body">
        <h2>{place.name}</h2>
        <span className="details-cat">
          <Icon size={11} />
          {place.category}
        </span>

        <div className="meta">
          <span className="meta-item">
            <FaStar size={11} style={{ color: 'var(--amber)' }} />
            {place.rating.toFixed(1)} ({place.reviews} reviews)
          </span>
          {place._distance != null && (
            <span className="meta-item">
              <FaRulerCombined size={11} />
              {formatKm(place._distance)}
            </span>
          )}
        </div>

        {place.description && <p className="details-desc">{place.description}</p>}

        <div className="info-row">
          <div className="k">
            <FaMapMarkerAlt size={12} /> Address
          </div>
          <div className="v">{place.address || '—'}</div>
        </div>

        <div className="info-row">
          <div className="k">
            <FaClock size={12} /> Status
          </div>
          <div className="v" style={{ color: open ? 'var(--green)' : 'var(--red)' }}>
            {open ? 'Open now' : 'Closed'}
          </div>
        </div>

        {place.hours && (
          <div className="info-row">
            <div className="k">
              <FaClock size={12} /> Hours
            </div>
            <div className="v">{formatHours(place.hours)}</div>
          </div>
        )}

        {place.phone && (
          <div className="info-row">
            <div className="k">
              <FaPhone size={12} /> Contact
            </div>
            <div className="v">{place.phone}</div>
          </div>
        )}

        <div className="details-actions">
          <button className="btn-sm primary" onClick={() => onDirections(place)}>
            <FaDirections size={13} />
            Directions
          </button>
          <button
            className={`btn-sm ${isSaved ? 'saved' : ''}`}
            onClick={() => onToggleSave(place.id)}
          >
            {isSaved ? <FaHeart size={13} /> : <FaRegHeart size={13} />}
            {isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}