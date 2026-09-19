# Pass the Aux — Status & Task Log

Running changelog of what's shipped, what's next, and what's parked. Durable
project instructions live in [CLAUDE.md](CLAUDE.md); this file is history +
todo. Newest entries first.

## Status log

_Last updated 2026-09-19._

### DONE

- **Casual party flyer replacement, committed locally 2026-09-19; not pushed or deployed.**
  All four signs now use handwritten invitations, theme colors, large QR codes
  and minimal copy. Existing gallery filenames are retained. All four final
  2550×3300 PNGs decode to `https://aux.tejas.nyc/`; PDFs are one US Letter
  page each. Suprematist now shares the renderer. Verification and preview
  paths: `tmp/reviews/casual-flyers.md` in the `casual-flyers` worktree.

- **Party flyer gallery DEPLOYED 2026-09-19 at https://aux.tejas.nyc/flyer/ (version `2f711603`).** Original Suprematist flyer redesigned (bolder headline, QR + steps side by side); GPT-6 Astra added
  Field, Flow and Afterglow each have their own HTML source, one-page Letter
  PDF and 2550×3300 PNG. The static flyer gallery now presents these alongside
  the original Suprematist design, with print/save links and small previews.
  Final PNGs decode to `https://aux.tejas.nyc/`; Chromium checks at 360, 430
  and 1440px and the client build pass. Sketches and repeatable rendering:
  `design/party-flyers/`. Local report: `tmp/reviews/astra-flyers.md` in the
  `astra-flyers` worktree. All four live QR codes verified from the deployed PNGs.

- **Suprematist split-square redesign by GPT-6 Astra, DEPLOYED 2026-09-18 (version `6ffe8a40`).** Four black
  planes open on the beat around a vermilion stroke, with a cobalt counterstroke
  and salmon satellite. Selected from three sketches for a clear silhouette
  and visible beat gesture on phones. Only the isolated Suprematist visualizer
  changes; surrounding draggable shapes and shared layout remain intact.
  Studies: `design/suprematist-studies.html`. Verification and screenshots:
  worktree `.wt/astra-suprematist/tmp/reviews/astra-suprematist.md`.

- **Field pressure-print redesign by GPT-6 Astra, DEPLOYED 2026-09-18 (version `1e307af3`).** Replaces the rejected opening
  teal planes with eleven bowed ink incisions and one pale accent. Tempo drives
  the strike, energy sets its spread, and the playhead synchronizes the strike
  and eight-beat sway. Keeps the existing palette, typography, panel dimensions,
  album art, surrounding UI and other themes. Candidate sketches:
  `design/field-pressure-study.html`. Verification and screenshots:
  worktree `.wt/astra-field/tmp/reviews/astra-field.md`.

- **Field / Flow / Afterglow redesign by GPT-6 Astra, DEPLOYED 2026-09-18 (version `27e821b6`).** Field
  now opens a monumental ivory cut between teal planes; Flow draws dense ink
  currents with a vermilion ribbon; Afterglow has a defined chromatic aperture
  and lens flare. Beat attack scales with energy, with existing estimated beats
  retained. Removed Field's background cut behind the header and improved
  secondary-text contrast in these themes. Production-build Chromium checks
  cover known/estimated tracks, search and queueing, 360/430px phones, desktop,
  motion pause/resume, and a CPU-throttled smoke check. Worker harness and
  client build pass. Evidence: worktree `.wt/astra-themes/tmp/reviews/astra-themes.md`.

- **Pre-party fixes 2026-09-18.** Visualizers froze ("standby, no signal") on
  every theme because tempo lookups that came back empty were cached as
  "no data" forever (e.g. "Time To Smoke" was stuck though ReccoBeats has it),
  and tracks ReccoBeats lacks had no beat at all. Misses now expire and an
  estimated 120 BPM beat keeps visuals moving. Removed the repeated "the queue
  is open" tagline and the album line when it repeats the song title. Footer
  now credits "Made by tejas.nyc". Themes are random on every visit; the big
  "THEME n/11" box became a small shuffle button matching search. Field
  theme's header icons were invisible (teal on teal), now fixed. Verified on
  the built client at iPhone size: 11/11 themes animate, no console errors.
  Tejas decided 2026-09-18: songs missing from ReccoBeats keep passing the vibe check.

- **Printable party sign 2026-09-18** for the 2026-09-19 party:
  `design/party-sign/` (`pass-the-aux-sign.pdf` Letter, `.png` 2448x3168).
  QR decodes to `https://aux.tejas.nyc/` (verified with jsQR on the PNG). Edit
  `sign.html` and re-run `render.js` to change it. Pre-party check: live site
  200, guest routes gated 403 with no party, Spotify login redirect accepted
  for aux.tejas.nyc, worker tests pass. Spotify's Feb 2026 dev-mode changes
  (search max 10, removed catalog endpoints) don't touch the guest flow
  (search limit is 10; queue, currently-playing, /me still exist). A real
  search+queue run still needs the host's Spotify login, so it was not
  exercised by the agent.

