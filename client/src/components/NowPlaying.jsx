import { useMemo } from 'react';

function formatTime(ms) {
  if (!ms || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function NowPlaying({ track, isLoading }) {
  const progressPercent = useMemo(() => {
    if (!track || !track.duration_ms || !track.progress_ms) return 0;
    return Math.max(0, Math.min(100, (track.progress_ms / track.duration_ms) * 100));
  }, [track]);

  const defaultImage = 'https://i.scdn.co/image/ab67616d0000b273e8b066f70c206551210d902b';

  if (isLoading && !track) {
    return (
      <section className="now-playing">
        <div className="loading-state">Loading now playing...</div>
      </section>
    );
  }

  if (!track) {
    return (
      <section className="now-playing">
        <div className="now-kicker">Now Playing</div>
        <div className="album-plane is-empty">
          <img src={defaultImage} alt="No track playing" />
        </div>
        <div className="track-info">
          <h2 className="track-title">No Track Playing</h2>
          <p className="track-artist">Start playing on Spotify</p>
          <p className="track-album">The queue is ready when the room is.</p>
        </div>
        <div className="progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '0%' }}></div>
          </div>
          <div className="progress-time">
            <span>0:00</span>
            <span>0:00</span>
          </div>
        </div>
      </section>
    );
  }

  const albumImage = track.album?.images?.[0]?.url || defaultImage;
  const trackName = track.name || 'Unknown Track';
  const artistName = track.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
  const albumName = track.album?.name || 'Unknown Album';
  const audioFeatures = track.audioFeatures;

  return (
    <section className="now-playing">
      <div className="now-kicker">Now Playing</div>
      <div className="album-plane">
        <img src={albumImage} alt={`${trackName} album art`} />
      </div>

      <div className="track-info">
        <h2 className="track-title">{trackName}</h2>
        <p className="track-artist">{artistName}</p>
        <p className="track-album">{albumName}</p>
        {audioFeatures?.bpm && audioFeatures.energyLevel && (
          <div className="track-audio-badge">
            {audioFeatures.bpm} BPM <span aria-hidden="true">&middot;</span> {audioFeatures.energyLevel.toUpperCase()} ENERGY
          </div>
        )}
      </div>

      <div className="progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="progress-time">
          <span>{formatTime(track.progress_ms)}</span>
          <span>{formatTime(track.duration_ms)}</span>
        </div>
      </div>
    </section>
  );
}

export default NowPlaying;
