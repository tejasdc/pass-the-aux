import { useEffect, useRef } from 'react';
import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './winamp.css';

// Classic Winamp 2.x fire spectrum: 22 bars is authentic.
const BAR_COUNT = 22;

// Per-bar envelope: bass hump on the left, mid dip, high shelf on the right —
// the shape of a house/tech-house record. Pure lookup, computed once.
const ENVELOPE = (() => {
  const out = new Array(BAR_COUNT);
  for (let i = 0; i < BAR_COUNT; i++) {
    const t = i / (BAR_COUNT - 1);
    const bass = Math.exp(-Math.pow((t - 0.05) / 0.18, 2));
    const mid = 0.65 * Math.exp(-Math.pow((t - 0.42) / 0.16, 2));
    const high = 0.55 * Math.exp(-Math.pow((t - 0.82) / 0.2, 2));
    out[i] = Math.min(1, bass + mid + high);
  }
  return out;
})();

// Deterministic per-bar phase offset so bars don't move in lockstep.
const SEEDS = Array.from({ length: BAR_COUNT }, (_, i) => (i * 9301 + 49297) % 233280 / 233280);

// Kick envelope on bass, 16th hats on treble, per-beat.
function beatIntensity(phase, i) {
  const kick = Math.pow(1 - phase, 4);
  const hat = Math.pow(Math.max(0, Math.sin(Math.PI * 4 * phase)), 6);
  const t = i / (BAR_COUNT - 1);
  const kickMask = Math.exp(-Math.pow(t / 0.35, 2));
  const hatMask = 0.6 * Math.exp(-Math.pow((t - 0.85) / 0.2, 2));
  return kickMask * kick * 1.15 + hatMask * hat + 0.2;
}

function WinampVisualizer({ track }) {
  const isPaused = useMotionPaused();
  const { hasBeat, beatMs, style } = useBeatStyle(track);
  const motionState = hasBeat && !isPaused ? 'running' : 'paused';

  const wrapRef = useRef(null);
  const barsWrapRef = useRef(null);
  const barRefs = useRef([]);
  const peakRefs = useRef([]);
  const canvasRef = useRef(null);

  // Persist bar state across RAF re-mounts so heights don't snap on tempo change.
  const stateRef = useRef({
    heights: new Array(BAR_COUNT).fill(4),
    peaks: new Array(BAR_COUNT).fill(0),
    peakTs: new Array(BAR_COUNT).fill(0),
  });

  useEffect(() => {
    if (motionState !== 'running') {
      // Paused — do not schedule; bars settle at their last positions.
      return undefined;
    }

    const canvas = canvasRef.current;
    const barsWrap = barsWrapRef.current;
    if (!canvas || !barsWrap) return undefined;

    const ctx = canvas.getContext('2d');
    let dpr = 1;

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(canvas);

    // Track-aware envelope inputs.
    const bpmMs = Number.isFinite(beatMs) && beatMs > 0 ? beatMs : 500;
    const energyRaw = Number(track?.audioFeatures?.energy);
    const energy = Number.isFinite(energyRaw)
      ? Math.max(0.2, Math.min(1, energyRaw))
      : 0.6;
    // Align phase to the song's own beat clock so the visualizer downbeat
    // roughly matches the LCD colon and header pulse elsewhere in the app.
    const progressMs = Number(track?.progress_ms) || 0;

    const state = stateRef.current;
    let raf = 0;
    let cancelled = false;

    const tick = (now) => {
      if (cancelled) return;

      // `now` is monotonic ms since page load; adding progressMs roughly
      // aligns our downbeat to the song's actual position at mount.
      const phase = ((now + progressMs) % bpmMs) / bpmMs;

      // Measure once per frame — the stage can resize (mobile → landscape).
      const usableH = Math.max(24, barsWrap.clientHeight - 4);

      for (let i = 0; i < BAR_COUNT; i++) {
        const env = ENVELOPE[i];
        const bi = beatIntensity(phase, i);
        const jitter = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(now * 0.006 + SEEDS[i] * 6.28 + i));
        const target = env * bi * jitter * energy;
        const raw = Math.max(3, Math.min(usableH, target * usableH));
        // Smooth to the target — mimics the mechanical inertia of an LED meter.
        state.heights[i] += (raw - state.heights[i]) * 0.55;

        const barEl = barRefs.current[i];
        if (barEl) barEl.style.height = `${state.heights[i].toFixed(1)}px`;

        // Peak-hold cap: snaps up instantly, holds ~120ms, then falls at 40 px/s.
        if (state.heights[i] > state.peaks[i]) {
          state.peaks[i] = state.heights[i];
          state.peakTs[i] = now;
        } else {
          const dt = (now - state.peakTs[i]) / 1000;
          const drop = Math.max(0, dt - 0.12) * 40;
          state.peaks[i] = Math.max(state.heights[i], state.peaks[i] - drop * 0.016);
          state.peakTs[i] = now;
        }
        const peakEl = peakRefs.current[i];
        if (peakEl) {
          // Peak cap sits above the bar — offset by bar height so it rides on top.
          peakEl.style.transform = `translateY(${(-state.peaks[i]).toFixed(1)}px)`;
        }
      }

      // Oscilloscope — sum of three sine bands with a beat-driven kick punch.
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w && h) {
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(123, 255, 92, 0.9)';
        ctx.shadowColor = 'rgba(123, 255, 92, 0.85)';
        ctx.shadowBlur = 3;
        const kick = Math.pow(1 - phase, 3) * 0.9 * energy;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 1) {
          const t = x / w;
          const sub = Math.sin(t * Math.PI * 6 + now * 0.01) * 0.35;
          const midWave = Math.sin(t * Math.PI * 22 + now * 0.02) * 0.2 * (0.6 + kick);
          const hi = Math.sin(t * Math.PI * 60 + now * 0.055) * 0.1 * (0.4 + kick * 0.8);
          const y = h / 2 + (sub + midWave + hi) * h * 0.45 * (0.55 + kick * 0.7);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, [motionState, beatMs, track?.audioFeatures?.energy, track?.progress_ms]);

  return (
    <div
      ref={wrapRef}
      className="winamp-visualizer"
      style={{ ...style, '--theme-motion-state': motionState }}
      aria-hidden="true"
    >
      <div className="winamp-viz-bevel" />
      <div className="winamp-viz-scan" />
      <div className="winamp-viz-bars" ref={barsWrapRef}>
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <div className="winamp-bar-slot" key={i}>
            <span
              className="winamp-bar"
              ref={(el) => {
                barRefs.current[i] = el;
              }}
            />
            <span
              className="winamp-peak"
              ref={(el) => {
                peakRefs.current[i] = el;
              }}
            />
          </div>
        ))}
      </div>
      <canvas className="winamp-viz-osc" ref={canvasRef} />
    </div>
  );
}

export default WinampVisualizer;
