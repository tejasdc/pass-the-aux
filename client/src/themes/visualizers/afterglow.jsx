import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './afterglow.css';

function AfterglowVisualizer({ track }) {
  const paused = useMotionPaused();
  const { hasBeat, style } = useBeatStyle(track);
  return (
    <div className="afterglow-visualizer" aria-hidden="true"
      style={{ ...style, '--theme-motion-state': hasBeat && !paused ? 'running' : 'paused' }}>
      <div className="afterglow-aperture">
        <div className="afterglow-corona afterglow-corona--red" />
        <div className="afterglow-corona afterglow-corona--cyan" />
        <div className="afterglow-corona afterglow-corona--ivory" />
        <div className="afterglow-eclipse" />
      </div>
      <div className="afterglow-flare" />
      <div className="afterglow-frame" />
    </div>
  );
}
export default AfterglowVisualizer;
