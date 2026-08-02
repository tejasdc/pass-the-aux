# Electric Love

A Spotify party queue for house parties. Guests scan a QR code, search the catalog, and add songs to the queue — without ever touching the host's Spotify or being able to skip, pause, or wreck the playlist.

**Live → [electric-love.onrender.com](https://electric-love.onrender.com/)**

<p align="center">
  <img src="screenshots/mobile.png" width="320" alt="Electric Love on a phone — now playing and up next" />
</p>

## Why

Sharing Spotify access at a party always ends the same way: someone hits play instead of queue, someone skips the song mid-chorus, someone puts on their own playlist. Electric Love is the controlled gateway — guests can search and queue, nothing else.

## How it works

- **Host-only auth** — the party host authenticates once with Spotify Premium; the server holds and refreshes that one token. Guests never log in — zero friction, and it sidesteps Spotify's dev-mode user limit.
- **Now Playing + Up Next** — everyone sees the current track and the upcoming queue.
- **Search & queue** — full Spotify catalog search, one tap to add.
- **Rate limiting** — 10 songs per hour per guest, so nobody floods the queue.
- **Vibe matching** — queued songs are checked against the party's energy (via ReccoBeats audio features, after Spotify deprecated their Audio Features API); off-vibe picks get a friendly rejection.

Print the QR (`electric-love-qr.png`), tape it to the wall, done.

## Stack

- `client/` — Vite + React, static site
- `server/` — Node.js API that proxies Spotify with the host's token
- `render.yaml` — Render blueprint for both services (free tier)

## Run it locally

```bash
cd server && npm install && npm start
cd client && npm install && npm run dev
```

Set `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_REDIRECT_URI` for the server (Spotify developer dashboard), then authenticate as host at `/api/auth`.

## Provenance

Built with an AI agent in a [Cortex](https://cortex.ideaflow.app) cloud workspace, February 2026, for an actual house party.
