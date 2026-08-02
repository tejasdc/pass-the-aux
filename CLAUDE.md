# Pass the Aux (repo: electric-love-party-queue)

Spotify party queue for house parties. Guests scan a QR, search, and queue songs
to the host's Spotify — they can't skip, pause, or take over playback, and every
pick passes a vibe check. Guests need no Spotify account, no AirPlay access, no
WiFi — just the QR.

**Live: https://party.tejas.nyc/** · host page: https://party.tejas.nyc/host
**Card on portfolio:** https://tejas.nyc/projects (external entry, links out)

## Status (last updated 2026-08-02)

DONE:
- Ported from Render (Express, `server/`) to a single **Cloudflare Worker**
  (`worker/src/index.js`) serving `/api/*` + the Vite client via Workers Assets.
  All state in KV — host tokens survive deploys/crashes (the reason for the port).
- **Party sessions**: app is inert unless a party is live (8h TTL, explicit end).
  Guest routes are refused server-side when no party is live.
- **Host auth = Spotify identity, no passphrase.** `/host` → tap → Spotify OAuth.
  Spotify dev-mode allows ONLY allowlisted accounts to complete OAuth (currently
  just the owner). First successful host OAuth binds that Spotify user id in KV;
  other identities are refused. Host session cookie gates end-party/logout.
- Custom domain `party.tejas.nyc` (workers.dev URL disabled). Purple-scrollbar
  bug fixed (was styled scrollbar + forced overflow). Spotify app renamed
  "Pass the Aux"; three redirect URIs registered (Render legacy, workers.dev
  legacy, party.tejas.nyc — the live one).

PENDING (in priority order):
1. **Rename in-app**: client UI still says "Electric Love" everywhere. Product
   name is now **Pass the Aux**. Rename alongside the redesign (below), not as
   a separate pass.
2. **Redesign**: Tejas wants the neon-rave theme replaced with a direction from
   `design/moma-mockups/` — four INTERACTIVE mockups derived from MoMA
   geometric-abstraction paintings (photos in `design/inspiration/`):
   1-suprematist (Malevich; ambient collision physics, shapes are draggable
   fidget toys, taps ripple), 2-field (Villalba teal; touch etches fading
   hairline incisions, wedge = live progress), 3-facet (stained-glass; hung-
   canvas pointer tilt), 4-pinwheel (concrete art; record-scratch spin with
   inertia). Design intent: guests waiting to queue play with the page.
   **Tejas has NOT picked a direction yet — ask before building the real skin.**
3. **README additions**: (a) User Management — how a friend gets host access
   (see below); (b) "Deploy your own" — fork, create own Spotify dev app, set
   secrets, `wrangler deploy`, plus a Cloudflare one-click deploy button.
4. **GitHub repo rename** to match Pass the Aux (keep Worker name unchanged —
   see invariants), plus description/card copy refresh with the no-Spotify/no-
   AirPlay/no-WiFi selling point.
5. **Decommission Render** (both `electric-love-*` services) after Tejas has
   done one successful host flow + queued a song on party.tejas.nyc.
   Until then Render stays as fallback.

## Architecture

- One Worker: `worker/src/index.js` (routes `/api/*`, falls through to ASSETS).
- Client: `client/` Vite+React, built to `client/dist`, served same-origin.
- Config: `wrangler.jsonc` — custom domain route, KV binding `PARTY_QUEUE_KV`,
  build command runs the client build. `wrangler deploy` is the whole deploy.
- KV keys: `host:tokens`, `host:spotify-user-id` (bound host), `party:session`,
  `party:vibe`, `oauth:state:*`, `rate-limit:*`, `host:auth-grant:*` (legacy).
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

Every working session that changes status, architecture, or pending items MUST
update this file in the same commit series. The next agent starts from here.
