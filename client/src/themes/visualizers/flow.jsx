import { useEffect, useRef } from 'react';
import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './flow.css';

// Analytic plotter currents: a complete first frame even with reduced motion,
// and no accumulated timing drift when a phone drops frames.
function FlowVisualizer({ track }) {
  const paused = useMotionPaused();
  const { hasBeat, beatMs, style } = useBeatStyle(track);
  const canvasRef = useRef(null);
  const clock = useRef({ progress: 0, sampledAt: 0 });
  const progress = Number(track?.progress_ms) || 0;
  const energy = style['--track-energy'];

  useEffect(() => {
    clock.current = { progress, sampledAt: performance.now() };
  }, [track, progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!ctx) return undefined;
    let raf = 0;
    let lastFrame = -Infinity;
    let width = 1;
    let height = 1;
    const active = hasBeat && !paused;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    function draw(now) {
      const elapsed = active ? now - clock.current.sampledAt : 0;
      const beats = beatMs ? (clock.current.progress + elapsed) / beatMs : 0;
      const pulse = Math.exp(-(beats % 1) * 5);
      const drift = beats * .12;
      ctx.fillStyle = '#ece4d1';
      ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 1.3 + energy * .7;
      // 44 continuous currents, 65 vertices each: bounded at every viewport.
      for (let line = 0; line < 44; line++) {
        const band = line / 43;
        ctx.strokeStyle = line >= 16 && line <= 23 ? '#bb3e25' : '#242d28';
        ctx.beginPath();
        for (let point = 0; point <= 64; point++) {
          const x = point / 64;
          const envelope = Math.sin(x * Math.PI);
          const wave = Math.sin(x * 7.5 + band * 3 + drift);
          const fold = Math.sin(x * 12 - band * 4 - drift * .7);
          const y = .08 + band * .84 + envelope * (
            wave * (.13 + energy * .05 + pulse * (.025 + energy * .065)) + fold * .065
          );
          if (point === 0) ctx.moveTo(x * width, y * height);
          else ctx.lineTo(x * width, y * height);
        }
        ctx.stroke();
      }
    }
    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    }
    function step(now) {
      // 30fps halves canvas work on 60Hz phones without losing the beat attack.
      if (now - lastFrame >= 1000 / 30 - 1) {
        draw(now);
        lastFrame = now;
      }
      raf = requestAnimationFrame(step);
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement);
    if (active) raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, [hasBeat, beatMs, energy, paused]);

  return (
    <div className="flow-visualizer" style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="flow-viz-canvas" />
    </div>
  );
}
export default FlowVisualizer;
