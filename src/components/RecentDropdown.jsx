import { FaRegClock, FaTimes } from 'react-icons/fa';

export default function RecentDropdown({
  items,
  onPick,
  onClearAll,
  onClose,
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="recent-dropdown" role="listbox">
      <div className="recent-dropdown-head">
        <span>Recent in this category</span>
        <button
          type="button"
          className="recent-clear-all"
          onMouseDown={(e) => {
            // mousedown fires before blur — prevents dropdown from closing first
            e.preventDefault();
            onClearAll?.();
            onClose?.();
          }}
        >
          <FaTimes size={10} />
          Clear
        </button>
      </div>

      {items.map((r) => (
        <button
          key={r.query}
          type="button"
          className="recent-dropdown-item"
          role="option"
          onMouseDown={(e) => {
            e.preventDefault();
            onPick?.(r.query);
            onClose?.();
          }}
        >
          <FaRegClock size={11} />
          <span>{r.query}</span>
        </button>
      ))}
    </div>
  );
}