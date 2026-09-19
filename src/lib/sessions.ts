/*
 * Finished rounds (handoff §6). Metadata lives in localStorage as one small
 * list; audio lives separately in IndexedDB (audioStore.ts), linked by
 * recordingId, so deleting a recording never touches the round itself.
 */

import type { LiveRound } from './liveRound';
import { topicById, type Category, type Difficulty } from './topics';

export type Rating = 1 | 2 | 3 | 4 | 5;

export type Ratings = {
  structure?: Rating;
  clarity?: Rating;
  confidence?: Rating;
  fillers?: Rating;
};

export type Session = {
  id: string;
  startedAt: string; // ISO
  topicId: string;
  topicText: string; // denormalised: topics may change or be generated later
  category: Category;
  difficulty: Difficulty;
  prepSeconds: 15 | 30 | 60;
  targetSeconds: 60 | 120 | 180;
  spokenSeconds: number; // may exceed target
  /** Absent once audio is deleted, or if it was never made. */
  recordingId?: string;
  /** Why a round that should have audio has less than all of it. */
  audioNote?: 'incomplete' | 'no-room' | 'interrupted';
  ratings?: Ratings;
  note?: string;
};

const KEY = 'standup.sessions';
const LEGACY_KEY = 'standup.rounds';

function write(sessions: Session[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch {
    // Metadata is tiny; if even this fails, storage is unavailable for the visit.
  }
}

export function loadSessions(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as Session[];
  } catch {
    return [];
  }
}

export function getSession(id: string): Session | undefined {
  return loadSessions().find((s) => s.id === id);
}

export function addSession(session: Session): void {
  write([...loadSessions(), session]);
}

export function updateSession(id: string, patch: Partial<Session>): Session | undefined {
  let updated: Session | undefined;
  write(
    loadSessions().map((s) => {
      if (s.id !== id) return s;
      updated = { ...s, ...patch };
      return updated;
    }),
  );
  return updated;
}

/** 1-based position among all rounds, for "Round 3 · today". */
export function roundNumber(id: string): number {
  return loadSessions().findIndex((s) => s.id === id) + 1;
}

/**
 * Rounds finished during Phase 1 were kept as bare { at, spokenSeconds }.
 * They still count on Home, so the two lists are read together there.
 */
export function loadLegacyRounds(): { at: number; spokenSeconds: number }[] {
  try {
    return JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
  } catch {
    return [];
  }
}

/** The record of a round that reached Speaking, ready to save. */
export function sessionFor(
  round: LiveRound,
  spokenSeconds: number,
  extra: Partial<Pick<Session, 'id' | 'recordingId' | 'audioNote'>> = {},
): Session {
  const topic = topicById(round.topicId)!;
  return {
    id: extra.id ?? crypto.randomUUID(),
    startedAt: new Date(Date.now() - spokenSeconds * 1000).toISOString(),
    topicId: topic.id,
    topicText: topic.text,
    category: topic.category,
    difficulty: topic.difficulty,
    prepSeconds: round.settings.prepSeconds,
    targetSeconds: round.settings.targetSeconds,
    spokenSeconds: Math.round(spokenSeconds),
    recordingId: extra.recordingId,
    audioNote: extra.audioNote,
  };
}