- **Unique per-theme visualizers DEPLOYED + visually verified 2026-08-02
  (version `81812ce8`).** Every theme's visualizer was the same shared
  rings+bars primitive recolored; now each theme renders its OWN distinct
  reactive visualizer, built by one design agent per theme (11 in parallel,
  each owning only its `visualizers/<id>.jsx`+`.css`): Cathode = XY Lissajous
  oscilloscope (canvas, phosphor persistence), Milkdrop = plasma + superscope
  (canvas), Winamp = fire spectrum LED bars + falling peak caps (canvas), Flow
  = generative ink-stroke flow field (canvas), Afterglow = cinematic chromatic
  bloom + lens streak (CSS), Holo = holographic prism laminate + magnetic-strip
  progress (CSS), Vellum = illuminated gold rosette + rubric flourishes (SVG),
  Risograph = spinning halftone vinyl disc (CSS), Suprematist = Malevich
  planes, Facet = shattered stained-glass mosaic (SVG), Field = calm two-tone
  color-field + moving seam/wedge. All phase-locked to real BPM/energy via
  `useBeatStyle`, pause on no-beat/hidden/reduced-motion, no fake FFT. Verified
  with Playwright against the deployed bundle: all 11 screenshots reviewed and
  confirmed VISUALLY DISTINCT, switcher clickable 11/11, footers legible, zero
  console errors, build+worker tests pass. Suprematist shape drag/ripple
  interactivity RESTORED and verified (a shape's transform moved under a
  simulated drag while the switcher stayed clickable).
- **Visualizer architecture + Suprematist interactivity implemented locally
  2026-08-02 (deployed).** Every theme registry entry now owns a
  `Visualizer` component parallel to `Background`, and `NowPlaying` renders the
  active theme's visualizer inside the dedicated `aria-hidden` stage with the
  live track passed through. One isolated visualizer JSX+CSS pair now exists
  per theme under `client/src/themes/visualizers/`; the old shared
  `.visualizer-grid/core/bars/trace` markup and theme recolor CSS were removed
  from `index.css`. Suprematist shapes are draggable/ripple-interactive again
  by making the field an interactive bottom layer while header/content controls
  stay above it. Verification passed: `node worker/test/party-session.test.mjs`
  and `npm --prefix client run build`. Architecture notes:
  `tmp/reviews/viz-arch.md`.
- **Theme usability + layout fix DEPLOYED + visually verified 2026-08-02
  (version `420b270b`).** Fixed three reported failures across all 11 themes:
  (1) the theme switcher was being covered by the closed search overlay's
  close button and by visualizer background SVGs (elementFromPoint returned
  `button.search-close` / `path` at the switcher center) — now a single
  pointer-events/stacking contract makes header chrome topmost-hittable and
  forces all closed/decorative layers non-hittable; switcher clickable on
  11/11 and widened to read "THEME / ‹name› N/11". (2) The provenance footer
  was near-black (`rgba(20,18,14,.48)`) and invisible on dark themes
  (Milkdrop, Winamp) — now every theme sets a legible `--provenance-color`.
  (3) Visualizations were full-screen backgrounds hidden behind the cards and
  album art — NowPlaying now has a dedicated `.visualizer-stage` plus a
  separate album-art frame (side-by-side at wider viewports), so each theme's
  visualization and album art both have space. Verified with Playwright
  against the deployed bundle: 11/11 switcher-clickable, 11/11 footer legible
  (screenshots reviewed), dedicated viz stage + album frame on every theme,
  zero console errors. KNOWN TRADEOFF: Suprematist floating shapes are no
  longer drag/ripple-interactive (they became decorative under the new
  pointer-events invariant); they still animate. Restoring draggability with
  header-above-shapes is a possible follow-up.
- **Theme system DEPLOYED + verified live on aux.tejas.nyc 2026-08-02
  (version `6f937120`).** All 11 themes are live and browseable via the
  switcher: Suprematist (default), Facet, Field, Winamp, Milkdrop, Generative
  Flow, Risograph, Afterglow, Cathode Vectorscope, Vellum Hymnal, All-Access
  Laminate. Every visitor lands on a random theme; the switcher cycles all of
  them; each surfaces its real design inspiration in the label + provenance
  footer. Verified with Playwright against the exact deployed bundle: 11/11
  themes apply their `data-theme`, zero console/page errors, BPM badge renders
  on all 11 when a track with tempo data is playing (badge correctly hidden
  when nothing is playing). Live re-check on production aux.tejas.nyc: themes
  apply, zero errors. README on GitHub reworked into a plain "Run your own
  party" walkthrough; live link framed as Tejas's own instance.
- **Agency theme ports implemented 2026-08-02 (deployed):**
  Afterglow, Cathode Vectorscope, Vellum Hymnal, and All-Access Laminate are
  now first-class entries in the persisted theme registry, bringing the local
  selectable roster to 11 themes. Their motion uses the existing live
  now-playing BPM/energy variables and pauses with reduced-motion, hidden tabs,
  or missing audio features. Required verification passed:
  `node worker/test/party-session.test.mjs` and `npm --prefix client run build`.
- **Theme system implemented 2026-08-02 (deployed):** real
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
