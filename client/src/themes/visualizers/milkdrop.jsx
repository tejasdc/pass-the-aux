import { useEffect, useRef } from 'react';
import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './milkdrop.css';

/**
 * MilkdropVisualizer — Winamp/Milkdrop-era psychedelic plasma.
 *
 * Real <canvas> rendering:
 *   1. Feedback tunnel  — draw last frame scaled + slowly rotated onto itself
 *   2. Dark fade        — 10% alpha of near-black to keep feedback from
 *                         accumulating to white
 *   3. Plasma field     — per-pixel color equation (three layered sines +
 *                         radial + atan swirl) on a low-res buffer, upscaled
 *                         with `screen` blend so the interpolation IS the blur
 *   4. Superscope       — Milkdrop-style layered-sine waveform slicing the
 *                         middle: soft 6px outer glow + sharp 1.5px inner,
 *                         drawn with `lighter` composite
 *   5. Downbeat burst   — radial gradient overlay on the first beat of every
 *                         four-beat bar (barPos === 0)
 *
 * All motion phase-locks to the real BPM via `useBeatStyle(track)`. When
 * `hasBeat` is false, the tab is hidden, or reduced-motion is requested,
 * `useMotionPaused()` returns true and we stop the RAF loop entirely (one
 * static frame remains on the canvas so the stage isn't empty).
 *
 * NO fake FFT. NO real audio. Beat clock is derived from track.audioFeatures.
 */

// Fast HSV → RGBA (byte-packed). h, s, v in [0..1]. alpha kept low so
// `screen` blend of the upscaled plasma reads as a color glow instead of a
// solid slab.
function hsvToRgba(h, s, v, out, off) {
  const i = (h * 6) | 0;
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r;
  let g;
  let b;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q; break;
  }
  out[off]     = (r * 255) | 0;
  out[off + 1] = (g * 255) | 0;
  out[off + 2] = (b * 255) | 0;
  out[off + 3] = 60;
}

