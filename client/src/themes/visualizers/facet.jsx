import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './facet.css';

const BAR_COUNT = 16;

function FacetVisualizer({ track }) {
  const isPaused = useMotionPaused();
  const { hasBeat, style } = useBeatStyle(track);
  const motionState = hasBeat && !isPaused ? 'running' : 'paused';

  return (
    <div
      className="facet-visualizer"
      style={{ ...style, '--theme-motion-state': motionState }}
      aria-hidden="true"
    >
      <div className="facet-viz-grid"></div>
      <div className="facet-viz-core"></div>
      <div className="facet-viz-bars">
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
      <div className="facet-viz-trace">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}

export default FacetVisualizer;
