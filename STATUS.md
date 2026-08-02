# Pass the Aux — Status & Task Log

Running changelog of what's shipped, what's next, and what's parked. Durable
project instructions live in [CLAUDE.md](CLAUDE.md); this file is history +
todo. Newest entries first.

## Status log

_Last updated 2026-08-02._

### DONE

- **Agency theme ports implemented locally 2026-08-02 (not deployed):**
  Afterglow, Cathode Vectorscope, Vellum Hymnal, and All-Access Laminate are
  now first-class entries in the persisted theme registry, bringing the local
  selectable roster to 11 themes. Their motion uses the existing live
  now-playing BPM/energy variables and pauses with reduced-motion, hidden tabs,
  or missing audio features. Required verification passed:
  `node worker/test/party-session.test.mjs` and `npm --prefix client run build`.
- **Theme system implemented locally 2026-08-02 (not deployed):** real
  now-playing ReccoBeats BPM/energy is exposed in `/api/now-playing`, cached in
  KV per track, and shown as a live badge when available. Client theme selection
  now persists per device in localStorage with Suprematist as the default
  fallback and random assignment for new visitors. Theme roster currently wired:
  Suprematist, Facet, Field, Winamp, Milkdrop, Generative Flow, and Risograph.
  Beat-reactive theme motion is driven only by current-track BPM/energy plus
  Spotify playhead progress, pauses when hidden, and respects reduced motion.
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
- **Suprematist skin DEPLOYED to production 2026-08-02** (version
  339d3083). party.tejas.nyc now serves the Pass the Aux gallery-cream theme
  with ambient Malevich physics; verified live (title "Pass the Aux", no
  legacy "Electric Love" strings, bg rgb(237,232,219), shapes present) at 430px
  and 1390px. Client copy leads with the no-hijack value prop across meta/OG tags.
- **Mobile shape sizing fixed + DEPLOYED 2026-08-02** (version 885b8da8):
  `AnimatedBackground.jsx` now scales the Malevich shapes to 0.58x at ≤420px,
  interpolating to full size by 768px (physics/collision/mass scale too). Fixes
  the crowding/bumping Tejas flagged. The live suprematist skin is KEPT (the
  facet full-replace port was cancelled) — decision reversed to "keep suprematist,
  fix mobile sizing, add facet as a SECOND theme via a theme system."

### NEXT

- Review the local theme ports on device, then deploy when approved. Theme
  summary and remaining polish notes live in `tmp/reviews/theme-system.md`.

### Superseded — visualizer gallery redesign (design exploration, NOT in prod)

- Direction chosen 2026-08-02: the now-playing hero becomes a **switchable
  visualizer gallery** — multiple beat-synced visualizations guests tap to cycle
  through, Winamp-preset style. Guests waiting to queue play with it. This
  supersedes the single floating-shapes skin currently live.
- Prototype: `design/moma-mockups/switcher.html` — tap-to-cycle across 5 presets
  (Facet Floor / Scope / Plasma / Bars / Shapes), all driven by one beat clock,
  in the facet aesthetic (crisp slanted tiles, bold black seams, Bricolage type —
  the `3-facet.html` look Tejas liked). Other prototypes (facet-reactive,
  facet-winamp, facet-viz, dancefloor) are candidate presets / earlier steps.
- **Data path for reactivity (verified 2026-08-02)**: NO mic (Tejas's call), and
  Spotify audio-analysis/audio-features are dead (403, deprecated Nov 2024). We
  drive everything from a **synthesized beat clock**: BPM/energy/valence per track
  from **ReccoBeats** (already fetched for the vibe check, worker line ~952,
  cached one-fetch-per-track — nowhere near its rate limit), phase-locked to
  Spotify `/me/player/currently-playing` `progress_ms` (not deprecated). Visuals
  are choreographed to the beat, NOT true FFT/waveform reactivity — that's the
  hard ceiling; be honest about it.
- NEXT once Tejas signs off on the gallery: pick the preset set, then port into
  `client/src` via Codex (real ReccoBeats tempo + progress_ms poll, tab-hidden
  pause, reduced-motion fallback).

### PENDING (optional, no rush)

1. **/host polish**: show End Party state on load instead of the stale
   "Continue with Spotify" button when already the bound host (cosmetic).
2. **Full Render deletion**: suspended services cost nothing; delete them and
   remove `server/` + `render.yaml` from the repo whenever you're confident
   Cloudflare is stable.

## Keeping this log current

Every working session that changes shipped scope, next-up work, or parked ideas
should append to (or edit) the relevant section above in the same commit series.
Architecture, host management, ops, and invariants belong in
[CLAUDE.md](CLAUDE.md) — not here.
