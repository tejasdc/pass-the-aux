# CATHODE — Pass The Aux as a CRT vectorscope

**Slug:** `cathode-vectorscope`
**File:** `cathode-vectorscope.html`
**Aesthetic direction:** *"A piece of vintage lab-equipment audio software that happens to run a party queue."* A dark-mode phosphor UI wrapped in a CRT bezel, with an XY-mode Lissajous vectorscope as the live music-reactive visualizer — the same visual family as Winamp AVS's SuperScope, Jerobeam Fenderson's oscilloscope music, and the vector-arcade lineage of *Battlezone*, *Asteroids*, and *Tempest*.

## Why this direction

The four existing themes (Winamp-classic skin, Milkdrop plasma, generative flow-field, risograph zine) all sit in different neighbourhoods. This one takes the *audio-software / instrument-panel* lineage seriously: instead of a raster spectrum bar or a stochastic flow-field, it uses the actual mathematics of an analog XY oscilloscope — a parametric curve `x = sin(a·t + δ), y = sin(b·t)` drawn on a fake CRT with phosphor decay. That curve is called a **Lissajous figure**, and it is what you get when you feed two related audio signals into a scope in X-Y mode. It is the most literal possible "music → picture" mapping. The Winamp AVS "SuperScope" preset is a direct ancestor.

The whole app then extends that instrument-panel language: hairline **graticule dividers**, a 10×4 grid behind the scope, a "beam-head" dot on the progress bar, three status LEDs (`vents`) in the header, and a footer that reads like a scope's front-panel label (`MODEL D-11 · 5103N · P1 PHOSPHOR · 2V/DIV`). The "D-11 5103N" is Fenderson's actual instrument — a small tip-of-the-hat.

The one **real aesthetic risk**: album art is not rendered "on top of" the interface — it is tinted with a green phosphor overlay and covered with scanlines so it reads as if it's being *displayed on the CRT itself*. Art is still recognizable, but it participates in the visual language instead of fighting it. This is what unifies the entire theme.

## References I looked at

