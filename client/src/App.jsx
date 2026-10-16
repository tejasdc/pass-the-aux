import { useState, useEffect, useCallback } from 'react';
import NowPlaying from './components/NowPlaying';
import LyricsPanel from './components/LyricsPanel';
import QueueList from './components/QueueList';
import SearchOverlay from './components/SearchOverlay';
import ThemeSwitcher from './components/ThemeSwitcher';
import Toast from './components/Toast';
import { useNowPlaying } from './hooks/useNowPlaying';
import { useLyrics } from './hooks/useLyrics';
import { useQueue } from './hooks/useQueue';
import { useThemeSelection } from './hooks/useThemeSelection';
import './index.css';

const PARTY_STATUS_REFRESH_MS = 30000;
const PRODUCT_NAME = 'Pass the Aux';

function App() {
  const isHostRoute = window.location.pathname === '/host';
  const isLyricsRoute = window.location.pathname === '/lyrics';
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileView, setMobileView] = useState('playing');
  const [toast, setToast] = useState({ message: '', isVisible: false, isError: false });
  const [partyStatus, setPartyStatus] = useState({ live: false, isLoading: true });
  const { activeTheme, shuffleTheme } = useThemeSelection();
  const ActiveBackground = activeTheme.Background;

  const isGuestExperienceLive = partyStatus.live && !isHostRoute;
  const { track: nowPlaying, isLoading: isNowPlayingLoading } = useNowPlaying({
    enabled: isGuestExperienceLive,
  });
  const { queue, isLoading: isQueueLoading, addToQueue } = useQueue({
    enabled: isGuestExperienceLive && !isLyricsRoute,
  });
  const lyrics = useLyrics(isGuestExperienceLive ? nowPlaying?.id : null);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isVisible: true, isError });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  const fetchPartyStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/party/status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load party status');
      }

      setPartyStatus({ ...data, isLoading: false });
    } catch (err) {
      console.error('Error fetching party status:', err);
      setPartyStatus({ live: false, isLoading: false, error: err.message });
    }
  }, []);

  useEffect(() => {
    fetchPartyStatus();
    const interval = setInterval(fetchPartyStatus, PARTY_STATUS_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchPartyStatus]);

  const handleOpenSearch = () => {
    if (!partyStatus.live) {
      showToast('No party right now', true);
      return;
    }

    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
  };

  const handleAddToQueue = async (uri) => {
    const result = await addToQueue(uri);

    if (result.success) {
      showToast('Added to queue!');
      return result;
    } else {
      showToast(result.message || result.error || 'Failed to add to queue', true);
      return result;
    }
  };

  const handlePartyStatusChanged = useCallback(() => {
    fetchPartyStatus();
  }, [fetchPartyStatus]);

  if (isHostRoute) {
    return (
      <div className={`theme-root ${activeTheme.className}`} data-theme={activeTheme.id}>
        <ActiveBackground track={nowPlaying} partyStatus={partyStatus} />
        <HostPage
          partyStatus={partyStatus}
          onStatusChange={handlePartyStatusChanged}
          onShowToast={showToast}
          activeTheme={activeTheme}
        />
        <Toast
          message={toast.message}
          isVisible={toast.isVisible}
          isError={toast.isError}
          onHide={hideToast}
        />
      </div>
    );
  }

  if (isLyricsRoute) {
    return (
      <div className={`theme-root ${activeTheme.className} lyrics-route`} data-theme={activeTheme.id}>
        <div className="lyrics-screen">
          <a className="lyrics-screen-back" href="/" aria-label="Back to Pass the Aux" title="Back to Pass the Aux">←</a>
          {partyStatus.isLoading ? (
            <div className="loading-state">Checking party status...</div>
          ) : partyStatus.live ? (
            <LyricsPanel track={nowPlaying} lyrics={lyrics} fullScreen />
          ) : (
            <div className="lyrics-offline">
              <h1>No party right now</h1>
              <p>Start a party to show what’s playing here.</p>
              <a href="/host">Host a party</a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`theme-root ${activeTheme.className}`} data-theme={activeTheme.id}>
      <ActiveBackground track={nowPlaying} partyStatus={partyStatus} />

      <div className="app party-app">
        <header className="header">
          <ThemeSwitcher activeTheme={activeTheme} onShuffle={shuffleTheme} />
          <a className="wordmark" href="/" aria-label={`${PRODUCT_NAME} home`}>
            {PRODUCT_NAME}
          </a>
          <button className="search-btn" type="button" onClick={handleOpenSearch} aria-label="Search songs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </header>

        <main className={`content ${partyStatus.live ? 'party-content' : ''}`}>
          {partyStatus.isLoading ? (
            <div className="loading-state">Checking party status...</div>
          ) : partyStatus.live ? (
            <>
              <div className="mobile-view-switch" aria-label="Now playing view">
                <button type="button" className={mobileView === 'playing' ? 'is-selected' : ''} aria-label="Show now playing" title="Show now playing" aria-pressed={mobileView === 'playing'} onClick={() => setMobileView('playing')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" /></svg>
                </button>
                <button type="button" className={mobileView === 'lyrics' ? 'is-selected' : ''} aria-label="Show lyrics" title="Show lyrics" aria-pressed={mobileView === 'lyrics'} onClick={() => setMobileView('lyrics')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 5h14M5 10h14M5 15h9M5 20h6" /></svg>
                </button>
              </div>

              <div className={`playback-layout view-${mobileView}`}>
                <NowPlaying
                  track={nowPlaying}
                  isLoading={isNowPlayingLoading}
                  activeTheme={activeTheme}
                />
                <LyricsPanel track={nowPlaying} lyrics={lyrics} />
              </div>

              <QueueList queue={queue} isLoading={isQueueLoading} />
            </>
          ) : (
            <NoPartyState />
          )}
        </main>
        <ProvenanceFooter activeTheme={activeTheme} />
      </div>

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={handleCloseSearch}
        onAddToQueue={handleAddToQueue}
        onShowToast={showToast}
      />

      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        isError={toast.isError}
        onHide={hideToast}
      />
    </div>
  );
}

function NoPartyState() {
  return (
    <section className="no-party">
      <div className="no-party-mark" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <h2>No party right now</h2>
      <p>{PRODUCT_NAME} opens when the host starts a live Spotify queue.</p>
      <a className="host-link" href="/host">host</a>
    </section>
  );
}

function ProvenanceFooter({ activeTheme }) {
  return (
    <footer className="provenance">
      Design inspired by{' '}
      <a href={activeTheme.href} target="_blank" rel="noreferrer">
        {activeTheme.reference}
      </a>
      {' · '}Made by{' '}
      <a href="https://tejas.nyc" target="_blank" rel="noreferrer">tejas.nyc</a>
    </footer>
  );
}

function HostPage({ partyStatus, onStatusChange, onShowToast, activeTheme }) {
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const handleStart = () => {
    setIsStarting(true);
    window.location.assign('/api/auth/login?returnTo=/host');
  };

  const handleEnd = async () => {
    setIsEnding(true);

    try {
      const response = await fetch('/api/party/end', {
        method: 'POST',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Unable to end party');
      }

      onShowToast('Party ended');
      onStatusChange();
    } catch (err) {
      onShowToast(err.message, true);
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="app host-app">
      <header className="header">
        <a className="host-back" href="/" aria-label="Back to party">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"></path>
          </svg>
        </a>
        <a className="wordmark" href="/" aria-label={`${PRODUCT_NAME} home`}>
          {PRODUCT_NAME}
          <span>host room</span>
        </a>
        <div className="header-spacer"></div>
      </header>

      <main className="content host-content">
        <section className="host-panel">
          <p className="host-kicker">Host</p>
          <h2>{partyStatus.live ? 'Party is live' : 'Start the party'}</h2>
          <p className="host-copy">
            {partyStatus.live
              ? `Guests can add songs until ${formatExpiry(partyStatus.expiresAt)}.`
              : 'Connect Spotify to open the queue. Guests only need the QR.'}
          </p>

          {!partyStatus.live && (
            <button className="host-button" type="button" onClick={handleStart} disabled={isStarting}>
              {isStarting ? 'Opening Spotify...' : 'Start the party'}
            </button>
          )}

          {partyStatus.live && partyStatus.hostSession && (
            <button
              className="host-button secondary"
              type="button"
              onClick={handleEnd}
              disabled={isEnding}
            >
              {isEnding ? 'Ending...' : 'End party'}
            </button>
          )}

          {partyStatus.live && !partyStatus.hostSession && (
            <button className="host-button" type="button" onClick={handleStart} disabled={isStarting}>
              {isStarting ? 'Opening Spotify...' : 'Continue with Spotify'}
            </button>
          )}
        </section>
      </main>
      <ProvenanceFooter activeTheme={activeTheme} />
    </div>
  );
}

function formatExpiry(expiresAt) {
  if (!expiresAt) return 'the session expires';

  return new Date(expiresAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default App;
