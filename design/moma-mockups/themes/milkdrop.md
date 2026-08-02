# Milkdrop — Theme Notes

## Concept

Full-bleed Winamp/Milkdrop-era psychedelic visualizer as the hero background — a
morphing plasma color field, a bright superscope waveform slicing across the middle,
and a subtle feedback tunnel giving depth. Content (search, now-playing, queue) floats
above it in restrained glass panels so the visualizer is the star but the queue stays
perfectly legible.

The vibe is a house party at 1am where someone finally plugged the good speakers in
and Winamp is projected on the wall. Retro-computer typography, hot neon, black.

## Inspiration

- **Ryan Geiss's Milkdrop 2** (Winamp visualizer, 2001-era) — per-vertex color
  equations, warp mesh, superscope waveform, per-frame feedback zoom.
- **Winamp AVS (Advanced Visualization Studio)** — layered blending modes (screen /
  lighter), superscope preset library.
- **Butterchurn** — the WebGL Milkdrop port, referenced for the palette temperature
  (deep saturated hue rotation, not muddy).
- **Cyberpunk 2077 in-game radio UIs** — chunky monospace + heavy backdrop blur
  above chaos.
- **Old Winamp skin culture** — dot-pattern beat indicators, tiny caps labels
  ("BPM · HIGH ENERGY"), retro-tech letter-spacing.

## Reactivity (honest)

**No real audio, no FFT, no mic.** Music-reactive motion is driven by a synthesized
beat clock derived from BPM + energy:

- `BEAT_MS = 60000 / 126 ≈ 476ms` — the beat clock period
- Per-frame `beat = Math.pow(1 - beatPhase, 3.5)` — a fast-attack, exponential-decay
  pulse envelope, `1.0` on the downbeat, decaying toward `0` before the next beat
- On downbeat (`barPos === 0`), an additional radial burst overlay fires

### Mapping BPM/Energy → motion

| Element                     | BPM-driven | Energy-driven |
|----------------------------|-----------|--------------|
| Feedback tunnel zoom        | base `1.018×` per frame + `beat × 0.035×` punch | `high` sets tunnel-rotation amplitude |
| Plasma hue rotation         | `hue += beatIdx * 0.014` (hue advances one beat at a time) | saturation floor `0.85` |
| Superscope amplitude        | envelope `baseAmp + beat × H*0.11` | `high` doubles harmonics count |
| Center radial burst         | fires on `barPos === 0` (every 4th beat) | intensity scales with energy |
| Wordmark beat dots          | CSS `steps(1)` animation at exactly `476ms` | — |
| Now-playing cover           | `coverBreathe` 4% scale pulse at `476ms` | — |
| Progress bar                | driven off wall-clock (not beat) — represents real track progress | — |
| BPM badge live dot          | flips color hot↔lime on every beat (JS timing, not CSS) | — |

The `126 BPM · HIGH ENERGY` chip is what a Spotify metadata pass would return; the
visualizer treats it as an oracle. If tempo changes track-to-track, the beat clock
re-syncs on track transition. If energy drops to `LOW`, the tunnel zoom, harmonics
count, and downbeat burst intensity all attenuate.

## Rendering pipeline

1. **Feedback tunnel** — `ctx.drawImage(canvas, ...)` onto itself, scaled `1.018×` +
   slight rotation. Creates the recursive depth Milkdrop is famous for.
2. **Fade** — `rgba(3,3,8,0.10)` fill so feedback doesn't accumulate to white.
3. **Plasma** — computed at 128×N low-res via per-pixel color equations (three
   layered sine waves + radial term + `atan2` swirl), then drawn upscaled with
   `globalCompositeOperation = 'screen'`. The upscale interpolation IS the blur.
4. **Superscope** — a soft 6px outer glow line + a sharp 1.5px inner line, both
   using `globalCompositeOperation = 'lighter'`. Waveform is a Milkdrop-style layered
   sine (10th harmonic + 24th + slow drift) with a `sin(πp)` window envelope.
5. **Downbeat burst** — radial gradient overlay, fires briefly on the first beat of
   every 4-beat bar.

Performance target: 60fps on a mid-tier phone. Plasma buffer is `128 × ~278` (~35k
pixels/frame), not the full 430×932 (~400k). Trig uses a 1024-entry lookup table.

## Type & color

- **Wordmark:** `Major Mono Display` — squared, monospaced, retro-computer.
- **Song titles:** `Instrument Serif` italic — deliberate soft/elegant contrast
  against the digital chaos. Makes titles feel like they're being *announced*.
- **Meta (BPM, artists, track numbers, durations):** `JetBrains Mono` — digital
  counter energy, matches the Winamp era.

Palette: black base, four neon accents (`--hot #ff2ea6`, `--cy #22e6ff`,
`--lime #b4ff2a`, `--sun #ffd93d`) plus a lavender chip color for the fifth guest.
Guest chips get their own color per person — the queue reads as a social map, not
a list.

## Legibility strategy

The visualizer is loud, so the UI leans on:

- **Text shadow** on all overlay text (`0 1px 0 rgba(0,0,0,0.65), 0 0 22px
  rgba(0,0,0,0.55)`).
- **Glass panels** on now-playing + search — 50-60% opaque `#06060c` with
  `backdrop-filter: blur(14px) saturate(160%)`.
- **CSS scanline + vignette overlay** on the phone frame (multiply blend), which
  both adds CRT texture AND darkens the extreme edges under the queue.
- **Queue rows have no panel** — they sit directly over the visualizer, separated by
  thin hairline dividers. Trusts the vignette + text shadow. This is the risky bit;
  if a specific frame washes out a row, the text-shadow keeps it above threshold.
- **Bottom fade mask** on the queue scroll container, so the last row dissolves into
  the visualizer rather than clipping abruptly at the phone bezel.

## What would break this theme

- Very light or pastel visualizer moments would kill legibility. Fixed by keeping
  `--bg: #05060a` fade every frame and never letting plasma saturation drop below
  0.85. Plasma alpha is capped at `60/255` so the pure-black feedback fade dominates.
- On a truly low-end phone the plasma inner loop is the hot path. Fallback: drop
  `PW` from 128 to 96 and cap DPR to 1.5.
