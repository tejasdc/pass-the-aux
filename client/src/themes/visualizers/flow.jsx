import { useEffect, useRef } from 'react';
import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './flow.css';

// A single fixed seed — every mount reproduces the same particle field & respawn stream.
const SEED = 0x9e3779b1;

// xorshift32 — one seeded generator, shared by particle init and respawn.
// Nothing else calls Math.random inside the RAF loop, so playback is deterministic.
function makeRng(seed) {
  let s = seed | 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296);
  };
}

// Cheap hash-based 2D value noise. Two octaves are enough for a plotter-ink field
// and cost almost nothing per particle per frame.
function hash2(ix, iy) {
  let h = (ix * 374761393) ^ (iy * 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function smooth(t) { return t * t * (3 - 2 * t); }
function noise2(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const sx = smooth(xf);
  const sy = smooth(yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  const top = a + sx * (b - a);
  const bot = c + sx * (d - c);
  return top + sy * (bot - top);
}

// Warm-paper palette — resolves the theme design tokens to concrete strokes.
// One accent hue at a time; amber is punctuation.
const PAPER = '#ece4d1';
const PAPER_RGB = '236, 228, 209';
const INK_PRIMARY = 'rgba(20, 17, 13, 0.55)';
const INK_SECONDARY = 'rgba(36, 29, 22, 0.42)';
const INK_SOFT = 'rgba(61, 51, 39, 0.30)';
const CORAL = 'rgba(204, 74, 43, 0.62)';
const AMBER = 'rgba(201, 146, 46, 0.55)';

function FlowVisualizer({ track }) {
  const isPaused = useMotionPaused();
  const { hasBeat, style } = useBeatStyle(track);
  const motionState = hasBeat && !isPaused ? 'running' : 'paused';
  const active = motionState === 'running';

  const canvasRef = useRef(null);
  const stateRef = useRef({});

  const bpm = Number(track?.audioFeatures?.bpm);
  const energy = Number(track?.audioFeatures?.energy);

  // Mount effect: sets up canvas, ResizeObserver, and the seeded particle field.
  // Runs once per mount; the RAF loop lives in the second effect so it can gate
  // cleanly on the active flag without wiping the field.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const parent = canvas.parentElement;
    if (!parent) return undefined;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return undefined;

    const rng = makeRng(SEED);
    const state = stateRef.current;
    state.rng = rng;
    state.canvas = canvas;
    state.ctx = ctx;
    state.particles = null;
    state.beatPulse = 0;
    state.barPulse = 0;
    state.noiseZ = rng() * 100;
    state.beatPhase = 0;
    state.beatIndex = 0;
    state.fieldRot = 0;
    state.lastFrame = 0;
    state.dpr = Math.min(2, window.devicePixelRatio || 1);
    state.width = 0;
    state.height = 0;

    function seedParticles() {
      const { width, height } = state;
      if (!width || !height) return;
      const density = Math.min(680, Math.max(160, Math.floor(width * height / 950)));
      const list = new Array(density);
      for (let i = 0; i < density; i++) {
        list[i] = {
          x: rng() * width,
          y: rng() * height,
          life: rng() * 220 + 80,
          shade: rng(), // permanent palette bucket
        };
      }
      state.particles = list;
    }

    function paintPaper() {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, state.width, state.height);
    }

    function resize() {
      const rect = parent.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      if (w === state.width && h === state.height) return;
      state.width = w;
      state.height = h;
      canvas.width = Math.floor(w * state.dpr);
      canvas.height = Math.floor(h * state.dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      paintPaper();
      seedParticles();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    return () => {
      ro.disconnect();
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    };
  }, []);

  // RAF loop, keyed on active + bpm + energy so tempo/energy changes reshape the
  // field but pause/resume never wipes the drawing.
  useEffect(() => {
    const state = stateRef.current;
    const ctx = state.ctx;
    if (!ctx) return undefined;

    if (!active) {
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.rafId = 0;
      state.lastFrame = 0;
      return undefined;
    }

    const beatMs = Number.isFinite(bpm) && bpm > 0 ? 60000 / bpm : 476; // fallback ≈ 126 BPM
    const clampedEnergy = Number.isFinite(energy) ? Math.max(0, Math.min(1, energy)) : 0.6;
    state.beatMs = beatMs;
    state.energy = clampedEnergy;

    function step(now) {
      const dt = state.lastFrame ? Math.min(64, now - state.lastFrame) : 16;
      state.lastFrame = now;
      const w = state.width;
      const h = state.height;
      const parts = state.particles;
      if (!w || !h || !parts) {
        state.rafId = requestAnimationFrame(step);
        return;
      }

      // Advance the beat clock in whole-beat increments so tempo lock is exact
      // regardless of the browser's frame cadence.
      state.beatPhase += dt;
      while (state.beatPhase >= state.beatMs) {
        state.beatPhase -= state.beatMs;
        state.beatPulse = 1;
        state.noiseZ += 0.16 + state.energy * 0.26;
        state.beatIndex = (state.beatIndex + 1) & 3;
        if (state.beatIndex === 0) {
          // Every bar: nudge the field's directional bias — a subtle heading
          // shift, alternating sign so the drawing never drifts monotonically.
          state.barPulse = 1;
          state.fieldRot += (Math.PI / 22) * ((state.beatIndex + Math.floor(state.noiseZ)) & 1 ? 1 : -1);
        }
      }
      // Frame-rate-independent decay (Casey Reas / Robert Hodgin style envelopes).
      state.beatPulse *= Math.pow(0.9938, dt);
      state.barPulse *= Math.pow(0.9972, dt);
      state.noiseZ += 0.00035 * dt * (0.4 + state.energy);

      // Translucent paper wash: trails linger ~1s at low energy, ~0.6s at high.
      const washAlpha = 0.09 + state.energy * 0.09;
      ctx.fillStyle = `rgba(${PAPER_RGB}, ${washAlpha})`;
      ctx.fillRect(0, 0, w, h);

      // Bar downbeat: a single radial coral wash from upper-center. One gradient
      // per bar — cheap and gives the page a "breath" without competing with the ink.
      if (state.barPulse > 0.02) {
        const cx = w * 0.5;
        const cy = h * 0.3;
        const r = Math.max(w, h) * (0.32 + state.barPulse * 0.35);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(204, 74, 43, ${0.09 * state.barPulse})`);
        g.addColorStop(1, 'rgba(204, 74, 43, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // Drift envelope: base drift plus a brief per-beat surge, all scaled by energy.
      const flowAmp = 0.55 + state.beatPulse * (0.5 + state.energy * 0.55);
      const speed = 0.6 + state.energy * 0.9;
      const noiseScale = 0.0058;
      const angleGain = Math.PI * 2 * 1.35;
      const zx = state.noiseZ * 0.31;
      const zy = state.noiseZ * 0.24;
      const rot = state.fieldRot;

      ctx.lineWidth = 1;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const nx = p.x * noiseScale + zx;
        const ny = p.y * noiseScale + zy;
        // Two-octave value noise: coarse for the overall current, fine for texture.
        const n1 = noise2(nx, ny);
        const n2 = noise2(nx * 2.03 + 17.1, ny * 2.03 + 31.7);
        const n = n1 * 0.65 + n2 * 0.35;
        const theta = (n - 0.5) * angleGain + rot;

        const px = p.x;
        const py = p.y;
        const dx = Math.cos(theta) * speed * flowAmp;
        const dy = Math.sin(theta) * speed * flowAmp;
        const nxp = px + dx;
        const nyp = py + dy;

        // Palette bucket is fixed per particle at seed time — the coral/amber
        // ratios stay stable across a mount (Zach Lieberman restraint rule).
        let stroke;
        if (p.shade < 0.028) stroke = CORAL;
        else if (p.shade < 0.048) stroke = AMBER;
        else if (p.shade < 0.42) stroke = INK_PRIMARY;
        else if (p.shade < 0.78) stroke = INK_SECONDARY;
        else stroke = INK_SOFT;

        ctx.strokeStyle = stroke;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nxp, nyp);
        ctx.stroke();

        p.x = nxp;
        p.y = nyp;
        p.life -= 1;

        if (p.life <= 0 || nxp < -4 || nxp > w + 4 || nyp < -4 || nyp > h + 4) {
          // Respawn from the seeded RNG so density stays fixed and the stream is
          // reproducible from mount time.
          p.x = state.rng() * w;
          p.y = state.rng() * h;
          p.life = state.rng() * 220 + 80;
          // shade is a permanent trait; do not re-roll or the accent ratios drift.
        }
      }

      state.rafId = requestAnimationFrame(step);
    }

    state.rafId = requestAnimationFrame(step);

    return () => {
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.rafId = 0;
      state.lastFrame = 0;
    };
  }, [active, bpm, energy]);

  return (
    <div
      className="flow-visualizer"
      style={{ ...style, '--theme-motion-state': motionState }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="flow-viz-canvas" />
    </div>
  );
}

export default FlowVisualizer;
