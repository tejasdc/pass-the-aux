import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './holo-laminate-pass.css';

const GLINT_COUNT = 9;

function HoloVisualizer({ track }) {
  const isPaused = useMotionPaused();
  const { hasBeat, style } = useBeatStyle(track);
  const motionState = hasBeat && !isPaused ? 'running' : 'paused';

  return (
    <div
      className="holo-visualizer"
      style={{ ...style, '--theme-motion-state': motionState }}
      aria-hidden="true"
    >
      {/* Jet laminate substrate + inner bevel */}
      <div className="holo-viz-plate" />

      {/* Prismatic banding — the tell of a real hologram.
          Two overlapping clusters (hot magenta / cool cyan) drift on the bar. */}
      <div className="holo-viz-band holo-viz-band--magenta" />
      <div className="holo-viz-band holo-viz-band--cyan" />

      {/* Fine spectrum grating — the parallel lines every hologram has */}
      <div className="holo-viz-grating" />

      {/* Guilloché security watermark, etched under the surface */}
      <div className="holo-viz-guilloche" />

      {/* The signature: a specular sheen bar that sweeps once per musical bar */}
      <div className="holo-viz-sheen" />

      {/* Beat-locked specular glints — tiny catchlights on downbeats */}
      <div className="holo-viz-glints">
        {Array.from({ length: GLINT_COUNT }, (_, i) => (
          <span key={i} style={{ '--glint-index': i }} />
        ))}
      </div>

      {/* Holographic foil corner — the access-tier tab, hue-rotating over one bar */}
      <div className="holo-viz-corner" />

      {/* Micro-punch security dots along the left edge */}
      <div className="holo-viz-punch" />

      {/* Magnetic security strip at the bottom — doubles as track progress */}
      <div className="holo-viz-strip">
        <div className="holo-viz-strip-fill" />
      </div>
    </div>
  );
}

export default HoloVisualizer;
