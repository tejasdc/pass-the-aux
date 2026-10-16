import assert from "node:assert/strict";
import worker from "../src/index.js";

const BASE_URL = "https://electric-love.test";
const PARTY_TTL_MS = 8 * 60 * 60 * 1000;

class MemoryKV {
  constructor() {
    this.records = new Map();
  }

  async get(key, type) {
    const record = this.records.get(key);
    if (!record) return null;

    if (record.expiresAt && record.expiresAt <= Date.now()) {
      this.records.delete(key);
      return null;
    }

    if (type === "json") {
      return JSON.parse(record.value);
    }

    return record.value;
  }

  async put(key, value, options = {}) {
    const expiresAt = options.expirationTtl
      ? Date.now() + options.expirationTtl * 1000
      : null;
    this.records.set(key, { value, expiresAt });
  }

  async delete(key) {
    this.records.delete(key);
  }
}

function createEnv(overrides = {}) {
  return {
    PARTY_QUEUE_KV: new MemoryKV(),
    SPOTIFY_CLIENT_ID: "spotify-client",
    SPOTIFY_CLIENT_SECRET: "spotify-secret",
    ASSETS: {
      fetch: () => new Response("asset"),
    },
    ...overrides,
  };
}

async function call(env, path, init = {}) {
  return worker.fetch(new Request(`${BASE_URL}${path}`, init), env);
}

