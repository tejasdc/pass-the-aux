import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './vellum-hymnal.css';

/**
 * VellumVisualizer — an illuminated hymnal opening.
 *
 * A centered rosette (Book of Kells-style mandorla) rests inside a gold
 * ornamental frame. A specular gold-leaf shimmer sweeps across the frame
 * once per bar. Rubric (vermillion) filigree radiates from the rosette
 * and quickens on the beat. Corner drolleries breathe with the bar.
 *
 * All motion is phase-locked to the existing beat clock via CSS variables
 * (--beat-ms, --bar-ms, --viz-slow-ms, --beat-offset, --track-energy).
 * When hasBeat is false or motion is paused, --theme-motion-state pauses
 * every animation so the panel becomes a still illumination.
 */

const FLOURISH_COUNT = 8;   // rubric rays radiating from the rosette
const KNOT_RINGS = 3;       // concentric interlace rings

function VellumVisualizer({ track }) {
  const isPaused = useMotionPaused();
  const { hasBeat, style } = useBeatStyle(track);
  const motionState = hasBeat && !isPaused ? 'running' : 'paused';

  return (
    <div
      className="vellum-visualizer"
      style={{ ...style, '--theme-motion-state': motionState }}
      aria-hidden="true"
    >
      {/* Gold-leaf ornamental frame with a specular shimmer sweep per bar. */}
      <div className="vellum-frame">
        <svg
          className="vellum-frame__ink"
          viewBox="0 0 400 220"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <pattern id="vellum-rope" width="14" height="6" patternUnits="userSpaceOnUse">
              <path d="M0 3 Q3.5 0 7 3 T14 3" fill="none" stroke="currentColor" strokeWidth="0.9" />
            </pattern>
          </defs>
          <rect x="6" y="6" width="388" height="208" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <rect x="10" y="10" width="380" height="200" fill="url(#vellum-rope)" opacity="0.55" />
          {/* Corner Celtic knots */}
          {[
            { x: 6, y: 6, s: 1, sy: 1 },
            { x: 394, y: 6, s: -1, sy: 1 },
            { x: 6, y: 214, s: 1, sy: -1 },
            { x: 394, y: 214, s: -1, sy: -1 },
          ].map((c, i) => (
            <g key={i} transform={`translate(${c.x} ${c.y}) scale(${c.s} ${c.sy})`}>
              <path
                d="M0 0 L26 0 M0 0 L0 26 M6 6 Q14 6 14 14 Q14 22 22 22 M6 6 Q6 14 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <circle cx="14" cy="14" r="1.6" fill="currentColor" />
            </g>
          ))}
        </svg>
        <div className="vellum-frame__shimmer"></div>
      </div>

      {/* Rubric flourishes: red rays anchored to the rosette, pulsing on beat. */}
      <div className="vellum-flourishes">
        {Array.from({ length: FLOURISH_COUNT }, (_, i) => (
          <span
            key={i}
            className="vellum-flourish"
            style={{
              '--flourish-angle': `${(360 / FLOURISH_COUNT) * i}deg`,
              '--flourish-delay': `${(i * 60)}ms`,
            }}
          />
        ))}
      </div>

      {/* Central illuminated rosette (mandorla) with concentric Celtic knots. */}
      <svg
        className="vellum-rosette"
        viewBox="-60 -60 120 120"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="vellum-gold" cx="0.35" cy="0.3" r="0.9">
            <stop offset="0%" stopColor="#f8e59a" />
            <stop offset="55%" stopColor="#d4a83a" />
            <stop offset="100%" stopColor="#8a5f14" />
          </radialGradient>
          <radialGradient id="vellum-halo" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fff2c4" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#fff2c4" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Warm halo behind the rosette — swells on downbeat via animation. */}
        <circle className="vellum-rosette__halo" r="52" fill="url(#vellum-halo)" />

        {/* Slowly rotating outer interlace ring. */}
        <g className="vellum-rosette__ring vellum-rosette__ring--outer">
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d="M0 -44 Q6 -38 0 -32 Q-6 -38 0 -44 Z"
              fill="none"
              stroke="#1c3d7a"
              strokeWidth="1.1"
              transform={`rotate(${i * 30})`}
            />
          ))}
          <circle r="44" fill="none" stroke="#1c3d7a" strokeWidth="0.8" opacity="0.7" />
        </g>

        {/* Counter-rotating middle ring — lapis dots on gold. */}
        <g className="vellum-rosette__ring vellum-rosette__ring--mid">
          <circle r="34" fill="none" stroke="#b98b1e" strokeWidth="1.4" />
          {Array.from({ length: 8 }, (_, i) => (
            <circle
              key={i}
              cx={Math.cos((i / 8) * Math.PI * 2) * 34}
              cy={Math.sin((i / 8) * Math.PI * 2) * 34}
              r="2.2"
              fill="#1c3d7a"
            />
          ))}
        </g>

        {/* Inner gold disk with drop-cap style ornament. */}
        <g className="vellum-rosette__core">
          <circle r="24" fill="url(#vellum-gold)" stroke="#1c1108" strokeWidth="1.1" />
          {/* Six-fold rosette flower carved into the gold. */}
          {Array.from({ length: 6 }, (_, i) => (
            <path
              key={i}
              d="M0 -18 Q6 -6 0 0 Q-6 -6 0 -18 Z"
              fill="#a3231a"
              opacity="0.85"
              transform={`rotate(${i * 60})`}
            />
          ))}
          <circle r="4" fill="#f8e59a" stroke="#1c1108" strokeWidth="0.8" />
        </g>

        {/* Manuscript-style radial rays behind everything (subtle, dark). */}
        {Array.from({ length: KNOT_RINGS * 8 }, (_, i) => (
          <line
            key={i}
            x1="0"
            y1="-50"
            x2="0"
            y2="-46"
            stroke="#1c1108"
            strokeWidth="0.5"
            opacity="0.35"
            transform={`rotate(${(360 / (KNOT_RINGS * 8)) * i})`}
          />
        ))}
      </svg>

      {/* Corner drollery beasts — breathe with the bar. Lapis + verdigris. */}
      <svg className="vellum-drollery vellum-drollery--tl" viewBox="0 0 40 40" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M6 26 Q6 18 14 16 Q22 14 24 8 Q26 4 30 6 Q34 8 30 14 Q26 20 30 24 Q34 28 30 32 Q26 36 20 34 Q14 32 10 34 Q6 34 6 30 Z" />
          <circle cx="26" cy="10" r="1.1" fill="currentColor" />
          <path d="M28 12 Q30 14 32 14" />
        </g>
      </svg>
      <svg className="vellum-drollery vellum-drollery--br" viewBox="0 0 40 40" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M8 20 Q4 14 10 10 Q16 6 22 10 Q28 14 26 20 Q24 26 28 30 Q32 34 26 36 Q20 38 16 34 Q12 30 8 32 Q4 32 6 26 Q8 22 8 20 Z" />
          <circle cx="14" cy="14" r="1.1" fill="currentColor" />
          <path d="M18 12 Q20 10 22 12" />
        </g>
      </svg>
    </div>
  );
}

export default VellumVisualizer;
