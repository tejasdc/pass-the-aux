import AnimatedBackground from '../components/AnimatedBackground';

export const DEFAULT_THEME_ID = 'suprematist';

export const THEMES = [
  {
    id: 'suprematist',
    name: 'Suprematist',
    reference: 'Kazimir Malevich, Suprematist Painting (1916-17)',
    href: 'https://www.moma.org/collection/works/80387',
    className: 'theme-suprematist',
    Background: AnimatedBackground,
  },
];

const themeById = new Map(THEMES.map((theme) => [theme.id, theme]));

export function getThemeById(themeId) {
  return themeById.get(themeId) || themeById.get(DEFAULT_THEME_ID);
}

export function getRandomThemeId() {
  return THEMES[Math.floor(Math.random() * THEMES.length)]?.id || DEFAULT_THEME_ID;
}

export function getNextThemeId(themeId) {
  const index = THEMES.findIndex((theme) => theme.id === themeId);
  const nextIndex = index >= 0 ? (index + 1) % THEMES.length : 0;
  return THEMES[nextIndex]?.id || DEFAULT_THEME_ID;
}
