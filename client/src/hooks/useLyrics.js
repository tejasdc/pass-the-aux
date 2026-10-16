import { useEffect, useState } from 'react';
import { getLyrics } from '../data/lyrics';

export function useLyrics(trackId) {
  const [state, setState] = useState({ trackId: null, result: null });

  useEffect(() => {
    if (!trackId) {
      setState({ trackId: null, result: null });
      return undefined;
    }

    let active = true;
    let retryTimer;
    setState({ trackId, result: null });

    async function load() {
      try {
        const result = await getLyrics(trackId);
        if (!active) return;
        setState({ trackId, result });
        if (result.status === 'rate_limited' || result.status === 'temporary_error') {
          retryTimer = setTimeout(load, result.retryAfterSeconds * 1000);
        }
      } catch {
        if (active) setState({ trackId, result: { status: 'error' } });
      }
    }

    load();
    return () => {
      active = false;
      clearTimeout(retryTimer);
    };
  }, [trackId]);

  return state.trackId === trackId ? state.result : null;
}
