# Pass the Aux (repo: electric-love-party-queue)

Spotify party queue for house parties. Guests scan a QR, search, and queue songs
to the host's Spotify — they can't skip, pause, or take over playback, and every
pick passes a vibe check. Guests need no Spotify account, no AirPlay access, no
WiFi — just the QR.

**Current status & task log → [STATUS.md](STATUS.md)**

**Live: https://aux.tejas.nyc/** (also https://party.tejas.nyc/) · host page: https://aux.tejas.nyc/host
**Card on portfolio:** https://tejas.nyc/projects (external entry, links out)

## Architecture

- One Worker: `worker/src/index.js` (routes `/api/*`, falls through to ASSETS).
- Client: `client/` Vite+React, built to `client/dist`, served same-origin.
- Config: `wrangler.jsonc` — custom domain route, KV binding `PARTY_QUEUE_KV`,
  build command runs the client build. `wrangler deploy` is the whole deploy.
- KV keys: `host:tokens`, `host:spotify-user-id` (bound host), `party:session`,
  `party:vibe`, `oauth:state:*`, `rate-limit:*`, `host:auth-grant:*` (legacy),
  `audio-features:v2:*` (ReccoBeats tempo/energy per track: hits cached
  forever, misses expire after 6h, errors after 5min; `audio-features:<id>`
  v1 entries are abandoned, not read).
- Visualizers are driven by each track's tempo/energy plus the playhead, not by
  hearing audio. When ReccoBeats has no data, `/api/now-playing` sends a steady
  120 BPM beat flagged `estimated: true`, so visuals never freeze; the client
  shows "BPM & ENERGY UNKNOWN" instead of a number for estimated beats. The vibe check lets songs through when
  it has no data for them (fail-open).
- Each page load gets a random theme; the header theme button (palette icon + theme name, deliberately not shuffle arrows so guests do not read it as shuffling songs) picks another
  random theme for that visit only (nothing is stored).
- Field, Flow, and Afterglow keep their visualizer code isolated in their own
  JSX/CSS pairs. Field's pressure print uses eleven fixed bowed incisions,
  with transform-only beat strikes and an eight-beat sway; its animations
  resynchronize to each playhead sample and pause with playback. Afterglow's
  chromatic aperture animates only transforms/opacity; Flow draws 44 analytic currents at at most 30fps with
  device pixel ratio capped at 2. Preserve their static reduced-motion image
  and the shared hidden-tab/reduced-motion gate when changing them.
- Suprematist's isolated visualizer splits a black square on each beat, with
  energy-scaled separation and an eight-beat tilt. It resynchronizes to each
  playhead sample and pauses with playback and the shared motion gate. Keep
  its reduced-motion still and container-relative sizing; page-level draggable
  shapes are independently owned by `AnimatedBackground`.
- Secrets (via `npx wrangler secret put`): `SPOTIFY_CLIENT_ID`,
  `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
  (= `https://party.tejas.nyc/api/auth/callback`).
- Spotify app: "Pass the Aux", client id `a60c83345edd42078582f8fedf1eee5e`,
  dev mode, owner account `tejastej.dc@gmail.com` (t3j). Dashboard:
  https://developer.spotify.com/dashboard/a60c83345edd42078582f8fedf1eee5e
- Cloudflare account: tejastej.dc@gmail.com (wrangler already authed locally).
- `server/` + `render.yaml`: legacy Render deployment. Do not extend; delete
  when Render is decommissioned.

## Host & user management

- **Host a party**: open https://party.tejas.nyc/host → Start the party →
  Spotify login. No passphrase. 8h TTL or end it from the same page.
- **Let a friend host**: Spotify dashboard → app → User Management → add their
  name+email (max 5, dev-mode rule), THEN reset the host binding:
  `npx wrangler kv key delete --binding PARTY_QUEUE_KV "host:spotify-user-id" --remote`
  Next successful host OAuth (their account) becomes the new bound host.
- **Why strangers can't host**: Spotify dev-mode refuses OAuth for accounts not
  on the User Management list — enforced by Spotify's servers, not our code.

## Operations

```bash
npm install && npx wrangler deploy      # full deploy (builds client too)
npm run test:worker                     # direct-import Worker harness tests
npx wrangler tail                       # live logs
npx wrangler secret list                # check secrets
```

- Republish the tejas.nyc card after copy changes: run the publisher from this
  directory (descriptor `.publish.json` is here) — see the `ship-to-site` skill.
- Verify after deploy: `curl https://party.tejas.nyc/api/party/status` → 200
  `{live:false,...}`; guest routes 403 when no party.

## Invariants — do not break

- **Do not rename the Worker** (`name` in wrangler.jsonc): renaming creates a
  brand-new Worker and orphans the KV binding, custom domain, and secrets.
  The Worker's internal name is invisible to users; product renames are
  client/README/GitHub-level only.
- **Guest routes must stay gated server-side** on a live party. Hiding UI is
  not gating.
- **Never put platform instructions or secrets in the client bundle.**
- The Spotify redirect URI, KV binding, and custom domain form a matched set —
  if any moves, update all three (wrangler.jsonc, `SPOTIFY_REDIRECT_URI`
  secret, Spotify dashboard redirect list).
- Agent work logs live in `tmp/reviews/` (gitignored). Design artifacts in
  `design/` (committed).

## Keep this file current

This file holds only durable project instructions — architecture, host
management, operations, invariants. Session-level status, changelog entries,
and next-up work belong in [STATUS.md](STATUS.md), which the next agent should
also read.
