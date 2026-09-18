import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './field.css';

function FieldVisualizer({ track }) {
  const paused = useMotionPaused();
  const { hasBeat, style } = useBeatStyle(track);
  return (
    <div className="field-visualizer" aria-hidden="true"
      style={{ ...style, '--theme-motion-state': hasBeat && !paused ? 'running' : 'paused' }}>
      <div className="field-viz-cut" />
      <div className="field-viz-plane field-viz-plane--left" />
      <div className="field-viz-plane field-viz-plane--right" />
      <div className="field-viz-wedge" />
      <div className="field-viz-register" />
    </div>
  );
}
export default FieldVisualizer;
