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
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Main App */}
      <div className="app">
        <header className="header">
          <div className="header-spacer"></div>
          <h1 className="logo">Electric Love</h1>
          <button className="search-btn" onClick={handleOpenSearch}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </header>

        <main className="content">
          {partyStatus.isLoading ? (
            <div className="loading-state">Checking party status...</div>
          ) : partyStatus.live ? (
            <>
              {/* Now Playing Section */}
              <NowPlaying track={nowPlaying} isLoading={isNowPlayingLoading} />

              {/* Queue Section */}
              <QueueList queue={queue} isLoading={isQueueLoading} />
            </>
          ) : (
            <NoPartyState />
          )}
        </main>
      </div>

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={handleCloseSearch}
        onAddToQueue={handleAddToQueue}
        onShowToast={showToast}
      />

      {/* Toast Notifications */}
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
      <div className="no-party-mark">EL</div>
      <h2>No party right now</h2>
      <p>The queue opens when the host starts Electric Love.</p>
      <a className="host-link" href="/host">host</a>
    </section>
  );
}

function HostPage({ partyStatus, onStatusChange, onShowToast }) {
  const [passphrase, setPassphrase] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const handleStart = async (event) => {
    event.preventDefault();
    setIsStarting(true);

    try {
      const response = await fetch('/api/party/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Unable to start party');
      }

      if (data.authUrl) {
        window.location.assign(data.authUrl);
      }
    } catch (err) {
      onShowToast(err.message, true);
      setIsStarting(false);
    }
  };

  const handleEnd = async () => {
    setIsEnding(true);

    try {
      const response = await fetch('/api/party/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Unable to end party');
      }

      onShowToast('Party ended');
      setPassphrase('');
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
        <h1 className="logo">Electric Love</h1>
        <div className="header-spacer"></div>
      </header>

      <main className="content host-content">
        <section className="host-panel">
          <p className="host-kicker">Host</p>
          <h2>{partyStatus.live ? 'Party is live' : 'Start the party'}</h2>
          <p className="host-copy">
            {partyStatus.live
              ? `Guests can add songs until ${formatExpiry(partyStatus.expiresAt)}.`
              : 'Enter the host passphrase to open the queue and connect Spotify.'}
          </p>

          <form className="host-form" onSubmit={handleStart}>
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder="Host passphrase"
              autoComplete="current-password"
              className="host-input"
            />
            <button className="host-button" type="submit" disabled={isStarting || !passphrase}>
              {isStarting ? 'Opening Spotify...' : 'Start with Spotify'}
            </button>
          </form>

          {partyStatus.live && (
            <button
              className="host-button secondary"
              type="button"
              onClick={handleEnd}
              disabled={isEnding || !passphrase}
            >
              {isEnding ? 'Ending...' : 'End party'}
            </button>
          )}
        </section>
      </main>
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
