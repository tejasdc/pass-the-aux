import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 5000; // 5 seconds

export function useNowPlaying({ enabled = true } = {}) {
  const [track, setTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNowPlaying = useCallback(async () => {
    if (!enabled) {
      setTrack(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/now-playing');

      if (response.status === 204) {
        // No content - nothing playing
        setTrack(null);
        setError(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch now playing: ${response.status}`);
      }

      const data = await response.json();

      // Handle response format from backend: { playing: boolean, track: { ... } }
      if (data.track) {
        setTrack({
          ...data.track,
          is_playing: data.playing
        });
      } else if (data.item) {
        // Fallback for direct Spotify API format
        setTrack({
          ...data.item,
          progress_ms: data.progress_ms,
          is_playing: data.is_playing
        });
      } else {
        setTrack(null);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching now playing:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  // Initial fetch
  useEffect(() => {
    fetchNowPlaying();
  }, [fetchNowPlaying]);

  // Auto-refresh
  useEffect(() => {
    if (!enabled) return undefined;

    const interval = setInterval(fetchNowPlaying, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled, fetchNowPlaying]);

  return { track, isLoading, error, refetch: fetchNowPlaying };
}

export default useNowPlaying;
