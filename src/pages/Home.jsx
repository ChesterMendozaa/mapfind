import CategoryButtons from '../components/CategoryButtons.jsx';
import { FaCrosshairs } from 'react-icons/fa';

export default function Home({
  onSelectCategory,
  activeCategory,
  onClearCategory,
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