# Afterglow

**A cinematic editorial theme for Pass the Aux.** Nightclub cinematography meets fashion-magazine typography: rich obsidian black, a massive Fraunces serif wordmark that splits into chromatic RGB ghosts on every beat, an album-art bloom halo that breathes with the tempo, and hairline monospace metadata that reads like a print colophon. The room fades to red at the corners on downbeats. The playhead is a lit ember.

## Aesthetic direction

- **Distinct from the four existing themes** — this is not skeuomorphic (Winamp), not psychedelic (Milkdrop), not generative-abstract (flow-field), and not screen-printed (risograph). It's contemporary editorial + cinematic dark.
- **Committed dark palette.** Obsidian `#0A0908` background with warm bone ink `#F5F1EA`, arterial bloom `#FF4B47`, and a cyan counter-note `#4AD5FF`. No purple, no gradient soup, no glassmorphism — the accents are red hot and cyan cool, on purpose.
- **Typography is the room.** Display type is Fraunces at optical-size 144, weight 900 for the wordmark and italic 500 for the track titles — it does the work most themes ask decoration to do. JetBrains Mono handles metadata like a printing-press colophon. Inter Tight for body only.
- **Material honesty on motion.** Nothing pretends to be sampling FFT it doesn't have. The reactivity is a clean beat-clock envelope (attack + exponential decay per quarter note, separate faster decay for chromatic split, slower decay for halo, downbeat-only kick for the corner wash).
- **Editorial artifacts.** Corner registration marks around the album art. A masthead colophon strip ("Iss. 004 · Afterhours · Vol. II · 02:14 AM"). A footer signed "a party pressed to vinyl." These are the details that separate a designed page from a templated one.

## Reactivity (honest)

The prototype uses a fixed beat clock — **BPM = 128, energy = 0.82** — chosen to sit inside deep-house / afterhours territory. Every frame the JS derives:

- `--beat` — attack + 90ms half-life decay envelope, fires on each quarter note. Drives the chromatic RGB split on the wordmark, playhead scale + glow, and album-art ghost offsets.
- `--beat-soft` — same trigger, 220ms half-life. Drives the album-art breathing scale and halo blur.
- `--kick` — fires only on downbeats (every 4 beats), 260ms half-life. Drives the corner room-wash.
- `--phase` — 0→1 sweep across each beat, positioning a scan line moving up the album art and a traveling kick along the waveform bars.

**In production this is not a fixed number.** The shipped app reads per-track tempo + energy from ReccoBeats (or Spotify's audio features fallback), and the beat index is derived from the *live* Spotify playhead position (`playback.progress_ms`) plus tempo — so the halo actually breathes with the song being played, not a wall-clock guess. Swapping the two constants at the top of the `<script>` for those live values is the entire integration surface.

The progress bar is a real playhead — it advances every frame from `performance.now()` against a `TRACK_SECONDS` constant and formats the `mm:ss` text live. No fake FFT, no random noise dressed up as spectrum.

## References that shaped this

- **032c magazine** — for how a masthead can be typography and nothing else, and how confident tracking and negative space read as attitude.
- **Rauno Freiberg** (rauno.me) — material honesty: motion that reflects a real physical model instead of decorating with keyframes.
- **Emil Kowalski** (emilkowal.ski) — hairline lines, restrained motion, unshouty numeric typography.
- **Linear.app** — dark editorial UI where every line weight is intentional.
- **Locomotive** and **Active Theory** — chromatic split and cinematic dark treatments used with restraint, not everywhere at once.
- **Vercel design system** — hairline separators and mono metadata as connective tissue.
- **Metalabel** and **Are.na** — editorial calm around cultural artifacts.

## Layout parity

Matches the required 430px mobile-first layout exactly:

- Header: three-line stacked "PASS THE AUX" wordmark + BPM/energy badge (right-aligned, with pulsing live dot and animated energy bar).
- Search bar at top: input + Queue CTA, with a monospace ⌘K glyph inside.
- Now Playing: cover art + italic serif title + artist / album, hairline progress bar with a bloom-lit ember playhead, mm:ss timecodes.
- Up Next: five queue rows, each with thumbnail + title + artist + guest-name chip + track number (in the row header) + duration + genre tag. **No per-song symbols.**

## Content

Uses the four required Spotify album-art URLs (`i.scdn.co/image/...`) across the now-playing hero and five queue rows. Track names and artists are contemporary deep-house / afterhours (Fred again.., Peggy Gou, Jamie xx × Honey Dijon, Overmono, Bicep, Rüfüs Du Sol). Guest names are single-name party chips.

## Constraints honored

- Self-contained single HTML file, inline CSS + JS.
- External assets: Google Fonts (Fraunces / JetBrains Mono / Inter Tight) and the four Spotify CDN images. No JS libraries, no build step.
- Mobile-first 430px, tested by opening the file directly.
- `prefers-reduced-motion` disables the beat pulse but preserves the composition.
- No modifications to `client/src` or app code. No deploy. No git.
