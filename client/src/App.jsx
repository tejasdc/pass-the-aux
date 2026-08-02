import { useState, useEffect, useCallback } from 'react';
import AnimatedBackground from './components/AnimatedBackground';
import NowPlaying from './components/NowPlaying';
import QueueList from './components/QueueList';
import SearchOverlay from './components/SearchOverlay';
import Toast from './components/Toast';
import { useNowPlaying } from './hooks/useNowPlaying';
import { useQueue } from './hooks/useQueue';
import './index.css';

const PARTY_STATUS_REFRESH_MS = 30000;
const PRODUCT_NAME = 'Pass the Aux';

function App() {
  const isHostRoute = window.location.pathname === '/host';
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', isVisible: false, isError: false });
  const [partyStatus, setPartyStatus] = useState({ live: false, isLoading: true });

  const isGuestExperienceLive = partyStatus.live && !isHostRoute;
  const { track: nowPlaying, isLoading: isNowPlayingLoading } = useNowPlaying({
    enabled: isGuestExperienceLive,
  });
  const { queue, isLoading: isQueueLoading, addToQueue } = useQueue({
    enabled: isGuestExperienceLive,
  });

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
      <>
        <AnimatedBackground />
        <HostPage
          partyStatus={partyStatus}
          onStatusChange={handlePartyStatusChanged}
          onShowToast={showToast}
        />
        <Toast
          message={toast.message}
          isVisible={toast.isVisible}
          isError={toast.isError}
          onHide={hideToast}
        />
      </>
    );
  }

  return (
    <>
      <AnimatedBackground />

      <div className="app">
        <header className="header">
          <div className="header-spacer"></div>
          <a className="wordmark" href="/" aria-label={`${PRODUCT_NAME} home`}>
            {PRODUCT_NAME}
            <span>{partyStatus.live ? 'the queue is open' : 'gallery closed'}</span>
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
              <NowPlaying track={nowPlaying} isLoading={isNowPlayingLoading} />

              <QueueList queue={queue} isLoading={isQueueLoading} />
            </>
          ) : (
            <NoPartyState />
          )}
        </main>
        <ProvenanceFooter />
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
    </>
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

function ProvenanceFooter() {
  return (
    <footer className="provenance">
      Design after Kazimir Malevich,{' '}
      <a href="https://www.moma.org/collection/works/80387" target="_blank" rel="noreferrer">
        Suprematist Painting (1916-17)
      </a>
    </footer>
  );
}

function HostPage({ partyStatus, onStatusChange, onShowToast }) {
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
      <ProvenanceFooter />
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
