import { useEffect, useRef } from 'react';
import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './field.css';

// Fixed print geometry: eleven bowed incisions, each with two sharp ends.
const cuts = Array.from({ length: 11 }, (_, index) => {
  const t = index / 10;
  const arch = Math.sin(t * Math.PI);
  const x = 47 + t * 248;
  const y = 66 - 34 * arch;
  const height = 150 + 68 * arch;
  const bend = 24 + 28 * arch;
  return {
    path: `M ${x} ${y} C ${x + bend} ${y + height * .25}, ${x + bend} ${y + height * .72}, ${x - 12} ${y + height} C ${x + bend - 24} ${y + height * .7}, ${x + bend - 22} ${y + height * .25}, ${x} ${y}`,
    style: { '--cut-spread': `${(index - 5) * 3}px`, transformOrigin: `${x / 3.6}% 50%` },
  };
});

function FieldVisualizer({ track }) {
  const paused = useMotionPaused();
  const { hasBeat, style } = useBeatStyle(track);
  const root = useRef(null);
  const sample = useRef({ progress: 0, at: 0 });
  const active = hasBeat && !paused && track?.is_playing !== false;

  useEffect(() => {
    sample.current = { progress: Number(track?.progress_ms) || 0, at: performance.now() };
  }, [track]);

  useEffect(() => {
    if (!active) return;
    // Seek to the playhead after each poll or visibility resume. Updating only
    // a negative CSS delay would also retain the previous elapsed time.
    const time = sample.current.progress + performance.now() - sample.current.at;
    for (const animation of root.current.getAnimations({ subtree: true })) {
      animation.currentTime = time;
    }
  }, [track, active]);

  return (
    <div ref={root} className="field-visualizer" aria-hidden="true"
      style={{ ...style, '--theme-motion-state': active ? 'running' : 'paused' }}>
      <div className="field-viz-print">
        {cuts.map((cut, index) => (
          <div key={index} className={`field-viz-incision${index === 7 ? ' field-viz-incision--light' : ''}`} style={cut.style}>
            <svg viewBox="0 0 360 300" preserveAspectRatio="none" focusable="false">
              <path d={cut.path} />
            </svg>
          </div>
        ))}
      </div>
      <div className="field-viz-progress"><div /></div>
    </div>
  );
}
export default FieldVisualizer;
