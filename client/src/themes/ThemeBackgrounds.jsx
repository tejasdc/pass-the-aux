import { useEffect, useMemo, useState } from 'react';

const barCount = 22;
const particleCount = 28;
const cathodeTraceCount = 5;
const rootThemeClassByVariant = {
  winamp: 'theme-winamp',
  milkdrop: 'theme-milkdrop',
  generative: 'theme-flow',
  risograph: 'theme-risograph',
  afterglow: 'theme-afterglow',
  cathode: 'theme-cathode',
  vellum: 'theme-vellum',
  holo: 'theme-holo',
};

export function useMotionPaused() {
  const [isPaused, setIsPaused] = useState(() => {
    if (typeof window === 'undefined') return true;
    return document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setIsPaused(document.hidden || media.matches);

    update();
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);

    return () => {
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return isPaused;
}

function getTrackProgress(track) {
  if (!track?.duration_ms || !Number.isFinite(Number(track.progress_ms))) return 0;
  return Math.max(0, Math.min(1, Number(track.progress_ms) / track.duration_ms));
}

export function useBeatStyle(track) {
  return useMemo(() => {
    const bpm = Number(track?.audioFeatures?.bpm);
    const energy = Number(track?.audioFeatures?.energy);
    const progressMs = Number(track?.progress_ms) || 0;
    const hasBeat = Number.isFinite(bpm) && bpm > 0 && Number.isFinite(energy);
    const beatMs = hasBeat ? 60000 / bpm : null;
    const clampedEnergy = hasBeat ? Math.max(0, Math.min(1, energy)) : 0;

    return {
      hasBeat,
      beatMs,
      beatOffsetMs: beatMs ? -(progressMs % beatMs) : 0,
      style: {
        '--track-progress': getTrackProgress(track),
        '--beat-ms': beatMs ? `${beatMs}ms` : undefined,
        '--bar-ms': beatMs ? `${beatMs * 4}ms` : undefined,
        '--viz-slow-ms': beatMs ? `${beatMs * 8}ms` : undefined,
        '--riso-spin-ms': beatMs ? `${beatMs * 16}ms` : undefined,
        '--beat-offset': beatMs ? `${-(progressMs % beatMs)}ms` : undefined,
        '--track-energy': clampedEnergy,
        '--eq-peak-scale': 1.25 + clampedEnergy * 0.7,
        '--scope-peak-scale': 1 + clampedEnergy * 0.9,
        '--burst-alpha': 0.12 + clampedEnergy * 0.28,
        '--flow-start-scale': 0.6 + clampedEnergy,
        '--riso-brightness': 1 + clampedEnergy * 0.35,
      },
    };
  }, [track]);
}

export function EmptyBackground() {
  return null;
}

export function FieldBackground({ track }) {
  const progress = getTrackProgress(track);

  return (
    <div
      className="field-background"
      style={{
        '--field-progress-height': `${Math.max(4, progress * 100)}vh`,
        '--field-progress-top': `calc(${Math.max(4, progress * 100)}vh + 10px)`,
      }}
      aria-hidden="true"
    >
      <div className="field-seam"></div>
      <div className="field-seam field-seam-short"></div>
      <div className="field-wedge"></div>
      <div className="field-wedge-tick"></div>
    </div>
  );
}

export function BeatBackground({ track, variant }) {
  const isPaused = useMotionPaused();
  const { hasBeat, beatMs, beatOffsetMs, style } = useBeatStyle(track);
  const rootThemeClass = rootThemeClassByVariant[variant];
  const motionState = hasBeat && !isPaused ? 'running' : 'paused';
  const exportedBeatStyle = rootThemeClass
    ? `.theme-root.${rootThemeClass}{--theme-motion-state:${motionState};--beat-ms:${style['--beat-ms'] || '1000ms'};--bar-ms:${style['--bar-ms'] || '4000ms'};--viz-slow-ms:${style['--viz-slow-ms'] || '8000ms'};--beat-offset:${style['--beat-offset'] || '0ms'};--track-energy:${style['--track-energy']};--track-progress:${style['--track-progress']};--scope-peak-scale:${style['--scope-peak-scale']};--burst-alpha:${style['--burst-alpha']};}`
    : '';
  const classes = [
    'beat-background',
    `beat-background-${variant}`,
    hasBeat ? 'is-beat-ready' : 'is-beat-missing',
    isPaused ? 'is-motion-paused' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style} aria-hidden="true">
      {exportedBeatStyle && <style>{exportedBeatStyle}</style>}

      {variant === 'winamp' && (
        <div className="winamp-bars">
          {Array.from({ length: barCount }, (_, index) => (
            <span
              key={index}
              style={{
                '--bar-index': index,
                '--bar-delay': `${-index * 16}ms`,
                '--bar-height': `${26 + (index % 7) * 7}%`,
              }}
            ></span>
          ))}
        </div>
      )}

      {variant === 'milkdrop' && (
        <>
          <div className="milkdrop-plasma"></div>
          <div className="milkdrop-scope"></div>
          <div className="milkdrop-burst"></div>
        </>
      )}

      {variant === 'generative' && (
        <div className="flow-particles">
          {Array.from({ length: particleCount }, (_, index) => (
            <span
              key={index}
              style={{
                '--particle-index': index,
                '--particle-duration': `${(beatMs || 1000) * (10 + (index % 5))}ms`,
                '--particle-delay': `${beatOffsetMs - index * 71}ms`,
                left: `${(index * 37) % 100}%`,
                top: `${(index * 19) % 100}%`,
                width: `${60 + (index % 6) * 18}px`,
              }}
            ></span>
          ))}
        </div>
      )}

      {variant === 'risograph' && (
        <>
          <div className="riso-sheet"></div>
          <div className="riso-disc"></div>
          <div className="riso-ink riso-ink-pink"></div>
          <div className="riso-ink riso-ink-teal"></div>
        </>
      )}

      {variant === 'afterglow' && (
        <>
          <div className="afterglow-wash"></div>
          <div className="afterglow-halo"></div>
          <div className="afterglow-scan"></div>
        </>
      )}

      {variant === 'cathode' && (
        <>
          <div className="cathode-graticule"></div>
          <div className="cathode-sweep"></div>
          <svg className="cathode-lissajous" viewBox="0 0 320 320" role="presentation">
            {Array.from({ length: cathodeTraceCount }, (_, index) => (
              <path
                key={index}
                d="M160 42 C262 42 278 124 206 160 C278 196 262 278 160 278 C58 278 42 196 114 160 C42 124 58 42 160 42Z"
                style={{ '--trace-index': index }}
              />
            ))}
            <circle cx="160" cy="160" r="5" />
          </svg>
        </>
      )}

      {variant === 'vellum' && (
        <>
          <div className="vellum-page-field"></div>
          <div className="vellum-ornament vellum-ornament-left"></div>
          <div className="vellum-ornament vellum-ornament-right"></div>
        </>
      )}

      {variant === 'holo' && (
        <>
          <div className="holo-lanyard"></div>
          <div className="holo-prism"></div>
          <div className="holo-sheen"></div>
        </>
      )}
    </div>
  );
}

export function WinampBackground(props) {
  return <BeatBackground {...props} variant="winamp" />;
}

export function MilkdropBackground(props) {
  return <BeatBackground {...props} variant="milkdrop" />;
}

export function GenerativeFlowBackground(props) {
  return <BeatBackground {...props} variant="generative" />;
}

export function RisographBackground(props) {
  return <BeatBackground {...props} variant="risograph" />;
}

export function AfterglowBackground(props) {
  return <BeatBackground {...props} variant="afterglow" />;
}

export function CathodeVectorscopeBackground(props) {
  return <BeatBackground {...props} variant="cathode" />;
}

export function VellumHymnalBackground(props) {
  return <BeatBackground {...props} variant="vellum" />;
}

export function HoloLaminateBackground(props) {
  return <BeatBackground {...props} variant="holo" />;
}
