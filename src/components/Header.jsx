import {
  FaMapMarkerAlt,
  FaCrosshairs,
  FaHeart,
  FaUser,
} from 'react-icons/fa';

export default function Header({
  onNearMe,
  savedCount,
  onToggleSavedPanel,
  savedPanelOpen,
  locating,
}) {
  return (
    <header className="header">
      <div className="logo">
        <div className="logo-mark">
          <FaMapMarkerAlt />
        </div>
        <span>MapFind</span>
      </div>

      <div className="header-actions">
        <button
          className="icon-btn"
          onClick={onNearMe}
          disabled={locating}
          title="Use my location"
          aria-label="Use my location"
        >
          <FaCrosshairs />
          <span className="label">{locating ? 'Locating…' : 'Near Me'}</span>
        </button>

        <button
          className={`icon-btn ${savedPanelOpen ? 'active' : ''}`}
          onClick={onToggleSavedPanel}
          title="Saved places"
          aria-label="Saved places"
        >
          <FaHeart />
          <span className="label">Saved</span>
          {savedCount > 0 && <span className="badge">{savedCount}</span>}
        </button>

        <button className="avatar" title="Profile" aria-label="Profile">
          <FaUser />
        </button>
      </div>
    </header>
  );
}