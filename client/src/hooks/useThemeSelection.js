import { useCallback, useMemo, useState } from 'react';
import { getRandomThemeId, getThemeById } from '../themes';

// Every visit deals a fresh random theme so guests around the room see
// different ones; shuffling changes it for the rest of that visit only.
export function useThemeSelection() {
  const [themeId, setThemeId] = useState(() => getRandomThemeId());
  const activeTheme = useMemo(() => getThemeById(themeId), [themeId]);

  const shuffleTheme = useCallback(() => {
    setThemeId((currentThemeId) => getRandomThemeId(currentThemeId));
  }, []);

  return {
    activeTheme,
    themeId: activeTheme.id,
    shuffleTheme,
  };
}

export default useThemeSelection;
