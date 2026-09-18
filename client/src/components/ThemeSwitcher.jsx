// Shares the search button's look so each theme styles both header buttons alike.
function ThemeSwitcher({ activeTheme, onShuffle }) {
  return (
    <button
      className="search-btn theme-shuffle"
      type="button"
      onClick={onShuffle}
      aria-label={`Theme: ${activeTheme.name}. Shuffle to another theme`}
      title={`${activeTheme.name} · tap for another theme`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3h5v5"></path>
        <path d="M4 20 21 3"></path>
        <path d="M21 16v5h-5"></path>
        <path d="m15 15 6 6"></path>
        <path d="M4 4l5 5"></path>
      </svg>
    </button>
  );
}

export default ThemeSwitcher;
