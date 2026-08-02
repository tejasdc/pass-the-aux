# All-Access Laminate

**Slug:** `holo-laminate-pass`
**File:** `holo-laminate-pass.html` (single self-contained file, no build step, no external JS libs)

## The aesthetic

A physical **holographic backstage laminate** — the kind of VIP tour credential
you get zip-tied to a lanyard at Coachella, a Boiler Room, or a warehouse
takeover. Prismatic foil edge, guilloché security engraving watermarked behind
the wordmark, condensed credential typography, tear-off ticket stubs for the
queue below, hand-scrawled guest names in permanent marker, a magnetic
security strip serving as the live progress bar, and a subtle 4/4 lanyard
sway synced to the beat.

The premise: the person "passing the aux" is *the promoter*. Everyone whose
song is up next has been added to the guest list; the credential is their
ticket into the set.

## Why it's distinct from the four existing themes

| Existing theme | Their category | Why this is different |
|---|---|---|
| Winamp Classic | 90s desktop OS skin | Physical object with foil and paper, not a digital player faceplate |
| Milkdrop | Fullscreen plasma visualizer | UI card, not a bleeding waveform — mostly-static holography, not chaos |
| Generative Flow | Editorial gallery-generative art | Industrial credential typography (Anton, JetBrains Mono, Permanent Marker), not a cream editorial page with ink flow |
| Risograph Print | Printed newsprint zine (paper stock, spot inks, halftone) | **Also a physical object, but a laminated foil-stamped card, not printed paper.** Different substrate (plastic + foil vs. newsprint), different color science (prismatic banding vs. spot-ink mis-registration), different typography (industrial condensed vs. editorial serif+display), and the queue rows are perforated tear-off *stubs* here instead of stacked print blocks. |

## References I actually looked at

- **Holopasses** — production holographic backstage laminates: <https://holopasses.com/en/collections/backstagepasslaminateholo>
- **Backstage Supplies** — Holographic VIP / All-Access badge stock: <https://backstagesupplies.com/products/holographic-vip-laminated-badge> and <https://backstagesupplies.com/products/holographic-all-access-laminated-badge>
- **Arnett Credentials** — custom tour laminates and holographic event badges (matrix/disco/crackle foil patterns, foil-stamp security overlays): <https://www.arnettcredentials.com/product/custom-tour-laminates/> and <https://www.arnettcredentials.com/product/holographic-event-laminates/>
- **Wristband Express / Admit One** — VIP holographic wristband + perforated tear-off stub construction: <https://www.wristbandexpress.com/products/plastic-holographic-vip-design>, <https://www.admitoneproducts.com/Holographic+VIP+Plastic+Wristbands/>
- **Effect Labs — CSS holographic effect (iridescent + chrome)**: <https://effect-labs.com/en/pages/blog/effet-holographique-css.html> — confirmed the "single biggest visual cue that something is holographic is the banding — magenta cluster hot, cyan cluster cool, not a uniform conic" principle, which drove the multi-layered gradient composition on `.holo-edge`.
- **OpenReplay — Creating Holographic Effects in CSS**: <https://blog.openreplay.com/creating-holographic-effects-css/>
- **Guilloché Pattern Generator** — rose engine, moiré, clous de Paris SVG output used as reference for the credential watermark: <https://guillochegenerator.com/>
- **Envato Tuts+ — Security seal in Illustrator using guilloche**: <https://design.tutsplus.com/tutorials/create-a-security-seal-in-illustrator-using-guilloche-patterns--vector-4828>
- **Tour Manager — Access All Areas: Understanding Tour Credentials**: <https://tourmanager.info/tour-credentials/> — used for the credential lexicon (SIDE STAGE OK, GUEST LIST · A, etc.)

## Design language commitments

- **Typography — three-way pairing, none of them defaults**
  - **Anton** — ultra-tall condensed sans, does the "credential shouting at you" job (`PASS THE AUX`, `MAIN STAGE`, stub titles). Not Space Grotesk, not Inter.
  - **Barlow Semi Condensed** — utility body voice with a taller x-height than a generic humanist sans; feels like backstage-manifest typewriter output but modernized.
  - **JetBrains Mono** — every serial number, every access-level stamp, every disclaimer line.
  - **Permanent Marker** — the guest names, scrawled diagonally onto the pass in hazard orange like a Sharpie on a laminate.
