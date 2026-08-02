const TOKEN_KEY = "host:tokens";
const HOST_ID_KEY = "host:spotify-user-id";
const PARTY_SESSION_KEY = "party:session";
const VIBE_KEY = "party:vibe";
const HOST_SESSION_PREFIX = "host:session:";
const HOST_SESSION_COOKIE = "el_host_session";
const OAUTH_STATE_PREFIX = "oauth:state:";
const RATE_LIMIT_PREFIX = "rate-limit:";

const PARTY_SESSION_TTL_SECONDS = 8 * 60 * 60;
const PARTY_SESSION_TTL_MS = PARTY_SESSION_TTL_SECONDS * 1000;
const HOST_SESSION_TTL_SECONDS = PARTY_SESSION_TTL_SECONDS;
const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_SECONDS = RATE_LIMIT_WINDOW_MS / 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

const VIBE_PRESETS = {
  off: {
    name: "Off",
    description: "No vibe filtering - all songs allowed",
    enabled: false,
  },
  match: {
    name: "Match Now Playing",
    description: "Match the vibe of whatever is currently playing",
    enabled: true,
    dynamic: true,
    tolerance: {
      energy: 0.4,
      valence: 0.45,
      danceability: 0.4,
      tempo: 35,
    },
  },
  chill: {
    name: "Chill Vibes",
    description: "Relaxed, mellow tracks for a laid-back atmosphere",
    enabled: true,
    energy: { min: 0.1, max: 0.6 },
    valence: { min: 0.2, max: 0.8 },
    tempo: { min: 60, max: 120 },
    danceability: { min: 0.3, max: 0.8 },
  },
  party: {
    name: "Party Mode",
    description: "High energy, danceable tracks to keep the party going",
    enabled: true,
    energy: { min: 0.6, max: 1.0 },
    valence: { min: 0.4, max: 1.0 },
    tempo: { min: 100, max: 150 },
    danceability: { min: 0.6, max: 1.0 },
  },
  romantic: {
    name: "Romantic",
    description: "Smooth, emotional tracks perfect for Valentine's Day",
    enabled: true,
    energy: { min: 0.1, max: 0.6 },
    valence: { min: 0.2, max: 0.7 },
    tempo: { min: 60, max: 120 },
    danceability: { min: 0.2, max: 0.7 },
  },
  hype: {
    name: "Hype",
    description: "Maximum energy bangers only",
    enabled: true,
    energy: { min: 0.75, max: 1.0 },
    valence: { min: 0.5, max: 1.0 },
    tempo: { min: 110, max: 180 },
    danceability: { min: 0.65, max: 1.0 },
  },
  custom: {
    name: "Custom",
    description: "Your own vibe settings",
    enabled: true,
    energy: { min: 0.0, max: 1.0 },
    valence: { min: 0.0, max: 1.0 },
    tempo: { min: 0, max: 300 },
    danceability: { min: 0.0, max: 1.0 },
  },
};

const DEFAULT_VIBE = {
  preset: "match",
  settings: { ...VIBE_PRESETS.match },
};

class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      return await handleApiRequest(request, env, url);
    } catch (err) {
      if (err instanceof ApiError) {
        return json({ error: err.message }, { status: err.status });
      }

      if (err.message === "Not authenticated") {
        return json({ error: "Not authenticated" }, { status: 401 });
      }

      console.error("Unhandled Worker error:", err);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  },
};

