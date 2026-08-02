# Electric Love

Ever shared your Spotify at a house party and watched someone play a song instead of queuing it? Playlist gone, vibe dead.

Electric Love is the fix: guests scan a QR code, search the catalog, and add songs to the queue — without ever touching the host's Spotify. Nobody can skip, pause, or take over playback, and every pick has to pass the vibe check.

**Live → [electric-love.onrender.com](https://electric-love.onrender.com/)**

<p align="center">
  <img src="screenshots/mobile.png" width="320" alt="Electric Love on a phone — now playing and up next" />
</p>

## Why

Spotify's own sharing options — Jam, shared speakers, handing your phone around — all give guests full playback control. One mistap hits play instead of queue, skips the song mid-chorus, or swaps in someone else's playlist. Electric Love is the controlled gateway — guests can search and queue, nothing else.

## How it works

- **Host-only auth** — the party host authenticates once with Spotify Premium; the server holds and refreshes that one token. Guests never log in — zero friction, and it sidesteps Spotify's dev-mode user limit.
- **Now Playing + Up Next** — everyone sees the current track and the upcoming queue.
- **Search & queue** — full Spotify catalog search, one tap to add.
- **Rate limiting** — 10 songs per hour per guest, so nobody floods the queue.
- **Vibe matching** — queued songs are checked against the party's energy (via ReccoBeats audio features, after Spotify deprecated their Audio Features API); off-vibe picks get a friendly rejection.

Print the QR (`electric-love-qr.png`), tape it to the wall, done.

## Stack

- `client/` — Vite + React, built as static assets
- `worker/` — Cloudflare Worker API that proxies Spotify with the host's token
- Cloudflare Workers Assets — serves the built client from the same Worker
- Cloudflare KV — persists host Spotify tokens, OAuth state, rate-limit windows, and party vibe state
- `server/` + `render.yaml` — legacy Render deployment kept live until cutover

## Run it locally

```bash
npm install
npm run build
npx wrangler dev
```

Set local Worker secrets in `.dev.vars` when testing real Spotify auth:

```bash
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://localhost:8787/api/auth/callback
```

Then authenticate as host at `/api/auth/login`. Guests continue to use the same origin app and relative `/api/*` routes.

## Deploy

Cloudflare Workers is the primary deployment target. From the repo root:

```bash
npm install
npx wrangler secret put SPOTIFY_CLIENT_ID
npx wrangler secret put SPOTIFY_CLIENT_SECRET
npx wrangler deploy
```

`wrangler deploy` runs the client build, uploads `client/dist` as Workers Assets, deploys the Worker API, and auto-provisions the `PARTY_QUEUE_KV` namespace declared in `wrangler.jsonc` if it does not already exist.

Configure the Spotify app redirect URI to the deployed Worker origin plus `/api/auth/callback`, or set the `SPOTIFY_REDIRECT_URI` Worker secret/variable to the exact callback URL. The Render blueprint remains in `render.yaml` as the legacy deployment until traffic is cut over.

## Provenance

Built with an AI agent in a [Cortex](https://cortex.ideaflow.app) cloud workspace, February 2026, for an actual house party.