- **Palette — committed and asymmetric**
  - Jet laminate black `#0a0d18` dominates the header/main-stage/terminal.
  - Warm eggshell `#ece0c6` for stub paper — a distinct paper stock from the riso theme (cooler, more industrial receipt paper).
  - **Hazard orange `#ff5a1f`** as the single accent — the safety-vest color used for the QUEUE stamp, guest scrawls, and the pulsing "live" indicator. No purple gradients, no violet, no drift toward the AI-default indigo palette.
  - Prismatic holo gradient built from six real hologram spectrum colors (magenta / gold / citron / cyan / blue / violet) with a hot magenta cluster and a cool cyan cluster overlay — matching the "non-uniform banding" that Effect Labs identifies as the tell for a real hologram vs. a uniform conic gradient.
- **Spatial composition** — the credential hangs on a real lanyard cord (drawn as an SVG bezier curve with a woven text-path repeat and a metal clip that connects the strap to the card). The whole rig sways 1.8° over one bar of music. Below the credential, the queue drops away as tear-off ticket stubs on a distinctly different paper stock — a deliberate two-layer physical composition (plastic credential above, paper stubs below).
- **Details**
  - SVG guilloché watermark (two rosettes + moiré lines) sits behind the wordmark on the credential.
  - The specular sheen slides across the foil edge exactly once per musical bar.
  - Perforation dots on the tear-off edge of every stub are drawn as pseudo-elements that punch through to the venue background — so the stub really looks torn from a fanfold sheet.
  - The Now Playing progress bar is styled as a magnetic security strip (subtle tape hatching, difference-blend timecodes so they stay legible over the holo fill).
  - Every third stub gets a small holographic foil corner on its thumb (like real backstage credentials that mix foil and non-foil stock for access tiers).
  - A hand-drawn barcode SVG in the footer disclaimer.

## BPM / energy mapping (honest reactivity)

The prototype clocks off a fixed **BPM = 124** (peak-time house, matching the
Coachella / Boiler Room reference culture) and **ENERGY = 0.78** to drive:

- `--beat-ms: 484ms` (`60000 / 124`) — the tempo of every synchronous animation
- `--bar-ms: 1936ms` (four beats) — the phrase length

Six things react to the beat:

1. **Lanyard sway** — the whole card rotates ±0.9° over one bar (`@keyframes sway`).
2. **Holo drift** — the prismatic foil edge shifts hue and background position over one bar (`@keyframes holo-drift`).
3. **Specular sheen** — a diagonal highlight sweeps across the foil once per bar (`@keyframes sheen`).
4. **LIVE dot pulse** — the magenta status dots on the MAIN STAGE and TEMPO chip scale up on every downbeat (`@keyframes pulse-dot`).
5. **Cursor blink** — the caret in the ADD-GUEST terminal blinks once per beat (`@keyframes blink`).
6. **Rotating conic halo** — the soft holographic glow behind the main-stage credential rotates over four bars (`@keyframes rotate-holo`).

The energy value (0.78) also lights up 7/10 segments in the ENERGY chip's
segmented bar, with the last two hot-orange because the value is above the 0.7
"high-energy" threshold.

### Production wiring

In the real Cortex / Pass-the-Aux app these constants are **not** constants.
The beat clock is derived per-track from **ReccoBeats `/track/{id}` tempo** (a
real BPM number from the audio analysis of the currently-playing Spotify
track) combined with the **live playhead position** so downbeats land on the
actual downbeats of the song. `ENERGY` comes from Spotify's audio features
`energy` field (0.0–1.0) for the same track. On every `track_change` event
the runtime does:

```js
document.documentElement.style.setProperty(
  '--beat-ms', (60_000 / track.tempo).toFixed(0) + 'ms');
document.documentElement.style.setProperty(
  '--bar-ms',  (60_000 / track.tempo * 4).toFixed(0) + 'ms');
```

and every synchronous animation above re-latches to the new tempo without
touching JS timers. No fake FFT, no synthesized waveforms — the reactivity is
honest: it comes from the track's own published tempo and energy metadata.