- **[Jerobeam Fenderson — Oscilloscope Music](https://oscilloscopemusic.com/watch/oscilloscope_music)** and [Creative Applications feature](https://www.creativeapplications.net/project/oscilloscope-music-jerobeam-fenderson-and-hansi-raber/) — audio-visual work drawn on a Tektronix D11 5103N with two-channel audio in X-Y mode. Source of the Lissajous-as-music idea and the "MODEL D-11 · 5103N" footer.
- **[IEEE Spectrum: Fenderson's oscilloscope music](https://spectrum.ieee.org/amp/jerobeam-fendersons-trippy-oscilloscope-music-2650272216)** — background on the technique.
- **[Simulating an XY oscilloscope on the GPU (Nick Tasios)](http://nicktasios.nl/posts/simulating-an-xy-oscilloscope-on-the-gpu.html)** — informed the phosphor-decay approach (fill the canvas with a low-alpha dark rectangle every frame so the trace persists briefly, mimicking P1 phosphor persistence). Kept it 2D-canvas here for zero-dep simplicity.
- **[Winamp AVS (Advanced Visualization Studio) — Wikipedia](https://en.wikipedia.org/wiki/Advanced_Visualization_Studio)** and [AVS SuperScope oscilloscope presets](https://forums.winamp.com/forum/community-center/general-discussions/170240-oscilloscope) — the direct historical precedent for user-scriptable vector visualization tied to audio.
- **[Adafruit: Making oscilloscope images with DACs](https://learn.adafruit.com/dac-oscilloscope-images?view=all)** — grounding on X-Y mode drawing.
- **[Vectorsynthesis (macumbista)](https://github.com/macumbista/vectorsynthesis)** — vector-shape synthesis for oscilloscopes / Vectrex / ILDA lasers. Adjacent lineage.
- **Battlezone / Tempest / Asteroids (Atari vector-monitor arcade, 1980–81)** — visual proof that green wireframe on black reads as a "vector display," not as "hacker terminal."
- **P1 phosphor color reference** — `~#7fff9c`, the emerald green of a P1 CRT, is the primary color; `~#ffb547` (P3 amber) is the secondary for guest chips and status.

## Design tokens

### Palette
| Token | Hex | Role |
|---|---|---|
| `--void` | `#04080a` | CRT bezel body |
| `--panel` | `#061511` | Interior panel |
| `--panel-lift` | `#0a1c17` | Raised elements (input) |
| `--phosphor` | `#7fff9c` | P1 green — primary text, traces |
| `--phosphor-dim` | `#3f8a55` | Secondary text, dim graticule |
| `--phosphor-ghost` | `#183a26` | Deepest dim / unfilled bar |
| `--amber` | `#ffb547` | P3 amber — guest chip, live indicator |
| `--rule` | `#123024` | Hairline dividers |

Committed to a single color-family (green phosphor) with amber as the *one* named accent, used only where a scope would use it (live status, chip labels). No purple, no gradients on any control.

### Type
- **Display / CRT numerics:** [`VT323`](https://fonts.google.com/specimen/VT323) — used for the wordmark, BPM readout, track title, timecode, track index, duration. Chunky, unmistakably phosphor.
- **Body:** [`Space Mono`](https://fonts.google.com/specimen/Space+Mono) — everything else. Monospaced, well-designed, keeps the instrument-panel register without slipping into terminal-app cliché.
- Only two families. All body labels are uppercase with `letter-spacing: 0.14em–0.28em` — the visual equivalent of a stencilled panel label.

### Signature element
The **XY vectorscope**. It is the one bold thing, and it lives directly under the album art in NOW PLAYING. Everything else — dividers, LEDs, chips, timecode — is disciplined chrome that references the same instrument.

## Layout (mobile-first, 430px)

```
┌── CRT BEZEL ────────────────────────────┐
│ ●●●   PASS THE AUX          BPM 128     │
│                             ENERGY .82  │
│ ── graticule divider ───────────────    │
│ ▸ SEARCH TRACK OR ARTIST      [QUEUE +] │
│ ── graticule divider ───────────────    │
│ ◤ NOW PLAYING                  CH-1     │
│  ┌────┐  MIDNIGHT CITY                  │
│  │ART │  M83 · Hurry Up, We're Dreaming │
│  └────┘  ▓▓▓▓░░░░░░░  01:24 / 04:03     │
│  ┌─── XY · LISSAJOUS ── ● LIVE 128 BPM ┐│
│  │       [live vector curve]           ││  ← the signature
│  └── 2V/DIV · 5ms/DIV ── P1 PHOSPHOR ──┘│
│ ── graticule divider ───────────────    │
│ ◤ UP NEXT                   04 IN QUEUE │
│  02 [th] Redbone            5:26        │
│         Childish Gambino  «tejas»       │
│  03 [th] Passionfruit       4:59        │
│         Drake             «marya»       │
│  04 [th] The Less I Know…   3:36        │
│         Tame Impala       «jules»       │
│  05 [th] Sunflower          2:38        │
│         Post Malone…      «ravi»        │
│ ── graticule divider ───────────────    │
│ MODEL D-11 · 5103N   ● REC   V.CATHODE  │
└─────────────────────────────────────────┘
```

## BPM / energy → visualizer mapping

The scope is honest about what drives it. In the **production app**, the beat clock reads from the currently-playing track:

- `BPM` and `energy` are pulled per-track from **ReccoBeats** (a Spotify audio-features replacement, since Spotify deprecated `/audio-features` for new apps).
- The **beat clock** = `f(track.bpm, playhead_ms)` — i.e. the current position within the track divided into beat-length intervals of `60_000 / bpm` ms.
- Every beat emits an envelope pulse (fast attack, ~0.4s exponential decay) that modulates the visualizer's amplitude.
- `energy` scales the amplitude of that pulse — a low-energy track (chill, ambient) still shows the figure but the pulse is subtle; a high-energy track pushes it visibly.

In **this prototype** the values are hard-coded — `BPM = 128`, `energy = 0.82` (Midnight City) — because there is no real audio pipeline. The animation does the correct math:

- Beat envelope: `pow(1 - (t mod BEAT_MS) / BEAT_MS, 2.2)` — sharp attack, exponential decay
- Amplitude: `0.85 + envelope * 0.35 * ENERGY`
- Frequency ratio: cycles through classic Lissajous ratios `[3:2, 4:3, 5:4, 5:3]` on 16-beat phrases, so the figure "settles" on musical downbeats
- Slow rotation (`t / 6500`) and a subtle horizontal jitter (`sin(t/37) + sin(t/91)`) as CRT tells
- Phosphor decay: each frame draws `rgba(1,15,8, 0.16)` over the whole canvas so the trace persists briefly and fades — the visual signature of P1 phosphor

**No fake FFT, no fake waveform.** The scope reflects exactly what an XY-mode oscilloscope would show for a two-oscillator source at that BPM: a Lissajous figure whose closure ratio and amplitude are locked to the beat. Everything else is honestly labeled — the "2V/DIV · 5ms/DIV" footer is decorative-but-plausible scope chrome, not a claim about anything.

## Copy discipline

- All labels in monospace uppercase — `NOW PLAYING`, `UP NEXT`, `IN QUEUE`, `CH-1`, `BPM`, `ENERGY`.
- Search placeholder: `SEARCH TRACK OR ARTIST` (imperative, no fluff).
- Button: `QUEUE +` — verb, active voice.
- Guest chips in guillemets — `« tejas »`, `« marya »`, `« jules »`, `« ravi »` — as if scoped audio channels named after the person who queued them.
- Track index in 2-digit zero-padded (`02`, `03`) — matches scope-instrument conventions.
- Footer reads like an equipment label: `MODEL D-11 · 5103N · REC · V.CATHODE.001`.

## Accessibility

- Focus rings: dashed 1px phosphor with 2px offset (`:focus-visible`)
- All decorative CRT elements marked `aria-hidden="true"` (scanlines, sweep, LEDs, scope canvas)
- `prefers-reduced-motion: reduce` freezes the scope, blink animations, sweep, and wordmark jitter after one frame
- Semantic landmarks: `<main>`, `<header>`, `<section aria-label>`, `<footer>`, `<ol>`, real `<button>` and `<input>`
- Color contrast: `--phosphor` (`#7fff9c`) on `--panel` (`#061511`) is well above WCAG AA for body text; dim text uses `--phosphor-dim` on the same panel, which is >4.5:1 for the 11–13px labels used

## What I explicitly avoided

- Purple/violet accents, gradient meshes, glow-tile icons (the AI-slop palette).
- Any raster spectrum bar (that's Milkdrop / classic Winamp territory).
- Skeuomorphic pixel bevels (that's the Winamp-classic skin).
- A stochastic particle system or flow field (that's the generative-flow theme).
- Coarse offset-print halftones (that's the risograph theme).
- Per-song icons/symbols in the queue (spec forbids).
- Fake reactive waveform / FFT claims — this uses parametric Lissajous, which is what a real X-Y scope draws.