function MilkdropVisualizer({ track }) {
  const isPaused = useMotionPaused();
  const { hasBeat, beatMs, style } = useBeatStyle(track);
  const motionState = hasBeat && !isPaused ? 'running' : 'paused';

  const canvasRef = useRef(null);

  // Reactive params captured in refs so the RAF loop reads live values
  // without tearing down and rebuilding the effect on every progress tick.
  const energyRef = useRef(0);
  const beatMsRef = useRef(null);
  energyRef.current = Number(track?.audioFeatures?.energy) || 0;
  beatMsRef.current = beatMs;

  // Anchor the beat clock on the actual track progress so downbeats line up
  // with real song beats (not just wall-clock). The song id is stable per
  // track, so we only re-anchor when the song changes — not on every render.
  const trackId = track?.id ?? null;
  const progressMs = Number(track?.progress_ms) || 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return undefined;

    // --- Low-res plasma buffer ---------------------------------------------
    // We compute the color field at ~128 across (aspect-scaled height) and
    // let the canvas upscale it with bilinear filtering. That upscale IS the
    // gradient blur — we get glow "for free" and stay 60fps on mobile.
    const PW = 128;
    let PH = 128;
    const plasma = document.createElement('canvas');
    plasma.width = PW;
    plasma.height = PH;
    const pctx = plasma.getContext('2d');
    let plasmaImg = pctx.createImageData(PW, PH);

    // --- Sin lookup table --------------------------------------------------
    // Per-pixel plasma calls fsin() many times per frame; a 1024-entry LUT
    // is a real win on cheap phones.
    const SINLUT = new Float32Array(1024);
    for (let i = 0; i < 1024; i += 1) {
      SINLUT[i] = Math.sin((i / 1024) * Math.PI * 2);
    }
    const fsin = (x) => SINLUT[((x * 162.9746617) | 0) & 1023];

    // --- Canvas sizing (DPR-capped, ResizeObserver-driven) -----------------
    let W = 0;
    let H = 0;
    let DPR = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(rect.width * DPR));
      H = Math.max(1, Math.round(rect.height * DPR));
      canvas.width = W;
      canvas.height = H;
      PH = Math.max(48, Math.round(PW * (H / W)));
      plasma.height = PH;
      plasmaImg = pctx.createImageData(PW, PH);
      ctx.fillStyle = '#04040a';
      ctx.fillRect(0, 0, W, H);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // --- Beat clock --------------------------------------------------------
    // START is the wall-clock instant at which our elapsed=0 point sits.
    // Anchoring to `-progressMs` means (performance.now() - START) equals the
    // actual song position, so downbeats fall on real beats.
    const START = performance.now() - progressMs;

    const drawScope = (t, beat) => {
      const N = 220;
      const midY = H * 0.5;
      const energy = energyRef.current;
      // Amplitude grows with energy; on the downbeat it punches out
      // toward the top/bottom of the stage.
      const baseAmp = H * (0.11 + energy * 0.06);
      const punchAmp = H * (0.08 + energy * 0.09) * beat;
      // Harmonic count follows energy (design: `high` doubles harmonics).
      const harm2 = 10 + energy * 6;
      const harm3 = 20 + energy * 12;
      for (let i = 0; i <= N; i += 1) {
        const p = i / N;
        const x = p * W;
        // sin(πp) window envelope so the scope tapers at both edges
        // instead of clipping the stage.
        const env = Math.sin(p * Math.PI);
        const y = midY
          + Math.sin(p * Math.PI * harm2 + t * 4.2) * (baseAmp + punchAmp) * env
          + Math.sin(p * Math.PI * harm3 - t * 6.5) * (H * 0.03) * env
          + Math.sin(p * Math.PI * 2 + t * 1.2) * (H * 0.05);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    };

    let rafId = 0;

    const render = (now) => {
      rafId = requestAnimationFrame(render);
      if (document.hidden) return;
      if (!W || !H) return;
      const bpmClock = beatMsRef.current;
      if (!bpmClock) return;

      const elapsed = now - START;
      const t = elapsed / 1000;
      const beatIdx = Math.floor(elapsed / bpmClock);
      const bp = (elapsed % bpmClock) / bpmClock;         // 0 → 1 within beat
      // Fast-attack, exponential-decay pulse envelope.
      // 1.0 on the downbeat, decaying toward 0 before the next.
      const beat = (1 - bp) ** 3.5;
      const barPos = ((beatIdx % 4) + 4) % 4;
      const energy = energyRef.current;

      // 1. Feedback tunnel — self-draw scaled + slowly rotated. This is the
      //    Milkdrop "warp mesh" reduced to its most honest form: the previous
      //    frame IS the current frame, drifted a hair outward each tick, so
      //    every bright pixel traces a spiral until it fades.
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.translate(W / 2, H / 2);
      const zoom = 1.018 + beat * 0.035 * (0.5 + energy * 0.7);
      ctx.scale(zoom, zoom);
      ctx.rotate(fsin(t * 0.15) * 0.012 * (0.5 + energy) + fsin(t * 0.5) * 0.004);
      ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();

      // 2. Dark fade so the feedback loop doesn't clip to white.
      ctx.fillStyle = 'rgba(3, 3, 8, 0.10)';
      ctx.fillRect(0, 0, W, H);

      // 3. Plasma color field.
      const px = plasmaImg.data;
      const cx = PW * 0.5;
      const cy = PH * 0.5;
      // Hue advances one small step per beat — the whole plasma slowly
      // walks the color wheel through the track, never sitting on one hue.
      const hueBase = (t * 0.05 + beatIdx * 0.014) % 1;
      const satFloor = 0.85;
      const harmMul = 1 + energy * 0.5;
      for (let y = 0; y < PH; y += 1) {
        const v = (y - cy) / PH;
        for (let x = 0; x < PW; x += 1) {
          const u = (x - cx) / PW;
          const r = Math.sqrt(u * u + v * v);
          const a = Math.atan2(v, u);
          // Three layered wave equations: radial swirl (w1), grid (w2),
          // diagonal drift (w3). This trio is the classic Milkdrop shape.
          const w1 = fsin(r * 14 - t * 2.1 + fsin(a * 3 + t * 0.9) * 2.2);
          const w2 = fsin(u * 9 * harmMul + t * 1.6) + fsin(v * 9 * harmMul - t * 1.4);
          const w3 = fsin((u + v) * 6.5 + t * 0.7);
          const val = (w1 * 0.55) + (w2 * 0.30) + (w3 * 0.35);
          const h = (hueBase + val * 0.35 + r * 0.55) % 1;
          const s = satFloor + beat * 0.15;
          const vv = 0.55 + Math.max(0, val) * 0.30 + beat * 0.20;
          hsvToRgba((h + 1) % 1, s, Math.min(1, vv), px, (y * PW + x) * 4);
        }
      }
      pctx.putImageData(plasmaImg, 0, 0);
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(plasma, 0, 0, W, H);

      // 4. Superscope — two passes for the classic Winamp look:
      //    outer 6px halo (35% alpha) + sharp 1.5px inner line at 88% light.
      ctx.globalCompositeOperation = 'lighter';
      const strokeHue = (t * 30 + beatIdx * 6) % 360;

      ctx.beginPath();
      ctx.lineWidth = 6 * DPR;
      ctx.strokeStyle = `hsla(${strokeHue}, 100%, 60%, 0.35)`;
      drawScope(t, beat);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = 1.5 * DPR;
      ctx.strokeStyle = `hsl(${(strokeHue + 40) % 360}, 100%, 88%)`;
      drawScope(t, beat);
      ctx.stroke();

      // 5. Downbeat burst — brief radial flash on the first beat of every
      //    four-beat bar. Intensity scales with energy so LO tracks
      //    breathe and HI tracks slam.
      if (barPos === 0 && bp < 0.15) {
        const rad = (0.15 - bp) / 0.15;
        const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.55 * rad);
        const intensity = 0.35 * rad * (0.5 + energy * 0.9);
        g.addColorStop(0, `hsla(${strokeHue}, 100%, 72%, ${intensity})`);
        g.addColorStop(0.55, `hsla(${(strokeHue + 60) % 360}, 100%, 60%, ${0.10 * rad})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.globalCompositeOperation = 'source-over';
    };

    // Seed the first frame so the feedback loop has pixels to work with.
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, canvas.width || 300, canvas.height || 200);

    if (hasBeat && !isPaused) {
      rafId = requestAnimationFrame(render);
    } else {
      // Paused / no beat: leave a single quiet frame on the stage.
      const beatIdx = 0;
      const t = 0;
      const beat = 0;
      const px = plasmaImg.data;
      const cx = PW * 0.5;
      const cy = PH * 0.5;
      const hueBase = 0.72;
      for (let y = 0; y < PH; y += 1) {
        const v = (y - cy) / PH;
        for (let x = 0; x < PW; x += 1) {
          const u = (x - cx) / PW;
          const r = Math.sqrt(u * u + v * v);
          const val = fsin(r * 8) * 0.5;
          hsvToRgba(
            (hueBase + val * 0.2 + r * 0.4 + 1) % 1,
            0.6,
            0.35 + Math.max(0, val) * 0.15,
            px,
            (y * PW + x) * 4,
          );
        }
      }
      pctx.putImageData(plasmaImg, 0, 0);
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(plasma, 0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      // Silence lint: single-frame paused state doesn't advance the beat clock.
      void beatIdx; void t; void beat;
    }

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
    // Re-anchor & restart the loop when the song changes, tempo changes,
    // pause state flips, or beat availability flips. `progressMs` is
    // intentionally captured only on song change — mid-song progress ticks
    // read live via refs so the visualizer never restarts mid-track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, hasBeat, isPaused]);

  return (
    <div
      className="milkdrop-visualizer"
      style={{ ...style, '--theme-motion-state': motionState }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="milkdrop-viz-canvas" />
    </div>
  );
}

export default MilkdropVisualizer;
