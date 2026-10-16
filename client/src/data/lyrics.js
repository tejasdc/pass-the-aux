const lyricsByTrack = new Map();

export async function getLyrics(trackId) {
  const cached = lyricsByTrack.get(trackId);
  if (cached) return cached;

  const request = fetch(`/api/lyrics?trackId=${encodeURIComponent(trackId)}`)
    .then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (response.status === 503 && ['rate_limited', 'temporary_error'].includes(result.status)) {
        lyricsByTrack.delete(trackId);
        return result;
      }
      if (response.status === 409) {
        lyricsByTrack.delete(trackId);
        return { status: 'track_changed' };
      }
      if (!response.ok) throw new Error('Lyrics could not be loaded');
      if (result.status === 'unavailable') lyricsByTrack.delete(trackId);
      return result;
    })
    .catch((error) => {
      lyricsByTrack.delete(trackId);
      throw error;
    });
  lyricsByTrack.set(trackId, request);
  return request;
}

export function parseSyncedLyrics(text) {
  if (!text) return [];
  const lines = [];
  for (const row of text.split(/\r?\n/)) {
    const stamps = [...row.matchAll(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    const words = row.replace(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g, '').trim();
    for (const stamp of stamps) {
      const minutes = Number(stamp[1]);
      const seconds = Number(stamp[2]);
      if (seconds >= 60) continue;
      const fraction = Number((stamp[3] || '').padEnd(3, '0'));
      lines.push({ timeMs: (minutes * 60 + seconds) * 1000 + fraction, words });
    }
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

export function activeLyricIndex(lines, progressMs) {
  let low = 0;
  let high = lines.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (lines[middle].timeMs <= progressMs) low = middle + 1;
    else high = middle;
  }
  return low - 1;
}
