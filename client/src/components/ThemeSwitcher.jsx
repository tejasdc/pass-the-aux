// Shares the search button's look so each theme styles both header buttons alike.
// A palette icon (not shuffle arrows) so guests don't read it as shuffling songs.
function ThemeSwitcher({ activeTheme, onShuffle }) {
  return (
    <button
      className="search-btn theme-shuffle"
      type="button"
      onClick={onShuffle}
      aria-label={`${activeTheme.name} look. Tap to change the look`}
      title="Change the look"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4.5 4H15a2 2 0 0 0-1.5 3.3A1.6 1.6 0 0 1 12 22z"></path>
        <circle cx="7.5" cy="10.5" r="1.2" fill="currentColor"></circle>
        <circle cx="10.5" cy="6.5" r="1.2" fill="currentColor"></circle>
        <circle cx="15.5" cy="7" r="1.2" fill="currentColor"></circle>
      </svg>
      <span className="theme-shuffle-name">{activeTheme.name}</span>
    </button>
  );
}

export default ThemeSwitcher;