async function callJson(env, path, body) {
  return call(env, path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function responseJson(response) {
  return response.json();
}

function getRedirectLocation(response) {
  const location = response.headers.get("Location");
  assert.ok(location, "expected a redirect Location header");
  return location;
}

function getHostCookie(response) {
  const setCookie = response.headers.get("Set-Cookie");
  assert.ok(setCookie, "expected host session Set-Cookie header");
  assert.match(setCookie, /^el_host_session=/);
  return setCookie.split(";")[0];
}

async function assertPartyClosed(env, init = {}) {
  const response = await call(env, "/api/party/status", init);
  assert.equal(response.status, 200);
  const status = await responseJson(response);
  assert.equal(status.live, false);
  assert.equal(status.expiresAt, null);
}

async function beginOAuth(env, path = "/api/auth/login?returnTo=/host") {
  const loginResponse = await call(env, path);
  assert.equal(loginResponse.status, 302);
  const spotifyLocation = getRedirectLocation(loginResponse);
  const spotifyUrl = new URL(spotifyLocation);
  assert.equal(spotifyUrl.origin, "https://accounts.spotify.com");
  assert.equal(spotifyUrl.searchParams.get("client_id"), "spotify-client");
  const oauthState = spotifyUrl.searchParams.get("state");
  assert.ok(oauthState);
  return oauthState;
}

async function completeOAuth(env, oauthState, spotifyUserId) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url) === "https://accounts.spotify.com/api/token") {
      return Response.json({
        access_token: `access-token-${spotifyUserId}`,
        refresh_token: `refresh-token-${spotifyUserId}`,
        expires_in: 3600,
      });
    }

    if (String(url) === "https://api.spotify.com/v1/me") {
      return Response.json({ id: spotifyUserId, display_name: spotifyUserId });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    return await call(
      env,
      `/api/auth/callback?code=spotify-code&state=${oauthState}`,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function startThroughOAuth(env, spotifyUserId = "spotify-host") {
  const oauthState = await beginOAuth(env);
  const callbackResponse = await completeOAuth(env, oauthState, spotifyUserId);

  assert.equal(callbackResponse.status, 302);
  assert.equal(
    getRedirectLocation(callbackResponse),
    `${BASE_URL}/host?authenticated=true&party=live`,
  );

  return getHostCookie(callbackResponse);
}

async function testAuthStartsWithoutPassphrase() {
  const env = createEnv();
  const startResponse = await call(env, "/api/party/start", { method: "POST" });
  assert.equal(startResponse.status, 200);
  const start = await responseJson(startResponse);
  assert.equal(start.authUrl, "/api/auth/login?returnTo=%2Fhost");

  const oauthState = await beginOAuth(env, start.authUrl);
  const callbackResponse = await completeOAuth(env, oauthState, "spotify-host");

  assert.equal(callbackResponse.status, 302);
  assert.equal(await env.PARTY_QUEUE_KV.get("host:spotify-user-id"), "spotify-host");
  assert.equal((await env.PARTY_QUEUE_KV.get("host:tokens", "json")).hostUserId, "spotify-host");
}

async function testFirstHostBindingRefusesSecondIdentity() {
  const env = createEnv();
  await startThroughOAuth(env, "spotify-host");

  assert.equal(await env.PARTY_QUEUE_KV.get("host:spotify-user-id"), "spotify-host");

  const oauthState = await beginOAuth(env);
  const callbackResponse = await completeOAuth(env, oauthState, "someone-else");

  assert.equal(callbackResponse.status, 302);
  assert.equal(getRedirectLocation(callbackResponse), `${BASE_URL}/host?error=host_mismatch`);
  assert.equal(callbackResponse.headers.get("Set-Cookie"), null);
  assert.equal(await env.PARTY_QUEUE_KV.get("host:spotify-user-id"), "spotify-host");
  assert.equal((await env.PARTY_QUEUE_KV.get("host:tokens", "json")).hostUserId, "spotify-host");
}

async function testGuestRoutesRefuseWhenNoPartyIsLive() {
  const env = createEnv();
  await env.PARTY_QUEUE_KV.put("host:tokens", JSON.stringify({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: Date.now() + 3600 * 1000,
  }));

  const searchResponse = await call(env, "/api/search?q=test");
  assert.equal(searchResponse.status, 403);
  assert.match((await responseJson(searchResponse)).error, /No party right now/);

  const queueReadResponse = await call(env, "/api/queue");
  assert.equal(queueReadResponse.status, 403);

  const lyricsResponse = await call(env, "/api/lyrics?trackId=0123456789012345678901");
  assert.equal(lyricsResponse.status, 403);

  const queueWriteResponse = await callJson(env, "/api/queue", {
    uri: "spotify:track:123",
  });
  assert.equal(queueWriteResponse.status, 403);
}

async function testLyricsFollowCurrentTrackAndCache() {
  const env = createEnv();
  await env.PARTY_QUEUE_KV.put("host:tokens", JSON.stringify({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: Date.now() + 3600 * 1000,
  }));
  await env.PARTY_QUEUE_KV.put("party:session", JSON.stringify({
    live: true,
    hostUserId: "spotify-host",
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + PARTY_TTL_MS).toISOString(),
    durationSeconds: 8 * 60 * 60,
  }));

  const firstId = "0123456789012345678901";
  const secondId = "0123456789012345678902";
  const thirdId = "0123456789012345678903";
  let currentId = firstId;
  let lyricFetches = 0;
  let failLyrics = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const requestUrl = String(url);
    if (requestUrl === "https://api.spotify.com/v1/me/player/currently-playing") {
      return Response.json({ item: {
        id: currentId, name: currentId === firstId ? "First Song" : currentId === secondId ? "Second Song" : "Third Song",
        artists: [{ name: "The Artist" }], album: { name: "The Album" },
        duration_ms: 180000,
      } });
    }
    if (requestUrl.startsWith("https://lrclib.net/api/get?")) {
      lyricFetches += 1;
      if (failLyrics) return Response.json({}, { status: 500 });
      const query = new URL(requestUrl);
      assert.equal(query.searchParams.get("artist_name"), "The Artist");
      return Response.json({ syncedLyrics: `[00:01.00]${query.searchParams.get("track_name")}` });
    }
    throw new Error(`Unexpected fetch: ${requestUrl}`);
  };

  try {
    const first = await call(env, `/api/lyrics?trackId=${firstId}`);
    assert.equal(first.status, 200);
    assert.deepEqual(await responseJson(first), { status: "synced", text: "[00:01.00]First Song" });
    assert.equal((await responseJson(await call(env, `/api/lyrics?trackId=${firstId}`))).status, "synced");
    assert.equal(lyricFetches, 1, "lyrics come from KV on a repeat request");

    currentId = secondId;
    const stale = await call(env, `/api/lyrics?trackId=${firstId}`);
    assert.equal(stale.status, 409, "a stale track is rejected even if its lyrics were cached");
    assert.equal((await responseJson(stale)).status, "track_changed");

    const second = await call(env, `/api/lyrics?trackId=${secondId}`);
    assert.deepEqual(await responseJson(second), { status: "synced", text: "[00:01.00]Second Song" });
    assert.equal(lyricFetches, 2);

    currentId = thirdId;
    failLyrics = true;
    const temporary = await call(env, `/api/lyrics?trackId=${thirdId}`);
    assert.equal(temporary.status, 503);
    assert.equal((await responseJson(temporary)).status, "temporary_error");
    failLyrics = false;
    fakeNow += 60 * 1000 + 1;
    const recovered = await call(env, `/api/lyrics?trackId=${thirdId}`);
    assert.deepEqual(await responseJson(recovered), { status: "synced", text: "[00:01.00]Third Song" });
    assert.equal(lyricFetches, 4, "provider error expires and the track is retried");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testNowPlayingCompensatesForFeatureLookupTime() {
  const env = createEnv();
  await env.PARTY_QUEUE_KV.put("host:tokens", JSON.stringify({
    accessToken: "access-token", refreshToken: "refresh-token", expiresAt: Date.now() + 3600 * 1000,
  }));
  await env.PARTY_QUEUE_KV.put("party:session", JSON.stringify({
    live: true, hostUserId: "spotify-host", startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + PARTY_TTL_MS).toISOString(), durationSeconds: 8 * 60 * 60,
  }));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const requestUrl = String(url);
    if (requestUrl === "https://api.spotify.com/v1/me/player/currently-playing") {
      return Response.json({ is_playing: true, progress_ms: 10000, item: {
        id: "0123456789012345678901", name: "Test Song", duration_ms: 180000,
        artists: [{ name: "Artist" }], album: { name: "Album", images: [] },
      } });
    }
    if (requestUrl.startsWith("https://api.reccobeats.com/v1/audio-features")) {
      fakeNow += 1500;
      return Response.json({ content: [{ tempo: 120, energy: 0.6 }] });
    }
    throw new Error(`Unexpected fetch: ${requestUrl}`);
  };
  try {
    const playing = await responseJson(await call(env, "/api/now-playing"));
    assert.equal(playing.track.progress_ms, 11500, "the delivered playhead includes lookup time");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testEndAndLogoutRequireHostSession() {
  const env = createEnv();
  const hostCookie = await startThroughOAuth(env);

  const guestEndResponse = await call(env, "/api/party/end", { method: "POST" });
  assert.equal(guestEndResponse.status, 403);

  const hostEndResponse = await call(env, "/api/party/end", {
    method: "POST",
    headers: { Cookie: hostCookie },
  });
  assert.equal(hostEndResponse.status, 200);
  await assertPartyClosed(env, { headers: { Cookie: hostCookie } });

  const guestLogoutResponse = await call(env, "/api/auth/logout", { method: "POST" });
  assert.equal(guestLogoutResponse.status, 403);

  await startThroughOAuth(env);
  const hostLogoutResponse = await call(env, "/api/auth/logout", {
    method: "POST",
    headers: { Cookie: hostCookie },
  });
  assert.equal(hostLogoutResponse.status, 200);
  assert.match(hostLogoutResponse.headers.get("Set-Cookie"), /Max-Age=0/);
  assert.equal(await env.PARTY_QUEUE_KV.get("host:tokens", "json"), null);
  assert.equal(await env.PARTY_QUEUE_KV.get("party:session", "json"), null);
}

async function testPartyLifecycle() {
  const env = createEnv();

  await assertPartyClosed(env);
  const hostCookie = await startThroughOAuth(env);

  const liveResponse = await call(env, "/api/party/status", {
    headers: { Cookie: hostCookie },
  });
  assert.equal(liveResponse.status, 200);
  const live = await responseJson(liveResponse);
  assert.equal(live.live, true);
  assert.equal(live.hostSession, true);
  assert.ok(live.expiresAt);
  assert.ok(live.secondsRemaining <= 8 * 60 * 60);

  const session = await env.PARTY_QUEUE_KV.get("party:session", "json");
  assert.equal(session.live, true);
  assert.equal(session.hostUserId, "spotify-host");
  assert.equal(session.durationSeconds, 8 * 60 * 60);

  const endResponse = await call(env, "/api/party/end", {
    method: "POST",
    headers: { Cookie: hostCookie },
  });
  assert.equal(endResponse.status, 200);
  await assertPartyClosed(env);

  await startThroughOAuth(env);
  fakeNow += PARTY_TTL_MS + 1000;
  await assertPartyClosed(env);
  assert.equal(await env.PARTY_QUEUE_KV.get("party:session", "json"), null);
}

async function testNowPlayingIncludesCachedAudioFeatures() {
  const env = createEnv();
  await env.PARTY_QUEUE_KV.put("host:tokens", JSON.stringify({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: Date.now() + 3600 * 1000,
  }));
  await env.PARTY_QUEUE_KV.put("party:session", JSON.stringify({
    live: true,
    hostUserId: "spotify-host",
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + PARTY_TTL_MS).toISOString(),
    durationSeconds: 8 * 60 * 60,
  }));

  const originalFetch = globalThis.fetch;
  let reccoFetches = 0;

  globalThis.fetch = async (url) => {
    const requestUrl = String(url);

    if (requestUrl === "https://api.spotify.com/v1/me/player/currently-playing") {
      return Response.json({
        is_playing: true,
        progress_ms: 42000,
        item: {
          id: "track-123",
          name: "Real BPM Song",
          artists: [{ id: "artist-1", name: "The Meters" }],
          album: { id: "album-1", name: "Party Data", images: [] },
          duration_ms: 180000,
          uri: "spotify:track:track-123",
        },
      });
    }

    if (requestUrl === "https://api.reccobeats.com/v1/audio-features?ids=track-123") {
      reccoFetches += 1;
      return Response.json({
        content: [{
          energy: 0.82,
          valence: 0.64,
          danceability: 0.71,
          tempo: 126.4,
          acousticness: 0.12,
          instrumentalness: 0.01,
          liveness: 0.22,
          speechiness: 0.04,
          loudness: -5.8,
          key: 7,
          mode: 1,
        }],
      });
    }

    throw new Error(`Unexpected fetch: ${requestUrl}`);
  };

  try {
    const firstResponse = await call(env, "/api/now-playing");
    assert.equal(firstResponse.status, 200);
    const first = await responseJson(firstResponse);
    assert.equal(first.playing, true);
    assert.deepEqual(first.track.audioFeatures, {
      bpm: 126,
      tempo: 126.4,
      energy: 0.82,
      energyLevel: "high",
    });

    const secondResponse = await call(env, "/api/now-playing");
    assert.equal(secondResponse.status, 200);
    const second = await responseJson(secondResponse);
    assert.equal(second.track.audioFeatures.bpm, 126);
    assert.equal(reccoFetches, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testNowPlayingKeepsABeatWhenFeaturesAreMissing() {
  const env = createEnv();
  await env.PARTY_QUEUE_KV.put("host:tokens", JSON.stringify({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: Date.now() + 24 * 3600 * 1000,
  }));
  await env.PARTY_QUEUE_KV.put("party:session", JSON.stringify({
    live: true,
    hostUserId: "spotify-host",
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    durationSeconds: 8 * 60 * 60,
  }));

  const originalFetch = globalThis.fetch;
  let reccoFetches = 0;
  let reccoKnowsTrack = false;

  globalThis.fetch = async (url) => {
    const requestUrl = String(url);

    if (requestUrl === "https://api.spotify.com/v1/me/player/currently-playing") {
      return Response.json({
        is_playing: true,
        progress_ms: 1000,
        item: {
          id: "track-new",
          name: "Fresh Single",
          artists: [{ id: "artist-2", name: "New Act" }],
          album: { id: "album-2", name: "Fresh Single", images: [] },
          duration_ms: 200000,
          uri: "spotify:track:track-new",
        },
      });
    }

    if (requestUrl === "https://api.reccobeats.com/v1/audio-features?ids=track-new") {
      reccoFetches += 1;
      return Response.json({
        content: reccoKnowsTrack ? [{ energy: 0.4, tempo: 98 }] : [],
      });
    }

    throw new Error(`Unexpected fetch: ${requestUrl}`);
  };

  try {
    const missing = await responseJson(await call(env, "/api/now-playing"));
    assert.deepEqual(missing.track.audioFeatures, {
      bpm: 120,
      tempo: 120,
      energy: 0.6,
      energyLevel: "medium",
      estimated: true,
    });

    reccoKnowsTrack = true;
    await call(env, "/api/now-playing");
    assert.equal(reccoFetches, 1, "a recent miss is served from cache");

    fakeNow += 6 * 60 * 60 * 1000 + 1000;
    const found = await responseJson(await call(env, "/api/now-playing"));
    assert.equal(reccoFetches, 2, "an expired miss is looked up again");
    assert.equal(found.track.audioFeatures.bpm, 98);
    assert.equal(found.track.audioFeatures.estimated, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

let fakeNow = Date.UTC(2026, 1, 14, 20, 0, 0);
const realDateNow = Date.now;
Date.now = () => fakeNow;

try {
  await testAuthStartsWithoutPassphrase();
  await testFirstHostBindingRefusesSecondIdentity();
  await testGuestRoutesRefuseWhenNoPartyIsLive();
  await testEndAndLogoutRequireHostSession();
  await testPartyLifecycle();
  await testNowPlayingIncludesCachedAudioFeatures();
  await testNowPlayingKeepsABeatWhenFeaturesAreMissing();
  await testNowPlayingCompensatesForFeatureLookupTime();
  await testLyricsFollowCurrentTrackAndCache();
  console.log("party-session worker harness passed");
} finally {
  Date.now = realDateNow;
}