async function handleApiRequest(request, env, url) {
  const method = request.method.toUpperCase();
  const pathname = url.pathname;

  if (method === "GET" && pathname === "/api/party/status") {
    return handlePartyStatus(request, env);
  }

  if (method === "POST" && pathname === "/api/party/start") {
    return handleStartParty(request, env);
  }

  if (method === "POST" && pathname === "/api/party/end") {
    return handleEndParty(request, env);
  }

  if (method === "GET" && pathname === "/api/auth/login") {
    return handleAuthLogin(request, env, url);
  }

  if (method === "GET" && pathname === "/api/auth/callback") {
    return handleAuthCallback(request, env, url);
  }

  if (method === "GET" && pathname === "/api/auth/status") {
    return handleAuthStatus(request, env);
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    const hostSession = await requireHostSession(request, env);
    await env.PARTY_QUEUE_KV.delete(TOKEN_KEY);
    await env.PARTY_QUEUE_KV.delete(PARTY_SESSION_KEY);
    await env.PARTY_QUEUE_KV.delete(`${HOST_SESSION_PREFIX}${hostSession.token}`);
    return json(
      { success: true, message: "Logged out successfully" },
      { headers: { "Set-Cookie": clearHostSessionCookie(request) } },
    );
  }

  if (method === "GET" && pathname === "/api/now-playing") {
    await requireLiveParty(env);
    return handleNowPlaying(env);
  }

  if (method === "GET" && pathname === "/api/queue") {
    await requireLiveParty(env);
    return handleGetQueue(env);
  }

  if (method === "POST" && pathname === "/api/queue") {
    await requireLiveParty(env);
    return handleAddToQueue(request, env);
  }

  if (method === "GET" && pathname === "/api/search") {
    await requireLiveParty(env);
    return handleSearch(env, url);
  }

  if (method === "GET" && pathname === "/api/vibe") {
    return handleGetVibe(env);
  }

  if (method === "POST" && pathname === "/api/vibe") {
    await requireLiveParty(env);
    return handleSetVibe(request, env);
  }

  const relatedArtistMatch = pathname.match(/^\/api\/artist\/([^/]+)\/related$/);
  if (method === "GET" && relatedArtistMatch) {
    await requireLiveParty(env);
    return handleRelatedArtists(env, relatedArtistMatch[1]);
  }

  const artistMatch = pathname.match(/^\/api\/artist\/([^/]+)$/);
  if (method === "GET" && artistMatch) {
    await requireLiveParty(env);
    return handleArtist(env, artistMatch[1]);
  }

  const audioFeaturesMatch = pathname.match(/^\/api\/audio-features\/([^/]+)$/);
  if (method === "GET" && audioFeaturesMatch) {
    await requireLiveParty(env);
    return handleSpotifyAudioFeatures(env, audioFeaturesMatch[1]);
  }

  const vibeCheckMatch = pathname.match(/^\/api\/vibe\/check\/([^/]+)$/);
  if (method === "GET" && vibeCheckMatch) {
    await requireLiveParty(env);
    return handleVibeCheck(env, vibeCheckMatch[1]);
  }

  if (method === "GET" && pathname === "/api/rate-limit") {
    return handleRateLimitStatus(request, env);
  }

  return json({ error: "Not found" }, { status: 404 });
}

async function handlePartyStatus(request, env) {
  const session = await getPartySession(env);
  const hostSession = await getHostSession(request, env);

  return json({
    live: !!session,
    expiresAt: session?.expiresAt || null,
    startedAt: session?.startedAt || null,
    hostSession: !!hostSession,
    secondsRemaining: session
      ? Math.max(0, Math.ceil((Date.parse(session.expiresAt) - Date.now()) / 1000))
      : 0,
  });
}

async function handleStartParty(request, env) {
  const authUrl = new URL("/api/auth/login", request.url);
  authUrl.searchParams.set("returnTo", "/host");

  return json({
    success: true,
    authUrl: `${authUrl.pathname}${authUrl.search}`,
    message: "Continue to Spotify.",
  });
}

async function handleEndParty(request, env) {
  await requireHostSession(request, env);
  await env.PARTY_QUEUE_KV.delete(PARTY_SESSION_KEY);

  return json({
    success: true,
    live: false,
    message: "Party ended",
  });
}

async function handleAuthLogin(request, env, url) {
  requireSpotifyCredentials(env);

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();
  const returnTo = safeReturnPath(url.searchParams.get("returnTo"));

  await env.PARTY_QUEUE_KV.put(
    `${OAUTH_STATE_PREFIX}${state}`,
    JSON.stringify({ codeVerifier, createdAt: Date.now(), returnTo }),
    { expirationTtl: OAUTH_STATE_TTL_SECONDS },
  );

  const scopes = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
  ].join(" ");

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("client_id", env.SPOTIFY_CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", getSpotifyRedirectUri(request, env));
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("code_challenge", codeChallenge);

  return Response.redirect(authUrl.toString(), 302);
}

