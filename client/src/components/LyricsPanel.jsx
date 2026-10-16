import { useEffect, useMemo, useRef, useState } from 'react';
import { activeLyricIndex, parseSyncedLyrics } from '../data/lyrics';

function LyricsPanel({ track, lyrics, fullScreen = false }) {
  const [clock, setClock] = useState(() => performance.now());
  const scrollArea = useRef(null);
  const lines = useMemo(
    () => lyrics?.status === 'synced' ? parseSyncedLyrics(lyrics.text) : [],
    [lyrics],
  );

  useEffect(() => {
    setClock(performance.now());
    if (!track?.is_playing) return undefined;
    const timer = setInterval(() => setClock(performance.now()), 200);
    return () => clearInterval(timer);
  }, [track?.id, track?.is_playing, track?.receivedAt]);

  const progressMs = Math.min(
    track?.duration_ms || Infinity,
    (track?.progress_ms || 0) + (track?.is_playing && track?.receivedAt ? Math.max(0, clock - track.receivedAt) : 0),
  );
  const activeIndex = activeLyricIndex(lines, progressMs);

  useEffect(() => {
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
  }, [track?.id]);

  useEffect(() => {
    if (activeIndex < 0 || !scrollArea.current) return;
    const line = scrollArea.current.querySelector('[data-active="true"]');
    if (!line) return;
    const area = scrollArea.current;
    const top = line.offsetTop - area.offsetTop - area.clientHeight / 2 + line.clientHeight / 2;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    area.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? 'instant' : 'smooth' });
  }, [activeIndex, track?.id]);

  let body;
  if (!track) {
    body = <p className="lyrics-message">Play something on Spotify.</p>;
  } else if (!lyrics) {
    body = <p className="lyrics-message">Finding lyrics…</p>;
  } else if (lyrics.status === 'instrumental') {
    body = <p className="lyrics-message">Instrumental — no lyrics for this track.</p>;
  } else if (lyrics.status === 'plain') {
    body = <div className="lyrics-plain">{lyrics.text}</div>;
  } else if (lyrics.status === 'synced' && lines.length) {
    body = (
      <div className="lyrics-lines">
        {lines.map((line, index) => (
          <p
            className={`lyrics-line ${index === activeIndex ? 'is-active' : ''}`}
            data-active={index === activeIndex}
            key={`${line.timeMs}-${index}`}
          >
            {line.words || '♪'}
          </p>
        ))}
      </div>
    );
  } else if (lyrics.status === 'rate_limited') {
    body = <p className="lyrics-message">Lyrics are taking a moment. Retrying…</p>;
  } else if (lyrics.status === 'temporary_error') {
    body = <p className="lyrics-message">Lyrics couldn’t load. Retrying…</p>;
  } else if (lyrics.status === 'track_changed') {
    body = <p className="lyrics-message">Waiting for the next song…</p>;
  } else {
    body = <p className="lyrics-message">Lyrics aren’t available for this song.</p>;
  }

  return (
    <section className={`lyrics-panel ${fullScreen ? 'lyrics-panel-full' : ''}`} aria-label="Lyrics">
      <div className="lyrics-topline">
        <div className="lyrics-kicker">Lyrics</div>
        {!fullScreen && (
          <a className="lyrics-expand" href="/lyrics" aria-label="Open lyrics full screen" title="Open lyrics full screen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
            </svg>
          </a>
        )}
      </div>
      {fullScreen && track && (
        <div className="lyrics-track">
          <strong>{track.name}</strong>
          <span>{track.artists?.map((artist) => artist.name).join(', ')}</span>
        </div>
      )}
      <div className="lyrics-scroll" ref={scrollArea} aria-live="off">{body}</div>
      <div className="lyrics-source">Lyrics from LRCLIB{lyrics?.status === 'plain' ? ' · timings unavailable' : ''}</div>
    </section>
  );
}

export default LyricsPanel;
