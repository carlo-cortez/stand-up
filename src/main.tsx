// Global styles first, so route stylesheets imported by App cascade over them.
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { clearLiveRound, isResumable, loadLiveRound, setFlash } from './lib/liveRound';
import { addSession, sessionFor } from './lib/sessions';
import { applyTheme, loadSettings } from './lib/settings';
import { unlockSoundsOnFirstGesture } from './lib/sounds';
import { syncNow } from './lib/sync';

// Follow the OS theme live while the setting is "system".
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (loadSettings().theme === 'system') applyTheme('system');
});

// Audio starts suspended until a tap; the first one anywhere wakes it for the draw.
unlockSoundsOnFirstGesture();

// A round left behind by a closed tab. /round handles its own recovery; on
// any other page a stale round is dropped with one quiet line on Home.
if (location.pathname !== '/round') {
  const live = loadLiveRound();
  if (live && !isResumable(live)) {
    clearLiveRound();
    // A round that reached Speaking is kept, without audio (handoff §9).
    if (live.phase === 'speaking') {
      const spoken = Math.max(0, (live.heartbeatAt - live.phaseStartedAt) / 1000);
      addSession(sessionFor(live, spoken, { audioNote: live.settings.recordAudio === false ? undefined : 'interrupted' }));
    }
    setFlash('That round got interrupted.');
  }
}

// Sync is best-effort and never blocks the app: it does nothing while signed
// out, offline, or built without cloud keys.
void syncNow();
window.addEventListener('online', () => void syncNow());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void syncNow();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