async function handleAuthCallback(request, env, url) {
  requireSpotifyCredentials(env);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const appUrl = getAppUrl(request, env);

  if (error) {
    console.error("OAuth error:", error);
    return Response.redirect(`${appUrl}?error=${encodeURIComponent(error)}`, 302);
  }

  if (!code) {
    return Response.redirect(`${appUrl}?error=missing_code`, 302);
  }

  if (!state) {
    return Response.redirect(`${appUrl}?error=state_mismatch`, 302);
  }

  const stateKey = `${OAUTH_STATE_PREFIX}${state}`;
  const storedAuth = await env.PARTY_QUEUE_KV.get(stateKey, "json");

  if (!storedAuth) {
    console.error("State mismatch or expired. State:", state);
    return Response.redirect(`${appUrl}?error=state_mismatch`, 302);
  }

  await env.PARTY_QUEUE_KV.delete(stateKey);

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth(env)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: getSpotifyRedirectUri(request, env),
        code_verifier: storedAuth.codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error("Token exchange failed:", errorData);
      return Response.redirect(`${appUrl}?error=token_exchange_failed`, 302);
    }

    const tokenData = await tokenResponse.json();
    const spotifyUser = await fetchSpotifyUser(tokenData.access_token);
    const boundHostId = await getBoundHostId(env);

    if (boundHostId && spotifyUser.id !== boundHostId) {
      console.error("Refused host OAuth for non-bound Spotify user:", spotifyUser.id);
      return Response.redirect(withAuthResult(appUrl, storedAuth.returnTo, {
        error: "host_mismatch",
      }), 302);
    }

    if (!boundHostId) {
      await bindHost(env, spotifyUser.id);
    }

    await saveTokens(env, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      hostUserId: spotifyUser.id,
    });
    await createPartySession(env, spotifyUser.id);

    const hostSessionToken = await createHostSession(env, spotifyUser.id);

    console.log("Successfully authenticated with Spotify");
    return redirect(withAuthResult(appUrl, storedAuth.returnTo, {
      authenticated: "true",
      party: "live",
    }), {
      "Set-Cookie": hostSessionCookie(request, hostSessionToken),
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    return Response.redirect(withAuthResult(appUrl, storedAuth.returnTo, {
      error: "server_error",
    }), 302);
  }
}

async function handleAuthStatus(request, env) {
  const hostTokens = await getTokens(env);
  const isAuthenticated = !!(hostTokens.accessToken && hostTokens.expiresAt);
  const expiresAt = hostTokens.expiresAt;
  const session = await getPartySession(env);
  const hostSession = await getHostSession(request, env);

  return json({
    authenticated: isAuthenticated,
    hostSession: !!hostSession,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    party: {
      live: !!session,
      expiresAt: session?.expiresAt || null,
    },
  });
}

