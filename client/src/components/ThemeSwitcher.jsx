import { THEMES } from '../themes';

function ThemeSwitcher({ activeTheme, onCycle }) {
  const currentIndex = THEMES.findIndex((theme) => theme.id === activeTheme.id);
  const label = `${activeTheme.name}: ${activeTheme.reference}`;

  return (
    <button
      className="theme-switcher"
      type="button"
      onClick={onCycle}
      aria-label={`Theme: ${label}. Switch theme`}
      title={label}
    >
      <span className="theme-switcher-mark" aria-hidden="true"></span>
      <span className="theme-switcher-copy">
        <span>Theme</span>
        <small>{activeTheme.name} {currentIndex + 1}/{THEMES.length}</small>
      </span>
    </button>
  );
}

export default ThemeSwitcher;
