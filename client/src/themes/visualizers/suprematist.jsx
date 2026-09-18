import { useEffect, useRef } from 'react';
import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './suprematist.css';

function SuprematistVisualizer({ track }) {
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
    <div ref={root} className="suprematist-visualizer" aria-hidden="true"
      style={{ ...style, '--theme-motion-state': active ? 'running' : 'paused' }}>
      <div className="sv-composition">
        <div className="sv-balance">
          <div className="sv-plane sv-plane-nw" />
          <div className="sv-plane sv-plane-ne" />
          <div className="sv-plane sv-plane-sw" />
          <div className="sv-plane sv-plane-se" />
          <div className="sv-vermilion" />
          <div className="sv-cobalt" />
          <div className="sv-satellite" />
        </div>
      </div>
    </div>
  );
}

export default SuprematistVisualizer;
