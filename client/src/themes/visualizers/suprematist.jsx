import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './suprematist.css';

// Suprematist Painting, 1916-17 — a kinetic Malevich composition.
// Seven flat planes drift, slowly rotate, and pulse scale on the beat,
// recomposing into off-kilter constructivist balance across each bar.
// Nested orbit/body wrappers let drift (parent transform) and beat pulse
// (child transform) compose without stepping on each other.
const PLANES = [
  'quad',       // 1. black quadrilateral — anchor mass, lower-left
  'pinkbeam',   // 2. long pink beam — diagonal sweep across the void
  'cobalt',     // 3. cobalt bar — counterweight below the beam
  'salmon',     // 4. salmon square — off-axis, slow constant rotation
  'green',      // 5. green disc — upper-right, sharp beat pulse
  'slate',      // 6. slate ovoid — soft right-edge balance
  'red',        // 7. red tick — hairline accent that flashes on the beat
];

function SuprematistVisualizer({ track }) {
  const isPaused = useMotionPaused();
  const { hasBeat, style } = useBeatStyle(track);
  const motionState = hasBeat && !isPaused ? 'running' : 'paused';

  return (
    <div
      className="suprematist-visualizer"
      style={{ ...style, '--theme-motion-state': motionState }}
      aria-hidden="true"
    >
      {PLANES.map((kind) => (
        <div key={kind} className={`sv-orbit sv-orbit-${kind}`}>
          <div className={`sv-body sv-body-${kind}`} />
        </div>
      ))}
    </div>
  );
}

export default SuprematistVisualizer;
