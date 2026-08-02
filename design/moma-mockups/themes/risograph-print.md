# Risograph Print — theme note

**Aesthetic:** Risograph print zine.  The two-color spot-ink look of the Risograph
duplicator (RISO GR / MZ family) — warm off-white paper stock, fluorescent-pink and
teal inks that overprint with visible mis-registration, halftone dot fills, a fine
paper grain, hand-stamped ornaments, dashed rules, and chunky editorial typography.
This is the aesthetic of a limited-run gig poster or an independent music zine — the
opposite of a slick digital music player.

**Why this fits Pass the Aux:** A house party is a physical, communal event.
Risograph is the printmaking language of physical, communal events — flyers taped to
lamp-posts, zines sold at merch tables. The party queue becomes an "issue" of a zine
pressed together by the guests in the room.  It is warm, tactile, unmistakably
handmade, and — critically — reads as nothing at all like a music-player skin.

## Key design choices

- **Palette:** three inks over warm newsprint.
  - Paper `#EFE3C4` / paper-shadow `#E5D5AC`
  - Fluorescent pink `#FF3D7A`
  - Teal `#0F7F79`
  - Federal blue `#2B4CDB`, yellow `#FFC634` as micro-accents
  - Ink black `#1A1611` (never true black — riso can't print pure K)
- **Type stack (all Google Fonts):**
  - Display: **Bricolage Grotesque** (variable, chunky, humanist — wordmark, button, chip labels, artist names in small caps)
  - Editorial serif: **Instrument Serif** italic (song titles, taglines, search placeholder — the poster's "voice")
  - Body: **Instrument Sans**
  - Mono: **JetBrains Mono** (timecodes, track numbers, issue metadata, colophon)
- **Mis-registration:** the `PASS THE AUX` wordmark prints three times — a
  pink ghost offset up-left, a teal ghost offset down-right, and black on top,
  multiplied together.  The now-playing album art carries the same treatment:
  two duotoned ghost copies (pink + teal) sit behind the halftoned artwork.
- **Halftone:** small radial-dot pattern multiplied over every album image and
  thumbnail — gives them the printed newspaper feel instead of glossy JPEG.
- **Paper grain:** a fixed SVG `feTurbulence` layer over the whole viewport,
  multiplied at 35% — the single most important detail for reading as "printed."
- **Ornaments:** rubber-stamped BPM badge with dashed inner ring and a hand-drawn
  roughen filter; corner "Nº 01" tab on the album art; 16-point starburst in the
  colophon; deckled dot-edge along the bottom of the paper card.
- **Guest name chips:** small stamped rectangles rotated ±2–3°, alternating
  teal / pink / blue outlines — reads as if each guest hand-stamped their own
  claim on the queue.
- **Layout:** the whole app is treated as a single sheet of stock, dropped on a
  dark surround with a heavy drop-shadow — the mockup itself is the printed
  object, not a "screen."

## Motion (honest, minimal)

- Vinyl disc behind the album art spins slowly (4s / rotation) and receives a
  soft brightness kick every 476ms — one beat at 126 BPM.  The kick is
  synthesized from the BPM constant in JS, per the brief.
- Live-dot in the "NOW PRESSING" chip blinks on the same beat via CSS steps().
- Everything else is deliberately static — riso is a print medium and the
  aesthetic should feel arrested, not animated.  `prefers-reduced-motion` kills
  the spin and pulse entirely.

## What was deliberately avoided

- No purple/violet gradients, no glass, no "AI slop" glow, no atmospheric radial
  gradients pretending to be product photography.
- No Inter / Roboto / Space Grotesk / SF Pro.  Bricolage + Instrument + JetBrains
  Mono is a specific, uncommon, characterful pairing.
- No per-song play/queue/heart symbols in the up-next rows — the guest-name chip
  is the row's affordance, matching the brief.
- No visualizer, no equalizer bars, no waveform, no album-color-bleed
  backgrounds — this proves Pass the Aux can wear an outfit that is nothing
  like a Winamp skin.
