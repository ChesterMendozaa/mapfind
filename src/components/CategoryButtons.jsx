import { CATEGORIES } from '../data/places.js';
import {
  FaHamburger, FaCoffee, FaShoppingBag, FaUniversity,
  FaPills, FaGasPump, FaHotel, FaGraduationCap, FaArrowLeft,
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

export default function CategoryButtons({ onSelect, activeCategory, onClear }) {
  return (
    <>
      {activeCategory && (
        <button
          onClick={onClear}
          className="pop-chip"
          style={{ marginBottom: 12 }}
        >
          <FaArrowLeft size={11} />
          All categories
        </button>
      )}

      <div className="cat-grid">
        {CATEGORIES.map((c) => {
          const Icon = ICONS[c.id] || FaShoppingBag;
          const active = activeCategory === c.id;
          return (
            <button
              key={c.id}
              className="cat-btn"
              onClick={() => onSelect(c)}
              style={
                active
                  ? {
                      background: 'var(--blue-soft)',
                      borderColor: 'var(--blue)',
                      color: 'var(--blue)',
                    }
                  : undefined
              }
            >
              <span className="cat-icon">
                <Icon size={18} />
              </span>
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}