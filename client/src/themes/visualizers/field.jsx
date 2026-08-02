import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './field.css';

// Villalba-style color-field study.
// Two flat teal fields split by a single vertical cut. A wedge descends from
// the top as the track progresses. The fields breathe on the bar; the seam
// pulses opacity on the beat. Nothing else moves. Its uniqueness is stillness.
function FieldVisualizer({ track }) {
  const isPaused = useMotionPaused();
  const { hasBeat, style } = useBeatStyle(track);
  const motionState = hasBeat && !isPaused ? 'running' : 'paused';

  return (
    <div
      className="field-visualizer"
      style={{ ...style, '--theme-motion-state': motionState }}
      aria-hidden="true"
    >
      <div className="field-viz-left"></div>
      <div className="field-viz-right"></div>
      <div className="field-viz-noise"></div>
      <div className="field-viz-seam"></div>
      <div className="field-viz-seam-short"></div>
      <div className="field-viz-wedge">
        <div className="field-viz-wedge-inner"></div>
      </div>
      <div className="field-viz-tick"></div>
      <div className="field-viz-nick"></div>
    </div>
  );
}

export default FieldVisualizer;
