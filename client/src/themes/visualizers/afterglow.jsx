import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './afterglow.css';

const EMBER_COUNT = 9;

// Deterministic offsets so embers don't cluster or jitter between renders.
const EMBERS = Array.from({ length: EMBER_COUNT }, (_, index) => {
  const seed = index + 1;
  const left = ((seed * 41.7) % 92) + 4; // 4%..96%
  const drift = (((seed * 17) % 10) - 5) * 0.6; // -3vw..3vw
  const size = 2 + ((seed * 3) % 4); // 2..5 px
  const delay = -((seed * 733) % 4200);
  const opacity = 0.35 + ((seed * 7) % 45) / 100; // 0.35..0.79
  return { left, drift, size, delay, opacity, seed };
});

function AfterglowVisualizer({ track }) {
  const isPaused = useMotionPaused();
  const { hasBeat, style } = useBeatStyle(track);
  const motionState = hasBeat && !isPaused ? 'running' : 'paused';

  return (
    <div
      className="afterglow-visualizer"
      style={{ ...style, '--theme-motion-state': motionState }}
      aria-hidden="true"
    >
      {/* Editorial corner registration marks — static, ink-on-obsidian */}
      <div className="afterglow-regmarks" aria-hidden="true">
        <span className="afterglow-regmark afterglow-regmark--tl" />
        <span className="afterglow-regmark afterglow-regmark--tr" />
        <span className="afterglow-regmark afterglow-regmark--bl" />
        <span className="afterglow-regmark afterglow-regmark--br" />
      </div>

      {/* Room-wash vignette — arterial red bottom-right, cyan top-left */}
      <div className="afterglow-room" aria-hidden="true" />

      {/* Volumetric chromatic bloom — three RGB layers that separate on beat */}
      <div className="afterglow-bloom-stage" aria-hidden="true">
        <div className="afterglow-bloom afterglow-bloom--r" />
        <div className="afterglow-bloom afterglow-bloom--g" />
        <div className="afterglow-bloom afterglow-bloom--b" />
      </div>

      {/* Anamorphic horizontal lens streak — the J.J. Abrams flare */}
      <div className="afterglow-streak" aria-hidden="true">
        <span className="afterglow-streak-core" />
        <span className="afterglow-streak-r" />
        <span className="afterglow-streak-b" />
      </div>

      {/* Slow rising embers — atmospheric particles */}
      <div className="afterglow-embers" aria-hidden="true">
        {EMBERS.map((e) => (
          <span
            key={e.seed}
            className="afterglow-ember"
            style={{
              '--ember-left': `${e.left}%`,
              '--ember-drift': `${e.drift}vw`,
              '--ember-size': `${e.size}px`,
              '--ember-delay': `${e.delay}ms`,
              '--ember-opacity': e.opacity,
            }}
          />
        ))}
      </div>

      {/* Colophon overlay — issue number + pressed timestamp */}
      <div className="afterglow-colophon" aria-hidden="true">
        <span className="afterglow-colophon-dot" />
        <span className="afterglow-colophon-txt">iss. 004 · afterhours</span>
      </div>

      {/* Grain — the moody film-noise finish */}
      <div className="afterglow-grain" aria-hidden="true" />
    </div>
  );
}

export default AfterglowVisualizer;