async function handleNowPlaying(env) {
  try {
    const response = await spotifyFetch(env, "/me/player/currently-playing");

    if (response.status === 204) {
      return json({ playing: false, track: null });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return json({
        error: "Failed to get currently playing track",
        details: error,
      }, { status: response.status });
    }

    const data = await response.json();

    if (!data || !data.item) {
      return json({ playing: false, track: null });
    }

    return json({
      playing: data.is_playing,
      track: formatTrack(data.item, { progress_ms: data.progress_ms }),
    });
  } catch (err) {
    console.error("Error getting currently playing:", err);
    if (err.message === "Not authenticated") {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    return json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleGetQueue(env) {
  try {
    const response = await spotifyFetch(env, "/me/player/queue");

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return json({
        error: "Failed to get queue",
        details: error,
      }, { status: response.status });
    }

    const data = await response.json();
    const queue = (data.queue || []).slice(0, 20).map(formatTrack);
    const currentlyPlaying = data.currently_playing ? formatTrack(data.currently_playing) : null;

    return json({
      currentlyPlaying,
      queue,
      total: queue.length,
    });
  } catch (err) {
    console.error("Error getting queue:", err);
    if (err.message === "Not authenticated") {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    return json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleSearch(env, url) {
  const q = url.searchParams.get("q");
  const type = url.searchParams.get("type") || "track";

  if (!q) {
    return json({ error: 'Missing search query parameter "q"' }, { status: 400 });
  }

  try {
    const searchUrl = `/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&limit=10`;
    const response = await spotifyFetch(env, searchUrl);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return json({
        error: "Search failed",
        details: error,
      }, { status: response.status });
    }

    const data = await response.json();
    const tracks = (data.tracks?.items || []).map((track) => formatTrack(track, {
      preview_url: track.preview_url,
    }));

    return json({
      tracks,
      total: data.tracks?.total || 0,
    });
  } catch (err) {
    console.error("Error searching:", err);
    if (err.message === "Not authenticated") {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    return json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleAddToQueue(request, env) {
  const rateLimit = await getRateLimit(request, env);
  if (rateLimit.limited) {
    return json({
      error: "Rate limit exceeded",
      message: `You can only add ${RATE_LIMIT_MAX_REQUESTS} songs per hour. Try again in ${rateLimit.minutesRemaining} minute(s).`,
      resetAt: new Date(rateLimit.resetTime).toISOString(),
      remaining: 0,
    }, { status: 429 });
  }

  const body = await readJsonBody(request);
  const { uri } = body;

  if (!uri) {
    return json({ error: "Missing track URI in request body" }, { status: 400 });
  }

  if (!uri.startsWith("spotify:track:")) {
    return json({ error: "Invalid track URI format. Must be spotify:track:..." }, { status: 400 });
  }

  const trackId = uri.replace("spotify:track:", "");

  try {
    const currentVibe = await getCurrentVibe(env);

    if (currentVibe.settings.enabled) {
      const audioFeatures = await getAudioFeatures(trackId);

      if (audioFeatures) {
        const vibeCheck = await checkVibeMatch(env, currentVibe, audioFeatures);

        if (!vibeCheck.matches) {
          return json({
            error: "vibe_mismatch",
            message: `This song doesn't match the ${currentVibe.settings.name} vibe`,
            reason: vibeCheck.reason,
            allReasons: vibeCheck.allReasons,
            audioFeatures: vibeCheck.audioFeatures,
            referenceFeatures: vibeCheck.referenceFeatures,
            currentVibe: currentVibe.preset,
          }, { status: 403 });
        }
      }
    }

    const response = await spotifyFetch(env, `/me/player/queue?uri=${encodeURIComponent(uri)}`, {
      method: "POST",
    });

    if (response.status === 204) {
      const updatedLimit = await incrementRateLimit(env, rateLimit);
      return json({
        success: true,
        message: "Track added to queue",
        rateLimit: {
          remaining: RATE_LIMIT_MAX_REQUESTS - updatedLimit.count,
          resetAt: new Date(updatedLimit.windowStart + RATE_LIMIT_WINDOW_MS).toISOString(),
        },
      });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));

      if (response.status === 404) {
        return json({
          error: "No active device found",
          message: "Please start playing something on Spotify first.",
        }, { status: 404 });
      }

      return json({
        error: "Failed to add track to queue",
        details: error,
      }, { status: response.status });
    }

    return json({ success: true, message: "Track added to queue" });
  } catch (err) {
    console.error("Error adding to queue:", err);
    if (err.message === "Not authenticated") {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    return json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleGetVibe(env) {
  const currentVibe = await getCurrentVibe(env);

  return json({
    currentPreset: currentVibe.preset,
    settings: currentVibe.settings,
    availablePresets: Object.entries(VIBE_PRESETS).map(([key, value]) => ({
      id: key,
      name: value.name,
      description: value.description,
    })),
  });
}

async function handleSetVibe(request, env) {
  const { preset, customSettings } = await readJsonBody(request);

  if (!preset || !VIBE_PRESETS[preset]) {
    return json({
      error: "Invalid preset",
      validPresets: Object.keys(VIBE_PRESETS),
    }, { status: 400 });
  }

  const currentVibe = preset === "custom" && customSettings
    ? {
        preset: "custom",
        settings: {
          ...VIBE_PRESETS.custom,
          ...customSettings,
          enabled: true,
        },
      }
    : {
        preset,
        settings: { ...VIBE_PRESETS[preset] },
      };

  await env.PARTY_QUEUE_KV.put(VIBE_KEY, JSON.stringify(currentVibe));
  console.log(`Vibe set to: ${currentVibe.settings.name}`);

  return json({
    success: true,
    message: `Vibe set to ${currentVibe.settings.name}`,
    currentPreset: currentVibe.preset,
    settings: currentVibe.settings,
  });
}

async function handleSpotifyAudioFeatures(env, trackId) {
  try {
    const response = await spotifyFetch(env, `/audio-features/${trackId}`);
    const status = response.status;
    const data = await response.json().catch(() => null);
    return json({ status, data, trackId });
  } catch (err) {
    return json({ error: err.message, trackId }, { status: 500 });
  }
}

async function handleArtist(env, artistId) {
  try {
    const response = await spotifyFetch(env, `/artists/${artistId}`);
    const status = response.status;
    const data = await response.json().catch(() => null);
    return json({
      status,
      artistId,
      name: data?.name,
      genres: data?.genres || [],
      genreCount: data?.genres?.length || 0,
      popularity: data?.popularity,
    });
  } catch (err) {
    return json({ error: err.message, artistId }, { status: 500 });
  }
}

async function handleRelatedArtists(env, artistId) {
  try {
    const response = await spotifyFetch(env, `/artists/${artistId}/related-artists`);
    const status = response.status;
    const data = await response.json().catch(() => null);
    return json({
      status,
      artistId,
      relatedArtists: (data?.artists || []).slice(0, 5).map((artist) => ({
        id: artist.id,
        name: artist.name,
        genres: artist.genres,
      })),
    });
  } catch (err) {
    return json({ error: err.message, artistId }, { status: 500 });
  }
}

async function handleVibeCheck(env, trackId) {
  const currentVibe = await getCurrentVibe(env);

  if (!currentVibe.settings.enabled) {
    return json({ matches: true, vibeEnabled: false });
  }

  try {
    const audioFeatures = await getAudioFeatures(trackId);

    if (!audioFeatures) {
      return json({
        matches: true,
        vibeEnabled: true,
        note: "Could not fetch audio features, allowing song",
      });
    }

    const vibeCheck = await checkVibeMatch(env, currentVibe, audioFeatures);

    return json({
      matches: vibeCheck.matches,
      vibeEnabled: true,
      currentVibe: currentVibe.settings.name,
      isDynamic: currentVibe.settings.dynamic || false,
      reason: vibeCheck.reason,
      allReasons: vibeCheck.allReasons,
      audioFeatures: {
        energy: audioFeatures.energy,
        valence: audioFeatures.valence,
        tempo: Math.round(audioFeatures.tempo),
        danceability: audioFeatures.danceability,
      },
      referenceFeatures: vibeCheck.referenceFeatures,
      thresholds: vibeCheck.thresholds || {
        energy: currentVibe.settings.energy,
        valence: currentVibe.settings.valence,
        tempo: currentVibe.settings.tempo,
        danceability: currentVibe.settings.danceability,
      },
    });
  } catch (err) {
    console.error("Error checking vibe:", err);
    return json({ error: "Failed to check vibe" }, { status: 500 });
  }
}

async function handleRateLimitStatus(request, env) {
  const rateLimit = await getRateLimit(request, env);

  if (!rateLimit.existingRecord || isExpiredRateLimit(rateLimit.record, Date.now())) {
    return json({
      remaining: RATE_LIMIT_MAX_REQUESTS,
      limit: RATE_LIMIT_MAX_REQUESTS,
      resetAt: null,
    });
  }

  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - rateLimit.record.count);
  const resetAt = new Date(rateLimit.record.windowStart + RATE_LIMIT_WINDOW_MS).toISOString();

  return json({
    remaining,
    limit: RATE_LIMIT_MAX_REQUESTS,
    resetAt,
  });
}

async function spotifyFetch(env, endpoint, options = {}) {
  let hostTokens = await getTokens(env);

  if (hostTokens.expiresAt && Date.now() >= hostTokens.expiresAt - 60000) {
    hostTokens = await refreshAccessToken(env, hostTokens);
  }

  if (!hostTokens.accessToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${hostTokens.accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 401) {
    hostTokens = await refreshAccessToken(env, hostTokens);
    return fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${hostTokens.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  return response;
}

async function refreshAccessToken(env, hostTokens) {
  requireSpotifyCredentials(env);

  if (!hostTokens.refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth(env)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: hostTokens.refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Failed to refresh token:", error);
    await env.PARTY_QUEUE_KV.delete(TOKEN_KEY);
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  const nextTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || hostTokens.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    hostUserId: hostTokens.hostUserId,
  };

  await saveTokens(env, nextTokens);
  console.log("Access token refreshed successfully");
  return nextTokens;
}

async function getTokens(env) {
  const tokens = await env.PARTY_QUEUE_KV.get(TOKEN_KEY, "json");
  return tokens || { accessToken: null, refreshToken: null, expiresAt: null };
}

async function saveTokens(env, tokens) {
  await env.PARTY_QUEUE_KV.put(TOKEN_KEY, JSON.stringify(tokens));
}

async function createPartySession(env, hostUserId) {
  const now = Date.now();
  const session = {
    live: true,
    hostUserId,
    startedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PARTY_SESSION_TTL_MS).toISOString(),
    durationSeconds: PARTY_SESSION_TTL_SECONDS,
  };

  await env.PARTY_QUEUE_KV.put(PARTY_SESSION_KEY, JSON.stringify(session), {
    expirationTtl: PARTY_SESSION_TTL_SECONDS,
  });

  return session;
}

async function getPartySession(env) {
  const session = await env.PARTY_QUEUE_KV.get(PARTY_SESSION_KEY, "json");

  if (!session?.expiresAt) {
    return null;
  }

  if (Date.parse(session.expiresAt) <= Date.now()) {
    await env.PARTY_QUEUE_KV.delete(PARTY_SESSION_KEY);
    return null;
  }

  return session;
}

async function requireLiveParty(env) {
  const session = await getPartySession(env);
  if (!session) {
    throw new ApiError("No party right now. Check back when the host starts one.", 403);
  }

  return session;
}

async function fetchSpotifyUser(accessToken) {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Failed to fetch Spotify user:", error);
    throw new Error("Failed to fetch Spotify user");
  }

  const profile = await response.json();
  if (!profile?.id) {
    throw new Error("Spotify user profile missing id");
  }

  return profile;
}

async function getBoundHostId(env) {
  return env.PARTY_QUEUE_KV.get(HOST_ID_KEY);
}

async function bindHost(env, spotifyUserId) {
  await env.PARTY_QUEUE_KV.put(HOST_ID_KEY, spotifyUserId);
}

async function createHostSession(env, hostUserId) {
  const token = generateState();
  await env.PARTY_QUEUE_KV.put(
    `${HOST_SESSION_PREFIX}${token}`,
    JSON.stringify({ hostUserId, createdAt: Date.now() }),
    { expirationTtl: HOST_SESSION_TTL_SECONDS },
  );
  return token;
}

async function getHostSession(request, env) {
  const token = getCookie(request, HOST_SESSION_COOKIE);
  if (!token) {
    return null;
  }

  const session = await env.PARTY_QUEUE_KV.get(`${HOST_SESSION_PREFIX}${token}`, "json");
  if (!session?.hostUserId) {
    return null;
  }

  const boundHostId = await getBoundHostId(env);
  if (!boundHostId || session.hostUserId !== boundHostId) {
    await env.PARTY_QUEUE_KV.delete(`${HOST_SESSION_PREFIX}${token}`);
    return null;
  }

  return { ...session, token };
}

async function requireHostSession(request, env) {
  const session = await getHostSession(request, env);
  if (!session) {
    throw new ApiError("Host session required", 403);
  }

  return session;
}

async function getCurrentVibe(env) {
  const storedVibe = await env.PARTY_QUEUE_KV.get(VIBE_KEY, "json");
  return storedVibe || DEFAULT_VIBE;
}

async function getAudioFeatures(trackId) {
  try {
    const response = await fetch(`https://api.reccobeats.com/v1/audio-features?ids=${trackId}`);

    if (!response.ok) {
      console.error(`ReccoBeats API error for ${trackId}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.content || data.content.length === 0) {
      console.log(`Track ${trackId} not found in ReccoBeats database`);
      return null;
    }

    const features = data.content[0];

    return {
      energy: features.energy,
      valence: features.valence,
      danceability: features.danceability,
      tempo: features.tempo,
      acousticness: features.acousticness,
      instrumentalness: features.instrumentalness,
      liveness: features.liveness,
      speechiness: features.speechiness,
      loudness: features.loudness,
      key: features.key,
      mode: features.mode,
    };
  } catch (err) {
    console.error("Error fetching audio features from ReccoBeats:", err.message);
    return null;
  }
}

async function getCurrentlyPlayingTrackId(env) {
  try {
    const response = await spotifyFetch(env, "/me/player/currently-playing");
    if (response.status === 204 || !response.ok) {
      return null;
    }
    const data = await response.json();
    return data?.item?.id || null;
  } catch (err) {
    console.error("Error getting currently playing track:", err);
    return null;
  }
}

async function checkVibeMatch(env, currentVibe, audioFeatures) {
  if (!currentVibe.settings.enabled) {
    return { matches: true, reason: null };
  }

  let thresholds;
  let referenceFeatures = null;

  if (currentVibe.settings.dynamic) {
    const nowPlayingId = await getCurrentlyPlayingTrackId(env);
    if (!nowPlayingId) {
      return { matches: true, reason: null, note: "Nothing currently playing" };
    }

    referenceFeatures = await getAudioFeatures(nowPlayingId);
    if (!referenceFeatures) {
      return { matches: true, reason: null, note: "Could not get reference track features" };
    }

    const tol = currentVibe.settings.tolerance;
    thresholds = {
      energy: {
        min: Math.max(0, referenceFeatures.energy - tol.energy),
        max: Math.min(1, referenceFeatures.energy + tol.energy),
      },
      valence: {
        min: Math.max(0, referenceFeatures.valence - tol.valence),
        max: Math.min(1, referenceFeatures.valence + tol.valence),
      },
      danceability: {
        min: Math.max(0, referenceFeatures.danceability - tol.danceability),
        max: Math.min(1, referenceFeatures.danceability + tol.danceability),
      },
      tempo: {
        min: Math.max(0, referenceFeatures.tempo - tol.tempo),
        max: referenceFeatures.tempo + tol.tempo,
      },
    };
  } else {
    thresholds = {
      energy: currentVibe.settings.energy,
      valence: currentVibe.settings.valence,
      tempo: currentVibe.settings.tempo,
      danceability: currentVibe.settings.danceability,
    };
  }

  const mismatches = [];

  if (thresholds.energy && (audioFeatures.energy < thresholds.energy.min || audioFeatures.energy > thresholds.energy.max)) {
    const level = audioFeatures.energy < thresholds.energy.min ? "too mellow" : "too intense";
    mismatches.push(`Energy is ${level}`);
  }

  if (thresholds.valence && (audioFeatures.valence < thresholds.valence.min || audioFeatures.valence > thresholds.valence.max)) {
    const level = audioFeatures.valence < thresholds.valence.min ? "too sad" : "too upbeat";
    mismatches.push(`Mood is ${level}`);
  }

  if (thresholds.tempo && (audioFeatures.tempo < thresholds.tempo.min || audioFeatures.tempo > thresholds.tempo.max)) {
    const level = audioFeatures.tempo < thresholds.tempo.min ? "too slow" : "too fast";
    mismatches.push(`Tempo is ${level}`);
  }

  if (
    thresholds.danceability &&
    (audioFeatures.danceability < thresholds.danceability.min || audioFeatures.danceability > thresholds.danceability.max)
  ) {
    const level = audioFeatures.danceability < thresholds.danceability.min ? "not danceable enough" : "too dancey";
    mismatches.push(`Track is ${level}`);
  }

  if (mismatches.length > 0) {
    return {
      matches: false,
      reason: mismatches[0],
      allReasons: mismatches,
      audioFeatures: {
        energy: audioFeatures.energy,
        valence: audioFeatures.valence,
        tempo: audioFeatures.tempo,
        danceability: audioFeatures.danceability,
      },
      referenceFeatures: referenceFeatures
        ? {
            energy: referenceFeatures.energy,
            valence: referenceFeatures.valence,
            tempo: referenceFeatures.tempo,
            danceability: referenceFeatures.danceability,
          }
        : null,
      thresholds,
    };
  }

  return { matches: true, reason: null };
}

async function getRateLimit(request, env) {
  const ip = getClientIp(request);
  const key = `${RATE_LIMIT_PREFIX}${await sha256(ip)}`;
  const now = Date.now();
  let record = await env.PARTY_QUEUE_KV.get(key, "json");
  const existingRecord = !!record;

  if (!record || isExpiredRateLimit(record, now)) {
    record = { count: 0, windowStart: now };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const resetTime = record.windowStart + RATE_LIMIT_WINDOW_MS;
    return {
      limited: true,
      key,
      record,
      existingRecord,
      resetTime,
      minutesRemaining: Math.ceil((resetTime - now) / 60000),
    };
  }

  return { limited: false, key, record, existingRecord };
}

async function incrementRateLimit(env, rateLimit) {
  const record = {
    ...rateLimit.record,
    count: rateLimit.record.count + 1,
  };
  const ttl = Math.max(60, Math.ceil((record.windowStart + RATE_LIMIT_WINDOW_MS - Date.now()) / 1000));

  await env.PARTY_QUEUE_KV.put(rateLimit.key, JSON.stringify(record), { expirationTtl: ttl });
  return record;
}

function isExpiredRateLimit(record, now) {
  return !record.windowStart || now - record.windowStart >= RATE_LIMIT_WINDOW_MS;
}

function getClientIp(request) {
  return request.headers.get("CF-Connecting-IP")
    || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim()
    || "unknown";
}

function formatTrack(track, extra = {}) {
  return {
    id: track.id,
    name: track.name,
    artists: (track.artists || []).map((artist) => ({ id: artist.id, name: artist.name })),
    album: {
      id: track.album?.id,
      name: track.album?.name,
      images: track.album?.images || [],
    },
    duration_ms: track.duration_ms,
    uri: track.uri,
    ...extra,
  };
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }
}

function requireSpotifyCredentials(env) {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    throw new Error("Missing Spotify credentials");
  }
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [cookieName, ...valueParts] = cookie.trim().split("=");
    if (cookieName === name) {
      return valueParts.join("=");
    }
  }

  return null;
}

function hostSessionCookie(request, token) {
  return [
    `${HOST_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${HOST_SESSION_TTL_SECONDS}`,
    secureCookieAttribute(request),
  ].filter(Boolean).join("; ");
}

function clearHostSessionCookie(request) {
  return [
    `${HOST_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    secureCookieAttribute(request),
  ].filter(Boolean).join("; ");
}

function secureCookieAttribute(request) {
  return new URL(request.url).protocol === "https:" ? "Secure" : "";
}

function getSpotifyRedirectUri(request, env) {
  return env.SPOTIFY_REDIRECT_URI || `${new URL(request.url).origin}/api/auth/callback`;
}

function getAppUrl(request, env) {
  return env.FRONTEND_URL || new URL(request.url).origin;
}

function safeReturnPath(returnTo) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  return returnTo;
}

function withAuthResult(appUrl, returnTo, params) {
  const redirectUrl = new URL(safeReturnPath(returnTo), appUrl);

  for (const [key, value] of Object.entries(params)) {
    redirectUrl.searchParams.set(key, value);
  }

  return redirectUrl.toString();
}

function redirect(location, headers = {}) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      ...headers,
    },
  });
}

function basicAuth(env) {
  return btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
}

function generateCodeVerifier() {
  return base64Url(randomBytes(32));
}

async function generateCodeChallenge(verifier) {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return base64Url(new Uint8Array(digest));
}

function generateState() {
  return Array.from(randomBytes(16), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function sha256(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function json(body, init = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}
