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
    HOST_KEY: "open sesame",
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

async function assertPartyClosed(env) {
  const response = await call(env, "/api/party/status");
  assert.equal(response.status, 200);
  const status = await responseJson(response);
  assert.equal(status.live, false);
  assert.equal(status.expiresAt, null);
}

async function startThroughOAuth(env) {
  const startResponse = await callJson(env, "/api/party/start", {
    passphrase: "open sesame",
  });
  assert.equal(startResponse.status, 200);
  const start = await responseJson(startResponse);
  assert.match(start.authUrl, /^\/api\/auth\/login\?grant=/);

  const loginResponse = await call(env, start.authUrl);
  assert.equal(loginResponse.status, 302);
  const spotifyLocation = getRedirectLocation(loginResponse);
  const spotifyUrl = new URL(spotifyLocation);
  assert.equal(spotifyUrl.origin, "https://accounts.spotify.com");
  assert.equal(spotifyUrl.searchParams.get("client_id"), "spotify-client");
  const oauthState = spotifyUrl.searchParams.get("state");
  assert.ok(oauthState);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://accounts.spotify.com/api/token");
    return Response.json({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
    });
  };

  try {
    const callbackResponse = await call(
      env,
      `/api/auth/callback?code=spotify-code&state=${oauthState}`,
    );
    assert.equal(callbackResponse.status, 302);
    assert.equal(
      getRedirectLocation(callbackResponse),
      `${BASE_URL}/host?authenticated=true&party=live`,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testStartRefusesWithoutHostKeyMatch() {
  const missingSecretEnv = createEnv({ HOST_KEY: undefined });
  const missingSecretResponse = await callJson(missingSecretEnv, "/api/party/start", {
    passphrase: "open sesame",
  });
  assert.equal(missingSecretResponse.status, 403);

  const wrongPassphraseEnv = createEnv();
  const wrongPassphraseResponse = await callJson(wrongPassphraseEnv, "/api/party/start", {
    passphrase: "wrong",
  });
  assert.equal(wrongPassphraseResponse.status, 403);

  const bareLoginResponse = await call(wrongPassphraseEnv, "/api/auth/login");
  assert.equal(bareLoginResponse.status, 403);
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

async function testPartyLifecycle() {
  const env = createEnv();

  await assertPartyClosed(env);
  await startThroughOAuth(env);

  const liveResponse = await call(env, "/api/party/status");
  assert.equal(liveResponse.status, 200);
  const live = await responseJson(liveResponse);
  assert.equal(live.live, true);
  assert.ok(live.expiresAt);
  assert.ok(live.secondsRemaining <= 8 * 60 * 60);

  const session = await env.PARTY_QUEUE_KV.get("party:session", "json");
  assert.equal(session.live, true);
  assert.equal(session.durationSeconds, 8 * 60 * 60);

  const endResponse = await callJson(env, "/api/party/end", {
    passphrase: "open sesame",
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
  await testStartRefusesWithoutHostKeyMatch();
  await testGuestRoutesRefuseWhenNoPartyIsLive();
  await testPartyLifecycle();
  console.log("party-session worker harness passed");
} finally {
  Date.now = realDateNow;
}
