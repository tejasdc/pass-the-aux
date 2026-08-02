# Cloudflare port summary

## What changed

- Added a single Cloudflare Worker in `worker/src/index.js` that serves `/api/*` and falls back to Workers Assets for the Vite client.
- Ported the existing Express API contract, including auth, now-playing, queue, search, vibe, rate-limit, and debug endpoints.
- Persisted host Spotify tokens, OAuth PKCE state, rate-limit windows, and current vibe state in `PARTY_QUEUE_KV`.
- Added `wrangler.jsonc` with Worker entrypoint, Workers Assets, auto-provisioned KV binding, build command, compatibility settings, and observability.
- Updated root deployment tooling with Wrangler in `package.json`/`package-lock.json`.
- Updated `README.md` to make Cloudflare Workers primary and Render legacy.

## Deploy

From the repo root:

```bash
npm install
npx wrangler secret put SPOTIFY_CLIENT_ID
npx wrangler secret put SPOTIFY_CLIENT_SECRET
npx wrangler deploy
```

`wrangler deploy` builds `client/dist`, uploads it as Workers Assets, deploys the Worker API, and auto-provisions the `PARTY_QUEUE_KV` namespace declared in `wrangler.jsonc`. Configure Spotify with the deployed Worker origin plus `/api/auth/callback`; `SPOTIFY_REDIRECT_URI` remains configurable if an exact override is needed.

## Local verification

- `npm run build` succeeds.
- `WRANGLER_WRITE_LOGS=false WRANGLER_LOG_PATH=tmp/wrangler-logs npx wrangler deploy --dry-run` succeeds and confirms the Assets and KV bindings.
- `wrangler dev` and Miniflare could not serve over loopback because this sandbox blocks local `listen` calls. Wrangler did get far enough to build the client and show local `PARTY_QUEUE_KV` and `ASSETS` bindings before the bind failure.
- A no-listen Worker harness imported `worker/src/index.js` directly and verified:
  - `GET /api/auth/status` -> `200` unauthenticated shape.
  - `GET /api/rate-limit` -> `200` with first-window `resetAt: null`.
  - `GET /api/search?q=test` -> `401` without host tokens.
  - `POST /api/vibe` persists to KV and subsequent `GET /api/vibe` returns the updated preset.
  - `GET /api/auth/login` with mock Spotify credentials redirects to Spotify and writes OAuth state with a 600-second KV TTL.

Unproven locally: real Spotify OAuth/token refresh, real Spotify queue/search calls, and actual Cloudflare production deploy. Those require Cloudflare auth, Worker secrets, a deployed origin, and a Spotify app redirect URI configured to that origin.
