import { useBeatStyle, useMotionPaused } from '../ThemeBackgrounds';
import './facet.css';

// A deterministic PRNG so the shattered mosaic is stable across renders
// and unique to Facet — no runtime randomness, no RAF, pure geometry.
function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VIEW_W = 400;
const VIEW_H = 200;
const COLS = 7;
const ROWS = 4;

// Four color families walk diagonally across the plane so beats can address
// one family at a time. Palette lifted from the Facet mockup exploration
// (facet-viz.html / facet-reactive.html) — oxblood, chartreuse, sage, pine.
const FAMILIES = ['red', 'sage', 'yellow', 'deep'];
const PALETTE = {
  red: ['#8E2222', '#A03026', '#C6371F'],
  yellow: ['#D8CE28', '#B4C22C', '#8FA824'],
  sage: ['#86AE8F', '#A9C4A9', '#2C6E5A'],
  deep: ['#14453A', '#1E5C43', '#4E7A3C'],
};
const LIT_CREAM = '#F6F0CD';

function buildShards(seed) {
  const rand = mulberry32(seed);

  // Jittered vertex grid — edges pinned so the mosaic tiles the whole stage
  // and no gap ever appears at the border.
  const pts = [];
  for (let j = 0; j <= ROWS; j++) {
    pts[j] = [];
    for (let i = 0; i <= COLS; i++) {
      const edgeX = i === 0 || i === COLS;
      const edgeY = j === 0 || j === ROWS;
      const jx = edgeX ? 0 : (rand() - 0.5) * 32;
      const jy = edgeY ? 0 : (rand() - 0.5) * 26;
      pts[j][i] = [(i / COLS) * VIEW_W + jx, (j / ROWS) * VIEW_H + jy];
    }
  }

  const shards = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      // (i + j*2) mod 4 keeps same-family shards from touching along edges
      const famIdx = (i + j * 2) % FAMILIES.length;
      const fam = FAMILIES[famIdx];
      const hues = PALETTE[fam];
      const c1 = hues[Math.floor(rand() * hues.length)];
      const c2 = hues[Math.floor(rand() * hues.length)];

      const tl = pts[j][i];
      const tr = pts[j][i + 1];
      const br = pts[j + 1][i + 1];
      const bl = pts[j + 1][i];

      // Split each quad along a randomly-chosen diagonal — two triangular shards
      if (rand() > 0.5) {
        shards.push({ pts: [tl, tr, br], base: c1, famIdx });
        shards.push({ pts: [tl, br, bl], base: c2, famIdx });
      } else {
        shards.push({ pts: [tl, tr, bl], base: c1, famIdx });
        shards.push({ pts: [tr, br, bl], base: c2, famIdx });
      }
    }
  }
  return shards;
}

// The shatter pattern is computed once at module load — this IS the visualizer's
// identity. Every song sees the same mosaic; what changes is which family lights
// up on which beat, driven by real BPM/energy.
const SHARDS = buildShards(0xface7);

function FacetVisualizer({ track }) {
  const isPaused = useMotionPaused();
  const { hasBeat, style } = useBeatStyle(track);
  const isActive = hasBeat && !isPaused;
  const motionState = isActive ? 'running' : 'paused';

  return (
    <div
      className="facet-visualizer"
      data-active={isActive ? 'true' : 'false'}
      style={{ ...style, '--theme-motion-state': motionState }}
      aria-hidden="true"
    >
      <svg
        className="facet-shatter"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {SHARDS.map((s, idx) => (
          <polygon
            key={idx}
            className="facet-shard"
            points={s.pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
            style={{
              '--fam-color': s.base,
              '--fam-lit': LIT_CREAM,
              '--fam-idx': s.famIdx,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export default FacetVisualizer;
