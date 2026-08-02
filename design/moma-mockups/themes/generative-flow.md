# Theme: Generative Flow

Ink on warm paper. A Perlin-noise flow field drifts continuously across the phone
canvas while a synthesized 126 BPM beat clock breathes into the field. The party
queue sits over it like editorial print — a magazine's music page rendered onto
a plotter drawing that keeps moving.

## Reference & Inspiration

- **Casey Reas & Ben Fry** — flow-field particle drawings from the early *Processing*
  gallery. Ink-thin lines following a noise field, no bright colors.
- **Zach Lieberman** — daily generative sketches. Restraint, warm bone palette,
  one accent chroma at most.
- **Anders Hoff (inconvergent)** — plotter aesthetic. Overlapping thin strokes,
  paper-first color.
- **Robert Hodgin** — subtle audio-reactive fields (structural inspiration for the
  beat coupling, not the palette).
- **Studio *A4* / *Christoph Niemann* editorial covers** — italic Fraunces at big
  optical size, mono captions, coral as the single accent.

Not this: neon particle screensavers, purple → cyan gradients, glowing dots,
sci-fi HUD chrome, rainbow spectrum bars.

## Palette

| Role                | Hex        | Use                                              |
|---------------------|------------|--------------------------------------------------|
| Paper (background)  | `#ece4d1`  | Canvas fill, page ground                         |
| Ink                 | `#14110d`  | Wordmark, titles, primary strokes                |
| Ink · secondary     | `#241d16`  | Body strokes                                     |
| Ink · soft          | `#3d3327`  | Tertiary strokes, subheads                       |
| Taupe               | `#8a7663`  | Captions, hairlines, artist rows                 |
| Coral (accent)      | `#cc4a2b`  | Wordmark "Aux.", guest chips, beat dot, wash     |
| Amber (rare)        | `#c9922e`  | Occasional particle color (~2%)                  |

Rule: at most one accent hue on screen at once. Coral does most of the work;
amber is a punctuation mark.

## Typography

- **Display / editorial** — [Fraunces](https://fonts.google.com/specimen/Fraunces).
  Variable, uses `opsz` (9–144) and `wght` (300–900). Italic at large optical
  size for the wordmark and section titles ("Up *Next*"). One of the few serifs
  with real character at 44px display *and* 14px queue rows.
- **Body / UI** — [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans).
  Distinctive, editorial, avoids the Inter/Manrope default.
- **Metadata / mono** — [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono).
  Track numbers, durations, BPM plate, guest chips, footer.

Explicitly avoided: Inter, Space Grotesk, DM Sans, Roboto, system-ui.

## Layout

Mobile-first, 430 × 932. The phone frame is present so this reads as a real
device, not a browser sketch.

```
┌── phone (cream + canvas + grain) ───┐
│  header  wordmark   ·   BPM badge   │
│  ──────── hairline ────────         │
│  [ search input ............ Queue ]│
│                                     │
│  ┌─ Now Playing ──────────────┐    │
│  │ cover   title / artist      │    │
│  │         progress bar        │    │
│  └────────────────────────────┘    │
│                                     │
│  Up Next          06 · 22 min       │
│  ──────── hairline ────────         │
│  01  ▢  Redbone    Gambino  Maya 5:26│
│  02  ▢  Nights     F Ocean  Jordan   │
│  … 6 rows, no per-song icons        │
│                                     │
│  Live queue open   #kitchen-party   │
└─────────────────────────────────────┘
```

## BPM / Energy → Motion Mapping

The theme is choreographed to a synthesized beat clock, not real audio.
`BPM = 126`, so `beatMs ≈ 476ms`. Every beat, `beatPulse` resets to `1` and
decays exponentially (`* 0.994^dt`). Every fourth beat (the bar downbeat),
`barPulse` resets similarly with a slower decay (`* 0.997^dt`). `ENERGY = 0.85`
raises the amplitude of every response.

| Signal          | Visual effect                                                        |
|-----------------|----------------------------------------------------------------------|
| `beatPulse`     | `flowAmp` multiplier (drift speed) briefly rises by ~0.9              |
| `beatPulse`     | `noiseZ` jumps forward — the field itself reshapes on each beat       |
| `barPulse`      | Soft radial coral wash rises from the upper-center of the paper       |
| `dotPulse` (CSS)| Header BPM dot pulses in exact 126 BPM lockstep via `animation`       |
| `barBounce` (CSS)| Four-bar energy meter bounces in lockstep                            |
| ENERGY (constant)| Scales the beat's contribution to `flowAmp` (`0.5 + ENERGY * 0.55`)  |

At lower energy, drop `ENERGY` toward `0.3` and the field becomes near-still
between beats — the same design still reads as a calmer room.

## Field Technique

Standard flow-field pattern from the *Processing* / Shiffman lineage:

1. Sample 2D Perlin noise at each particle's `(x, y)` (two octaves for richness).
2. Map the noise value `n ∈ [-1, 1]` to an angle `θ = n · 2π · 1.35`.
3. Advance each particle by `(cos θ, sin θ) · speed · flowAmp`.
4. Draw a short line from previous → new position (not a dot — the trail *is*
   the drawing).
5. Fade the whole canvas by drawing a translucent paper-colored rectangle each
   frame. Trails linger for ~1s, giving the plotter/ink feel.
6. Respawn particles that expire or leave the canvas — this preserves visual
   density without runaway allocation.

Density: `min(700, max(180, floor(W·H / 950)))` particles, so a 430 × 932 phone
uses ≈ 420 particles at ~60fps.

Colors: mostly ink (three shades to avoid a flat black wall), ~2.8% coral
strokes, ~2% amber. Rare accent strokes are what your eye locks onto — the
gallery-print quality comes from restraint, not density of chroma.

## Performance & Discipline

- Canvas dimensions capped at `2× DPR` to keep fill rate cheap on Retina.
- No shadow-blur, no `filter:blur()` inside the loop — only `globalAlpha`,
  `strokeStyle`, and one `createRadialGradient` per bar downbeat.
- Envelopes use `Math.pow(decay, dt)` so motion is frame-rate independent.
- The RAF loop early-returns when the tab is hidden (`visibilitychange`),
  and re-anchors `lastFrame` on wake so the field doesn't jump.
- Zero external JS libraries; ~180 lines of noise + particle code.

## Notes for Tejas

- The wordmark uses Fraunces' italic optical-size 144 axis for the "Aux." — try
  toggling `font-variation-settings` if you want it a little quieter (drop wght
  from 500 → 400, opsz stays at 144).
- Coral is the whole system's accent. If a variant needs a second accent (say
  for "hosted by" chips), pull from the amber that already shows up in ~2% of
  the particles.
- The load-in reveal uses `animation-delay` staggering on the direct children
  of `.content` — cheap, no JS, and the ONLY entry animation on the page.
- Progress bar is mocked; when wiring to real Spotify state, keep the
  `pbFill.style.width` update the only DOM write per frame in the visual layer.
- The field would also work as a full-bleed background for a projected "host
  view" — same code, larger canvas, particle density formula already scales.
