import assert from 'node:assert/strict';
import { getLyrics, activeLyricIndex, parseSyncedLyrics } from '../src/data/lyrics.js';

const originalFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = async () => {
  calls += 1;
  return calls === 1
    ? Response.json({ status: 'temporary_error', retryAfterSeconds: 1 }, { status: 503 })
    : Response.json({ status: 'synced', text: '[00:01.00]Recovered\n[00:02.00]Next' });
};

try {
  const trackId = '0123456789012345678901';
  assert.equal((await getLyrics(trackId)).status, 'temporary_error');
  const recovered = await getLyrics(trackId);
  assert.equal(calls, 2, 'a transient provider failure is retried');
  const lines = parseSyncedLyrics(recovered.text);
  assert.equal(activeLyricIndex(lines, 1999), 0);
  assert.equal(activeLyricIndex(lines, 2000), 1, 'the highlighted line changes at its timestamp');
} finally {
  globalThis.fetch = originalFetch;
}

console.log('client lyrics recovery and timing passed');
