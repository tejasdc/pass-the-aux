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

  const queueWriteResponse = await callJson(env, "/api/queue", {
    uri: "spotify:track:123",
  });
  assert.equal(queueWriteResponse.status, 403);
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

let fakeNow = Date.UTC(2026, 1, 14, 20, 0, 0);
const realDateNow = Date.now;
Date.now = () => fakeNow;

try {
  await testAuthStartsWithoutPassphrase();
  await testFirstHostBindingRefusesSecondIdentity();
  await testGuestRoutesRefuseWhenNoPartyIsLive();
  await testEndAndLogoutRequireHostSession();
  await testPartyLifecycle();
  console.log("party-session worker harness passed");
} finally {
  Date.now = realDateNow;
}
