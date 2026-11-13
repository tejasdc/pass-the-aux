import { useEffect, useState } from 'react';

// The party display (the big-screen layout, or the /lyrics display link)
// must not let the computer's screen sleep mid-party. The browser's Screen
// Wake Lock keeps the display on while this tab is visible. The browser
// drops the lock whenever the tab is hidden or minimized, so it is asked for
// again each time the tab comes back. Some browsers also refuse until the page
// has had a click or key press, so the first interaction retries. Phones are
// left alone: a guest's phone should sleep normally.
export const DISPLAY_SCREEN_QUERY = '(min-width: 1280px)';

export function useScreenWakeLock(enabled) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return undefined;

    let sentinel = null;
    let requesting = false;
    let stopped = false;

    const acquire = async () => {
      if (stopped || requesting || document.visibilityState !== 'visible') return;
      if (sentinel && !sentinel.released) return;
      requesting = true;
      try {
        sentinel = await navigator.wakeLock.request('screen');
        document.documentElement.dataset.screenAwake = 'held';
        sentinel.addEventListener('release', () => {
          document.documentElement.dataset.screenAwake = 'released';
        });
        if (stopped) sentinel.release();
      } catch (error) {
        document.documentElement.dataset.screenAwake = `refused:${error.name}`;
      } finally {
        requesting = false;
      }
    };

    acquire();
    document.addEventListener('visibilitychange', acquire);
    window.addEventListener('pointerdown', acquire);
    window.addEventListener('keydown', acquire);

    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', acquire);
      window.removeEventListener('pointerdown', acquire);
      window.removeEventListener('keydown', acquire);
      sentinel?.release().catch(() => {});
      delete document.documentElement.dataset.screenAwake;
    };
  }, [enabled]);
}

export function useIsDisplayScreen() {
  const [matches, setMatches] = useState(() => window.matchMedia(DISPLAY_SCREEN_QUERY).matches);
  useEffect(() => {
    const list = window.matchMedia(DISPLAY_SCREEN_QUERY);
    const onChange = () => setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);
  return matches;
}
