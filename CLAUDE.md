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
- **In-app identity + skin updated**: client UI, document metadata, closed-party
  state, and `/host` now use **Pass the Aux**. The neon-rave theme was replaced
  with the chosen suprematist direction from `design/moma-mockups/1-suprematist.html`
  after Kazimir Malevich's "Suprematist Painting" (1916-17): warm gallery
  cream, Archivo typography, flat queue ticks, provenance footer, and ambient
  draggable/colliding shapes that pause when hidden and respect reduced motion.
- README now includes friend-host management and deploy-your-own instructions,
  including the Cloudflare Deploy button.

DONE (cont.):
- GitHub repo renamed to **pass-the-aux** (tejasdc/pass-the-aux); description
  refreshed with the no-hijack + no-Spotify/AirPlay/WiFi selling points.
- Google Safe Browsing flagged party.tejas.nyc "Deceptive pages" (false
  positive — new subdomain + OAuth button trips the phishing classifier).
  tejas.nyc verified in Search Console (DNS TXT), review-removal request
  submitted 2026-08-02. Warning clears automatically on Google reclassify
  (days to ~2 weeks); nothing to fix in code.
- **Render decommissioned 2026-08-02**: both services SUSPENDED (not deleted —
  reversible via Render dashboard → Resume). `electric-love-api` (web,
  srv-d68csfur433s73cibpmg) and `electric-love` (static,
  srv-d68csver433s73cic0mg) now return 503. Cloudflare is sole production.
  Tejas confirmed a real host flow + queued song worked first.

PENDING (in priority order):
1. **Deploy the suprematist skin to production** — the new theme is built and
   committed but party.tejas.nyc may still serve the old neon build until the
   next `wrangler deploy`. (An automated check is deploying + screenshotting.)
2. **Optional cleanup**: fully delete the suspended Render services and remove
   `server/` + `render.yaml` from the repo once you're sure Cloudflare is
   stable. Suspended costs nothing, so no rush.
3. **/host polish**: show the End Party state on load instead of the stale
   "Continue with Spotify" button when already the bound host (cosmetic).

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
