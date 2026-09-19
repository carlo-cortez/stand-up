/*
 * The round in progress, persisted so a refresh can resume it (handoff §9).
 * Written on entry to prep, on entry to speaking, and on every heartbeat —
 * never every frame.
 */

import type { RoundSettings } from './settings';

export type LiveRound = {
  /** Identifies one press of a Start button, so a refresh can tell itself apart from a new round. */
  startId: string;
  topicId: string;
  settings: RoundSettings;
  phase: 'prep' | 'speaking';
  /** clockNow() when the current phase began. */
  phaseStartedAt: number;
  skipUsed: boolean;
  /** Date.now() of the last write. */
  heartbeatAt: number;
};

const KEY = 'standup.liveRound';
const FLASH_KEY = 'standup.flash';

/** A refresh resumes silently only if the last heartbeat is this recent. */
export const RESUME_WINDOW_MS = 5_000;

export function loadLiveRound(): LiveRound | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LiveRound) : null;
  } catch {
    return null;
  }
}

export function saveLiveRound(round: Omit<LiveRound, 'heartbeatAt'>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...round, heartbeatAt: Date.now() }));
  } catch {
    // Without storage a refresh simply can't resume; the round itself is fine.
  }
}

export function clearLiveRound(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}

export function isResumable(round: LiveRound, now = Date.now()): boolean {
  return now - round.heartbeatAt < RESUME_WINDOW_MS;
}

/**
 * One quiet line for Home to show once, e.g. "That round got interrupted."
 * sessionStorage, so it never outlives the tab.
 */
export function setFlash(message: string): void {
  try {
    sessionStorage.setItem(FLASH_KEY, message);
  } catch {
    // Ignore.
  }
}

export function peekFlash(): string | null {
  try {
    return sessionStorage.getItem(FLASH_KEY);
  } catch {
    return null;
  }
}

export function clearFlash(): void {
  try {
    sessionStorage.removeItem(FLASH_KEY);
  } catch {
    // Ignore.
  }
}

/** What a Start button hands to /round through router state. */
export type RoundIntent = {
  startId: string;
  settings: RoundSettings;
  /** Set when a specific topic was chosen, e.g. the topic of the day. */
  topicId?: string;
};

export function newIntent(settings: RoundSettings, topicId?: string): RoundIntent {
  return { startId: crypto.randomUUID(), settings, topicId };
}
