import { FaSearch, FaTimes } from 'react-icons/fa';

export default function SearchBar({ value, onChange, onSubmit, placeholder }) {
  const submit = (e) => {
    e.preventDefault();
    onSubmit?.(value);
  };

  return (
    <form className="searchbar" onSubmit={submit}>
      <span className="search-icon" aria-hidden>
        <FaSearch size={14} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search…'}
        aria-label="Search"
      />
      {value && (
        <button
          type="button"
          className="clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <FaTimes size={12} />
        </button>
      )}
    </form>
  );
}