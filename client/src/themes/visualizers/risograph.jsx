import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './risograph.css';

// Risograph visualizer.
// Two spot inks (fluorescent pink + teal) printed slightly mis-registered
// over warm newsprint. A halftone-dot vinyl record spins in from the left
// and every downbeat snaps the color-channel offset outward before it
// relaxes back to rest — the way a Riso MZ misregisters when it's tired.
// Rotation period is locked to the bar length, so the record turns with
// the song, not with wall time.

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
      {/* Mis-registered spot-ink halftone fields — the "look" of Riso. */}
      <div className="riso-halftone riso-halftone--pink" />
      <div className="riso-halftone riso-halftone--teal" />

      {/* Vinyl record — partial disc peeking in from the left, spins on tempo. */}
      <div className="riso-vinyl-wrap">
        <div className="riso-vinyl-ghost riso-vinyl-ghost--pink" />
        <div className="riso-vinyl-ghost riso-vinyl-ghost--teal" />
        <div className="riso-vinyl">
          <div className="riso-vinyl__grooves" />
          <div className="riso-vinyl__label">
            <span className="riso-vinyl__label-mark" />
            <span className="riso-vinyl__label-mark riso-vinyl__label-mark--b" />
          </div>
          <div className="riso-vinyl__hole" />
        </div>
      </div>

      {/* Rubber-stamped SIDE A badge in the corner. */}
      <div className="riso-stamp">
        <span className="riso-stamp__ring" />
        <span className="riso-stamp__top">SIDE&nbsp;A</span>
        <span className="riso-stamp__mid">33⅓</span>
        <span className="riso-stamp__bot">RPM</span>
      </div>

      {/* Colophon-style tick tape along the top. */}
      <div className="riso-tape" />

      {/* Torn/deckle bottom edge for tactile paper feel. */}
      <div className="riso-deckle" />

      {/* Fine paper grain — the single most important tell for "printed". */}
      <div className="riso-grain" />
    </div>
  );
}

export default RisographVisualizer;
