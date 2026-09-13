import { FaLayerGroup, FaClock, FaStar, FaRulerCombined } from 'react-icons/fa';

const FILTERS = [
  { id: 'all',     label: 'All',           Icon: FaLayerGroup },
  { id: 'open',    label: 'Open Now',      Icon: FaClock },
  { id: 'rated',   label: 'Highest Rated', Icon: FaStar },
  { id: 'nearest', label: 'Nearest',       Icon: FaRulerCombined },
];

export default function FilterBar({ value, onChange, disabledNearest }) {
  return (
    <div className="filters">
      {FILTERS.map(({ id, label, Icon }) => {
        const disabled = id === 'nearest' && disabledNearest;
        return (
          <button
            key={id}
            className={`filter-chip ${value === id ? 'active' : ''}`}
            onClick={() => !disabled && onChange(id)}
            disabled={disabled}
            title={disabled ? 'Enable Near Me to use this filter' : ''}
          >
            <Icon size={10} style={{ marginRight: 6 }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}