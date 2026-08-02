# Winamp Classic — Pass The Aux

A loving recreation of the 1997 Winamp 2.x "base" skin, adapted as a party-queue screen.

## Inspiration

- **The chrome.** Multi-layered beveled panels (light top-left border, dark bottom-right border on a dark body) — nested "windows" with the classic grippy title bar, min/max/close chiclets, and inset "sunk" LCD areas. Achieved with paired `border` colors + `inset box-shadow` in the classic "raised / sunken" two-tone technique.
- **Fire-style spectrum analyzer.** Bottom-yellow → mid-orange → top-red gradient bars with a small light peak marker that rises with the bar and falls on a slow hold-and-drop. 22 bars across, shaped by a house-track envelope (strong sub, mid dip, high roll-off).
- **Green oscilloscope** overlaid on the same viz strip, drawn with `<canvas>` in the classic thin green trace with a soft green glow.
- **LCD-green pixel text** for song title (scrolling marquee), the big MM:SS clock, and the queue duration column. Amber for the kbps/kHz cluster (the other classic Winamp readout color). Font stack: `VT323` for LCD numerics + `Silkscreen` and `Micro 5` for the tiny pixel chrome labels.
- **The tagline.** The original said "IT REALLY WHIPS THE LLAMA'S ASS." Here it's "IT REALLY **WHIPS THE PARTY**" — same rhythm, party-appropriate.
- **CRT feel.** Global scanline overlay + vignette + `image-rendering: pixelated` on album art, plus dithered CRT overlay on the art frame — makes 300px Spotify JPEGs read as chunky pixel textures at Winamp's resolution.
- **Chunky chrome transport buttons** (prev / play / pause / stop / next), volume + balance sliders with the classic green→yellow→red fill, and the dashed blue/dark-blue progress rail with a beveled thumb.
- **Bottom "Windows 98" taskbar** with a Start button (a tiny yellow llama pixel), open-window pills, and an LCD clock in the tray — grounds the whole thing as a desktop application, not a website.

## How the reactivity maps to BPM / energy (be honest)

There is **no real audio analysis** in a browser-only party-queue prototype:
- No mic capture (guest phones would refuse permission for a queue app, and the host's device is playing music, not analyzing it).
- Spotify's `audio-analysis` endpoint is deprecated / 403 for new integrations.

So everything music-reactive here is driven by a **synthesized beat clock** and is documented as such in the JS.

- The single knob is `BEAT_MS = 60000 / BPM` (476.19 ms at 126 BPM), exposed to CSS as `--beat-ms`.
- **BPM badge dot** and the **`:` colon of the MM:SS time readout** blink on the beat via CSS `steps(2)` keyframes bound to `--beat-ms` — that gives everyone the shared visual pulse without any audio.
- **Spectrum bars** are computed per animation frame from `phase = (elapsed % BEAT_MS) / BEAT_MS`. Each bar has:
  - a fixed **frequency-envelope weight** `envAt(i)` (bass hump on the left, mid dip, high shelf on the right — the shape of a house record);
  - a **beat-intensity curve** `beatIntensity(phase, i)` — a kick envelope `(1-phase)^4` masked onto the bass bars, plus a sine-based hi-hat pulse on the top bars;
  - a **deterministic per-bar wobble** so it doesn't look mechanical.
- **`ENERGY = 0.92`** (from the "HIGH ENERGY" badge) scales the whole target amplitude linearly — a low-energy chill track would flatten the bars.
- **Peak markers** are pure physics: rise instantly with the bar, hold 120 ms, then fall at ~40 px/s. Same behavior as the original Winamp analyzer.
- **Oscilloscope** is a sum of three sine waves (sub / mid / hi frequencies) whose amplitude is gated by the same kick envelope, so on every downbeat you get a visible "punch" through the trace.
- **Marquee** and **elapsed time** advance on wall-clock, independent of BPM (they're the "song is playing" signal, not the "song is loud" signal).

If we later gained access to real audio-analysis (host-side FFT of the Web Playback SDK output, or a re-enabled Spotify analysis endpoint), only the two functions `envAt` and `beatIntensity` need replacing — the rendering, peaks, and CRT overlay stay identical.

## Layout adaptations for the party-queue brief

- **Room-code window** at the top (the sign-in surface): a tiny pixel-art QR + big LCD-green `AUX-4472` code + amber guest count.
- **Player window**: 96×96 album art (with dithered CRT overlay), LCD strip, scrolling marquee, spectrum+oscilloscope, big MM:SS + `IT REALLY WHIPS THE PARTY` tagline, progress rail, transport row.
- **Search "window"** as its own mini Winamp panel with a magnifier-glass icon inside the LCD input, blinking green block cursor, and a chunky `QUEUE` chrome button — the mobile-first primary CTA sits second from the top exactly as the brief calls for.
- **Playlist Editor window**: real Winamp playlist rows — `NN` track number, thumbnail, title/artist stack, guest-name **chip** (amber pixel pill, replacing decorative per-song icons), duration in LCD green. The now-playing row uses the classic blue-highlight bar with a small green triangular "now" arrow.
- **Footer** mimics the original playlist-editor footer (`SEL 0 / 8 · MISC · SORT BY GUEST`) with a `14 ON THE AUX` party-flavored counter on the right.

## Constraints honored

- Single self-contained HTML file, inline CSS + JS, external Google Fonts only.
- No external JS libraries, no build step. Open in any browser.
- 430 px mobile-first; also degrades gracefully below 380 px (art shrinks to 80 px, transport buttons tighten).
- `prefers-reduced-motion: reduce` disables the marquee, colon blink, cursor blink, and bar-height transitions.
- Real album-art URLs from `i.scdn.co` (the four approved hashes, rotated across the queue).
- Realistic 2026 house/tech-house queue: Fisher, Dom Dolla, Chris Lake, Peggy Gou, John Summit, Fred again.., James Hype, Kaskade.
