import { useEffect, useRef } from 'react';
import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './cathode-vectorscope.css';

// Classic Lissajous ratios — the figure "settles" on musical downbeats
// as the phrase clock cycles through these on 16-beat phrases.
const LISSAJOUS_RATIOS = [
  [3, 2],
  [4, 3],
  [5, 4],
  [5, 3],
];
const PHRASE_BEATS = 16;

function CathodeVisualizer({ track }) {
  const isPaused = useMotionPaused();
  const { hasBeat, style } = useBeatStyle(track);
  const motionState = hasBeat && !isPaused ? 'running' : 'paused';

  const bpm = Number(track?.audioFeatures?.bpm) || 0;
  const energy = Number(track?.audioFeatures?.energy) || 0;
  const progressMs = Number(track?.progress_ms) || 0;

  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const DPR = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    const running = motionState === 'running' && bpm > 0;
    const beatMs = bpm > 0 ? 60000 / bpm : 0;

    // Song-time origin: playhead at mount, then advance by wall-clock delta.
    // This keeps the beat envelope phase-locked to the actual track position.
    const mountedAt = performance.now();
    const songOrigin = progressMs;

    function fit() {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width * DPR));
      const h = Math.max(1, Math.floor(rect.height * DPR));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      // Seed dark so first frame doesn't flash — mimics CRT warm-up.
      ctx.fillStyle = '#010f08';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    fit();

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(fit);
      ro.observe(canvas);
    }

    let raf = 0;

    function drawStatic() {
      // Static Lissajous 3:2 at nominal amplitude — what a real scope shows
      // when given a stable signal but no modulation.
      fit();
      renderTrace({
        t: 0,
        beat: 1,
        ratio: [3, 2],
        rot: 0,
        jitter: 0,
        env: 0,
        headBrightness: 0.55,
      });
    }

    function renderTrace({ t, beat, ratio, rot, jitter, env, headBrightness }) {
      const w = canvas.width;
      const h = canvas.height;
      const [a, b] = ratio;

      // Phosphor decay — semi-transparent dark rectangle each frame.
      // This is the P1 CRT persistence: trace fades in place, doesn't clear.
      ctx.fillStyle = 'rgba(1, 15, 8, 0.18)';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      // 0.42 keeps the trace inside the graticule margin on wide stages.
      const R = Math.min(w, h) * 0.42 * beat;

      // δ (phase delta between x and y) drifts slowly so the figure
      // opens/closes rather than sitting frozen — a real XY scope shows
      // this when the two oscillators are not perfectly locked.
      const delta = (t / 4200) % (Math.PI * 2);

      const STEPS = 720;
      const cs = Math.cos(rot);
      const sn = Math.sin(rot);

      ctx.lineWidth = Math.max(1.1, 1.3 * DPR);
      ctx.strokeStyle = 'rgba(127, 255, 156, 0.86)';
      ctx.shadowBlur = 10 * DPR;
      ctx.shadowColor = 'rgba(127, 255, 156, 0.55)';
      ctx.beginPath();

      for (let i = 0; i <= STEPS; i++) {
        const p = (i / STEPS) * Math.PI * 2;
        const x0 = Math.sin(a * p + delta);
        const y0 = Math.sin(b * p);
        const xr = x0 * cs - y0 * sn;
        const yr = x0 * sn + y0 * cs;
        const px = cx + xr * R + jitter;
        // Slight vertical squash keeps the figure inside the wide stage.
        const py = cy + yr * R * 0.82;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Electron beam-head — the bright dot that "leads" the trace.
      // Position walks forward on the parametric curve with energy.
      const headP = Math.PI * 2 * (0.02 + env * 0.06);
      const hx0 = Math.sin(a * headP + delta);
      const hy0 = Math.sin(b * headP);
      const hx = cx + (hx0 * cs - hy0 * sn) * R + jitter;
      const hy = cy + (hx0 * sn + hy0 * cs) * R * 0.82;

      ctx.beginPath();
      ctx.fillStyle = `rgba(220, 255, 225, ${0.75 + headBrightness * 0.2})`;
      ctx.shadowBlur = 16 * DPR;
      ctx.shadowColor = 'rgba(180, 255, 200, 0.9)';
      ctx.arc(hx, hy, Math.max(1.6, 2.1 * DPR), 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    }

    if (!running) {
      drawStatic();
      return () => {
        if (ro) ro.disconnect();
      };
    }

    function beatEnv(songMs) {
      if (beatMs <= 0) return 0;
      const phase = (songMs % beatMs) / beatMs;
      // Sharp attack, exponential-ish decay across the beat.
      return Math.pow(1 - phase, 2.2);
    }

    function draw(now) {
      // Song-time = playhead-at-mount + wall-clock delta.
      const songMs = songOrigin + (now - mountedAt);

      const beatIdx = Math.floor(songMs / beatMs);
      const phraseIdx = Math.floor(beatIdx / PHRASE_BEATS) % LISSAJOUS_RATIOS.length;
      const ratio = LISSAJOUS_RATIOS[phraseIdx];

      const env = beatEnv(songMs);
      // Base 0.85R, plus up to 0.35R of pulse scaled by track energy.
      const beat = 0.85 + env * 0.35 * energy;

      // CRT tells: slow whole-figure rotation + tiny horizontal wobble.
      const rot = songMs / 6500;
      const jitter = (Math.sin(songMs / 37) + Math.sin(songMs / 91)) * 0.4;

      renderTrace({ t: songMs, beat, ratio, rot, jitter, env, headBrightness: env });

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, [motionState, bpm, energy, progressMs]);

  const tempoLabel = track?.audioFeatures?.estimated ? 'HOUSE BEAT' : `${Math.round(bpm)} BPM`;
  const chipLabel = hasBeat && bpm > 0 ? `LIVE · ${tempoLabel}` : 'STANDBY · NO SIGNAL';

  return (
    <div
      className="cathode-visualizer"
      style={{ ...style, '--theme-motion-state': motionState }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="cathode-canvas"></canvas>
      <div className="cathode-graticule"></div>
      <div className="cathode-chip" data-live={hasBeat ? 'true' : 'false'}>
        <span className="cathode-chip-dot"></span>
        <span className="cathode-chip-label">{chipLabel}</span>
      </div>
      <div className="cathode-foot">
        <span>XY · LISSAJOUS</span>
        <span>2V/DIV · 5ms/DIV · P1 PHOSPHOR</span>
      </div>
    </div>
  );
}

export default CathodeVisualizer;
