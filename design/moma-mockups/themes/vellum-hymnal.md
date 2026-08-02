# Vellum Hymnal

**A party queue reimagined as a hand-scribed medieval codex.**

The most incongruous thing I could put on a Spotify-connected party phone: an illuminated hymnal from a 12th-century scriptorium. The queue is a *sequentia*. Each song is a manuscript entry with an illuminated drop-cap. The guest who queued it is credited as *scriptor* (scribe). Marginalia beasts inhabit the margins. Gold leaf shimmers with every downbeat.

Nothing in the existing four themes goes near this territory — Winamp is 90s skeuomorphism, Milkdrop is neon plasma, flow-field is algorithmic organic, riso is spot-color print. This is *pre-industrial*.

---

## Aesthetic direction

- **Illuminated manuscript / codex** (Insular + Romanesque + early Gothic hybrid).
- **Materiality:** aged vellum with hand-inked margin rules, age spots, faint water rings — built from layered SVG noise and radial gradients, no bitmap images.
- **Hierarchy of scripts** (per Winchester Bible tradition): blackletter wordmark → Cinzel Decorative for illuminated capitals → EB Garamond for body → IM Fell small-caps for labels.
- **Rubrication** (red display text) marks status and section boundaries.
- **Gold-leaf frames** on album art with a real specular shimmer (multi-layer gradient sweep).
- **Latinate flourishes** in labels — *"Cantvs praesens"*, *"Sequentia"*, *"Tempus"*, *"Vigor"*, *"Explicit"* — but never so heavy the queue becomes unreadable. Guest names stay in modern letters.

---

## References I drew on

- **Book of Kells** (c. 800 CE) — Celtic-interlace corner ornaments, illuminated capitals as figurative objects, dense marginalia.
- **Lindisfarne Gospels** (c. 715 CE) — the disciplined grid overlaid on wildness; gold + lapis + vermillion palette.
- **Très Riches Heures du Duc de Berry** (c. 1412–16) — jewel-toned pigments, gold-leaf specularity, the sense that every page is a small painting.
- **Trinity Apocalypse** (c. 1250) & **Rutland Psalter** — *drolleries*: the little hybrid beasts in the margins doing absurd things. Every rendered creature here is a tiny drollery.
- **Winchester Bible** (c. 1160–1175) — hierarchy of scripts, rubrication conventions, incipit/explicit framing.
- **Edward Johnston, *Writing & Illuminating, & Lettering*** (1906) — modern grammar for the letterforms; informed the choice to pair UnifrakturMaguntia (Textura) with Cinzel Decorative (Roman capital) rather than mix scripts within a word.

---

## Type system

| Role | Face | Why |
|---|---|---|
| Wordmark ("Pass the Aux") | **UnifrakturMaguntia** | Textura blackletter — the "manuscript" signal, immediate and unmistakable. Illuminated first letters (`P`, `A`) rubricated in vermillion. |
| Illuminated capitals / drop-caps | **Cinzel Decorative** | Roman-capital ornamented display. Gold-leaf-styled drop-cap over each album image. |
| Body / song titles | **EB Garamond** | Old-style serif descended from Claude Garamond — the standard for beautiful body text; feels *scribed*, not typed. Italic for artist attribution. |
| Small caps / labels / status | **IM Fell English SC** | 17th-century Fell types digitized by Igino Marini — irregular baseline gives real hand-inked wobble. |

No system fonts. No Inter, no Roboto, no Space Grotesk.

---

## Palette

Committed medieval-manuscript pigment set, drawn from historical illumination:

- **Vellum** `#f4e6c6` → `#ecd7a8` → `#d9c188` (three-stop gradient across the page — simulates the natural gradient of prepared calfskin)
- **Iron-gall ink** `#1c1108` — body text and rules
- **Vermillion / rubric** `#a3231a` — status, capitals, section headers
- **Lapis / ultramarine** `#1c3d7a` — corner ornaments, mini-caps, marginalia
- **Gold leaf** `#d4a83a` → `#f2d97a` (with `#b98b1e` shadow) — album frames, drop-caps
- **Verdigris** `#476a3d` — hover-state beasts, "scribed" confirmation

Dominant vellum + dark ink, sharp accents of vermillion and lapis, gold leaf as the highest-value pigment reserved for the two most sacred moments (now-playing frame + drop-cap).

---

## Layout

Mobile-first, 430px folio.

- **Incipit** (header): folio mark → blackletter wordmark → tempus badge with manicule (pointing hand).
- **Scriptorium** (search): quill icon + italic input + "ENQVEVE" button (medieval V-for-U spelling).
- **In Cantu Praesenti** (now playing): gold-framed album art with a rubricated drop-cap in the lower-left; title in Cinzel Decorative; ink-fill progress bar with a wet-ink blob at the leading edge.
- **Sequentia** (queue): each row is a *verse* — Roman-numeral index, small gold-framed thumbnail with a lapis mini-cap, title + italic artist + rubricated *scriptor* attribution, duration in small caps.
- **Explicit** (footer): the traditional medieval end-marker.

Corner ornaments (Celtic-ish interlace, SVG) anchor every corner. Hand-inked left/right margin rules run down both edges. Two lapis-blue drolleries float in the margins, breathing with the downbeat.

---

## Reactivity: BPM & energy mapping

**Honest disclosure:** the beat is *driven by a beat clock derived from the track's BPM*, not from FFT of the audio. There is no live audio analysis in this prototype.

**Prototype:** BPM is a JavaScript constant (`124` for the current track, matching M83's "Midnight City"). A `requestAnimationFrame` loop computes beat phase and downbeat phase deterministically from `performance.now()` and writes them to CSS custom properties.

**Production (real app):** the beat clock reads per-track BPM from **ReccoBeats' audio-features endpoint** and syncs to the **live Spotify Web Playback SDK playhead**. Energy (0..1) also comes from ReccoBeats/Spotify audio-features. When a track changes, the clock re-anchors to the new BPM.

**Mapping — three signals, three visual effects:**

| Signal | CSS variable | Visual effect |
|---|---|---|
| **Beat phase** (0..1 within each beat) | `--beat-phase` | Manicule pulses subtly on every beat (`transform: scale`). |
| **Downbeat** (spike at beat 1 of each bar, exponential decay) | `--downbeat-pulse` | Drop-cap gently expands (~6% at peak); marginalia beasts "breathe" (~8% scale swing). |
| **Bar phase** (0..1 across the full bar) | `--shimmer-x` | Gold-leaf shimmer sweeps once across the album frame per bar. |
| **Energy** (per-track constant) | `--beat-energy` | Scales shimmer opacity and downbeat pulse magnitude — high-energy tracks shimmer harder. |

Everything is CSS-variable-driven, so the JS beat clock is tiny and cheap; the browser handles the actual paint via GPU-friendly `transform` and `background-position`.

---

## What I did *not* do

- No purple gradients. No indigo-to-violet-to-fuchsia. No glassmorphism.
- No emoji. No neon. No Space Grotesk / Inter / system fonts.
- No fake spectrum analyzer bars. The reactivity is honest: beat-clock-driven pulses tied to a real (or, in prod, real-time) per-track BPM.
- No skeuomorphic vinyl/tape/CD imagery — that's Winamp territory.
- No noise-as-decoration for its own sake — the vellum grain is a *material* that everything else sits on.

---

## Files

- `themes/vellum-hymnal.html` — one self-contained file, ~570 lines, external only for Google Fonts. No JS libraries. No build step.
- `themes/vellum-hymnal.md` — this note.
