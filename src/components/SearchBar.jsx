import { FaSearch, FaTimes } from 'react-icons/fa';

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  onFocus,
  onBlur,
  children,   // dropdown renders here
}) {
  const submit = (e) => {
    e.preventDefault();
    onSubmit?.(value);
  };

  return (
    <div className="searchbar-wrap">
      <form className="searchbar" onSubmit={submit}>
        <span className="search-icon" aria-hidden>
          <FaSearch size={14} />
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
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
      {children}
    </div>
  );
}