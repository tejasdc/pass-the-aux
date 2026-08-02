import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_THEME_ID, getNextThemeId, getRandomThemeId, getThemeById } from '../themes';

const THEME_STORAGE_KEY = 'pass-the-aux-theme';

function readStoredThemeId() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistThemeId(themeId) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // Theme choice is cosmetic; blocked storage should never break the queue.
  }
}

function initialThemeId() {
  const storedThemeId = readStoredThemeId();
  if (storedThemeId) {
    return getThemeById(storedThemeId)?.id || DEFAULT_THEME_ID;
  }

  const randomThemeId = getRandomThemeId();
  persistThemeId(randomThemeId);
  return randomThemeId;
}

export function useThemeSelection() {
  const [themeId, setThemeIdState] = useState(initialThemeId);
  const activeTheme = useMemo(() => getThemeById(themeId), [themeId]);

  const setThemeId = useCallback((nextThemeId) => {
    const nextTheme = getThemeById(nextThemeId);
    const safeThemeId = nextTheme?.id || DEFAULT_THEME_ID;
    setThemeIdState(safeThemeId);
    persistThemeId(safeThemeId);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeIdState((currentThemeId) => {
      const nextThemeId = getNextThemeId(currentThemeId);
      persistThemeId(nextThemeId);
      return nextThemeId;
    });
  }, []);

  return {
    activeTheme,
    themeId: activeTheme.id,
    setThemeId,
    cycleTheme,
  };
}

export default useThemeSelection;
