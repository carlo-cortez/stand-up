import { useEffect, useState } from 'react';

/*
 * "Add to home screen". The app has been installable since M4 (manifest and
 * service worker); this is only about saying so.
 *
 * Two worlds. Chromium browsers fire beforeinstallprompt, which we hold on to
 * and fire from our own button. iOS never does — Safari's only way is Share,
 * then Add to Home Screen — so there the card explains instead of installing.
 * Everywhere else (Firefox, desktop Safari) there is nothing useful to offer.
 */

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: InstallPrompt | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// Registered at import, from main.tsx: the event can fire before Home mounts.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // keep the browser's own mini-bar out of the way; ours asks at a calmer moment
  deferred = e as InstallPrompt;
  notify();
});
window.addEventListener('appinstalled', () => {
  installedNow = true;
  deferred = null;
  notify();
});

export function isInstalled(): boolean {
  return (
    installedNow ||
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone, iPod, or an iPad that says it's a Mac — but never anything that says Android. */
function isIOS(): boolean {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return false;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

const DISMISSED = 'standup.installDismissed';

export function installDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED) === '1';
  } catch {
    return false;
  }
}

export function dismissInstall(): void {
  try {
    localStorage.setItem(DISMISSED, '1');
  } catch {
    // Best-effort: the card comes back next visit, which is harmless.
  }
}

export type InstallState = {
  installed: boolean;
  /** 'prompt': our button can install. 'ios': explain Share, then Add to Home Screen. null: nothing to offer. */
  how: 'prompt' | 'ios' | null;
  install: () => Promise<boolean>;
};

export function useInstall(): InstallState {
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);

  const installed = isInstalled();
  const how = installed ? null : deferred ? 'prompt' : isIOS() ? 'ios' : null;

  const install = async () => {
    if (!deferred) return false;
    const event = deferred;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // A prompt can only be used once; Chrome fires a fresh event if it's still installable.
    deferred = null;
    notify();
    return outcome === 'accepted';
  };

  return { installed, how, install };
}
