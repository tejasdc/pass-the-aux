import { useState, useEffect, useCallback } from 'react';

const REFRESH_INTERVAL = 10000; // 10 seconds

export function useQueue({ enabled = true } = {}) {
  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQueue = useCallback(async () => {
    if (!enabled) {
      setQueue([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/queue');

      if (!response.ok) {
        throw new Error(`Failed to fetch queue: ${response.status}`);
      }

      const data = await response.json();

      // Handle various response formats
      if (Array.isArray(data)) {
        setQueue(data);
      } else if (data.queue) {
        setQueue(data.queue);
      } else if (data.tracks) {
        setQueue(data.tracks);
      } else {
        setQueue([]);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching queue:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  // Initial fetch
  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Auto-refresh
  useEffect(() => {
    if (!enabled) return undefined;

    const interval = setInterval(fetchQueue, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled, fetchQueue]);

  // Add to queue function
  const addToQueue = useCallback(async (uri) => {
    if (!enabled) {
      return {
        success: false,
        error: 'No party right now. Check back when the host starts one.',
      };
    }

    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uri }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle vibe mismatch specially
        if (data.error === 'vibe_mismatch') {
          return {
            success: false,
            error: 'vibe_mismatch',
            message: data.message,
            reason: data.reason,
          };
        }
        throw new Error(data.message || data.error || `Failed to add to queue: ${response.status}`);
      }

      // Refresh queue after adding
      await fetchQueue();
      return { success: true };
    } catch (err) {
      console.error('Error adding to queue:', err);
      return { success: false, error: err.message };
    }
  }, [enabled, fetchQueue]);

  return { queue, isLoading, error, refetch: fetchQueue, addToQueue };
}

export default useQueue;
