import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { BackIcon } from '../components/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { Sheet } from '../components/Sheet';
import { useAccount, signOut } from '../lib/account';
import { announce } from '../lib/announce';
import { deleteAllRecordings } from '../lib/audioStore';
import { forgetAllRecordings, loadSessions } from '../lib/sessions';
import { applyTheme, clearAllLocalData, loadSettings, saveSettings, type Theme } from '../lib/settings';
import { cloudConfigured } from '../lib/supabase';
import { deleteEverythingRemote, lastSyncedAt, removeRemoteRecording, syncNow } from '../lib/sync';
import './Setup.css';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/*
 * Theme, and the two delete-everything actions (handoff §9 routes table).
 * Both say exactly what goes and what survives, in that order.
 */
export default function Settings() {
  const navigate = useNavigate();
  const { user, loading } = useAccount();
  const [theme, setTheme] = useState<Theme>(() => loadSettings().theme);
  const [askRecordings, setAskRecordings] = useState(false);
  const [askEverything, setAskEverything] = useState(false);

  const rounds = loadSessions();
  const recordings = rounds.filter((s) => s.recordingId).length;

  const change = (next: Theme) => {
    setTheme(next);
    saveSettings({ theme: next });
    applyTheme(next);
  };

  const deleteRecordings = async () => {
    await deleteAllRecordings();
    for (const session of rounds) await removeRemoteRecording(session);
    forgetAllRecordings();
    void syncNow();
    setAskRecordings(false);
    announce('Every recording deleted. Your rounds, ratings and notes are still here.');
  };

  const deleteEverything = async () => {
    await deleteAllRecordings();
    // The server copy goes first: clearing local data would lose the paths.
    await deleteEverythingRemote();
    clearAllLocalData();
    setAskEverything(false);
    applyTheme('system');
    navigate('/', { replace: true });
  };

  return (
    <div className="screen setup">
      <div className="screen__column">
        <header className="setup__header">
          <Link to="/" className="icon-button" aria-label="Back to home">
            <BackIcon />
          </Link>
          <h1 className="setup__title">Settings</h1>
          <span className="setup__spacer" aria-hidden="true" />
        </header>

        <main className="setup__form">
          <SegmentedControl legend="Theme" name="theme" options={THEME_OPTIONS} value={theme} onChange={change} />

          {cloudConfigured && (
            <div className="settings__account">
              <h2 className="section-label">Account</h2>
              {loading ? (
                <p className="settings__note">Checking…</p>
              ) : user ? (
                <>
                  <p className="settings__note">
                    Signed in as {user.email}. Your rounds and recordings follow you between devices
                    {lastSyncedAt() ? `, last synced ${lastSyncedAt()!.toLocaleTimeString()}` : ''}.
                  </p>
                  <div className="settings__actions">
                    <Button variant="secondary" onClick={() => void syncNow()}>
                      Sync now
                    </Button>
                    <Button variant="secondary" onClick={() => void signOut()}>
                      Sign out
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="settings__note">
                    Rounds are kept on this device. Sign in and they follow you to your other ones, and survive losing
                    this one.
                  </p>
                  <div className="settings__actions">
                    <Button variant="secondary" onClick={() => navigate('/signin')}>
                      Sign in
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="settings__data">
            <h2 className="section-label">Your data</h2>
            <p className="settings__note">
              {rounds.length === 0
                ? 'Nothing is stored yet. Rounds stay on this device.'
                : `${rounds.length} ${rounds.length === 1 ? 'round' : 'rounds'} on this device, ${recordings} with a recording.`}
            </p>
            <div className="settings__actions">
              <Button
                variant="secondary"
                className="settings__danger"
                disabled={recordings === 0}
                onClick={() => setAskRecordings(true)}
              >
                Delete all recordings
              </Button>
              <Button
                variant="secondary"
                className="settings__danger"
                disabled={rounds.length === 0}
                onClick={() => setAskEverything(true)}
              >
                Delete all data
              </Button>
            </div>
          </div>
        </main>
      </div>

      <Sheet open={askRecordings} title="Delete every recording?" onCancel={() => setAskRecordings(false)}>
        <p className="sheet__text">
          The audio goes for good. Your rounds, ratings and notes stay put, so your history keeps the progress.
        </p>
        <div className="sheet__actions">
          <Button variant="destructive" onClick={() => void deleteRecordings()}>
            Delete all recordings
          </Button>
          <Button variant="secondary" onClick={() => setAskRecordings(false)} data-autofocus>
            Keep them
          </Button>
        </div>
      </Sheet>

      <Sheet open={askEverything} title="Delete everything?" onCancel={() => setAskEverything(false)}>
        <p className="sheet__text">
          Every round, recording, rating and note goes, and your settings go back to their defaults. Nothing about this
          one comes back.
        </p>
        <div className="sheet__actions">
          <Button variant="destructive" onClick={() => void deleteEverything()}>
            Delete everything
          </Button>
          <Button variant="secondary" onClick={() => setAskEverything(false)} data-autofocus>
            Keep my data
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
