import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './risograph.css';

const BAR_COUNT = 16;

function RisographVisualizer({ track }) {
  const isPaused = useMotionPaused();
  const { hasBeat, style } = useBeatStyle(track);
  const motionState = hasBeat && !isPaused ? 'running' : 'paused';

  return (
    <div
      className="risograph-visualizer"
      style={{ ...style, '--theme-motion-state': motionState }}
      aria-hidden="true"
    >
      <div className="risograph-viz-grid"></div>
      <div className="risograph-viz-core"></div>
      <div className="risograph-viz-bars">
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <span
            key={index}
            style={{
              '--viz-index': index,
              '--viz-delay': `${-index * 28}ms`,
              '--viz-height': `${28 + (index % 6) * 11}%`,
            }}
          ></span>
        ))}
      </div>
      <div className="risograph-viz-trace">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}

export default RisographVisualizer;
