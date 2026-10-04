/*
 * Finished rounds (handoff §6). Metadata lives in localStorage as one small
 * list; audio lives separately in IndexedDB (audioStore.ts), linked by
 * recordingId, so deleting a recording never touches the round itself.
 */

import type { LiveRound } from './liveRound';
import { topicById, type Category, type Difficulty, type Structure } from './topics';

export type Rating = 1 | 2 | 3 | 4 | 5;

export type Ratings = {
  structure?: Rating;
  clarity?: Rating;
  confidence?: Rating;
  fillers?: Rating;
};

export type Flagged = { word: string; kind: 'filler' | 'vague' | 'hedge'; count: number };

/** From Groq's word and segment timings (PR B). Absent on rounds measured before. */
export type Delivery = {
  /** Words per minute in each 15-second stretch, in order. */
  paceWindows: number[];
  /** How much the pace wandered: the windows' spread as a % of their average. */
  paceSpread: number;
  /** Gaps of a second or more between words. */
  pauses: number;
  /** Gaps of 1.5 s or more in the middle of a sentence. */
  hesitations: number;
  /** The longest gap, in seconds. */
  longestPause: number;
  /** 0–100: how sure the transcriber was of what it heard. Not a pronunciation test. */
  clarity: number | null;
};

/** Measured on the phone from the recording itself; the audio never leaves for this. */
export type Voice = {
  /** Spread of the voice's pitch, in semitones: low is level, high is lively. */
  pitchVariety: number;
  /** Spread of loudness while speaking, in decibels. */
  loudnessSpread: number;
  /** Sentences whose ends dropped noticeably in volume. */
  trailingOff: number;
  /** Sentences that ended on a rising pitch. */
  upspeak: number;
  /** Sentences long enough to judge, which the two counts above are out of. */
  sentences: number;
};

export type Metrics = {
  wordsPerMinute: number;
  /** Total occurrences, not distinct words. */
  fillerWords: number;
  vagueWords: number;
  flagged: Flagged[];
  /** "I think", "maybe", "probably"… Absent on rounds measured before. */
  hedges?: number;
  delivery?: Delivery;
  /** Null when the phone couldn't analyse the recording; feedback carries on without it. */
  voice?: Voice | null;
};

export type Mark = 'there' | 'partly' | 'not-yet';

export type Check = { mark: Mark; note: string };

/**
 * What the coach noticed, against the shape the prep hint taught for that
 * topic, plus whether it was answered: Point–Reason–Example–Point for most,
 * Situation–Task–Action–Result for a question about a time you did something.
 * Marks, never numbers; the notes describe, and the one thing to change stays
 * in tryNextTime. Absent on rounds written before it existed.
 */
export type PrepCriteria = Record<'point' | 'reason' | 'example' | 'landed' | 'answered', Check>;
export type StarCriteria = Record<'situation' | 'task' | 'action' | 'result' | 'answered', Check>;
export type Criteria = PrepCriteria | StarCriteria;

export type Written = {
  wentWell: string;
  /** The user's own sentence, verbatim, so the rewrite has something to sit against. */
  quoted: string;
  sharper: string;
  tryNextTime: string;
  /** Which shape the criteria follow; absent means PREP, as every round was before STAR. */
  structure?: Structure;
  criteria?: Criteria;
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

  // ---- Feedback (M2.5). Absent until the user asks for it, and absent for
  // good if they never do. Deleting the audio does not touch any of it.
  transcript?: string;
  metrics?: Metrics;
  /** The model-written half. The counted half stands on its own without it. */
  written?: Written;

  // ---- Sync (see sync.ts). Harmless and unused while signed out.
  /** Last local change, ISO. Last writer wins between devices. */
  updatedAt?: string;
  /** A tombstone: the round is gone, but the fact of it must reach other devices. */
  deletedAt?: string;
  /** Where the audio sits in cloud storage, once uploaded. */
  recordingPath?: string;
  /** updatedAt at the moment this round last reached the server. */
  syncedAt?: string;
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

/** Live rounds, newest last. Tombstones are for sync only and never shown. */
export function loadSessions(): Session[] {
  return allSessions().filter((s) => !s.deletedAt);
}

/** Including tombstones — sync needs them; nothing else should. */
export function allSessions(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as Session[];
  } catch {
    return [];
  }
}

function stamp(session: Session): Session {
  return { ...session, updatedAt: new Date().toISOString() };
}

export function getSession(id: string): Session | undefined {
  return loadSessions().find((s) => s.id === id);
}

export function addSession(session: Session): void {
  write([...allSessions(), stamp(session)]);
}

/** Straight from the server: no new timestamp, or it would never settle. */
export function putSessionFromCloud(session: Session): void {
  const rest = allSessions().filter((s) => s.id !== session.id);
  write([...rest, session].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt)));
}

export function updateSession(id: string, patch: Partial<Session>): Session | undefined {
  let updated: Session | undefined;
  write(
    allSessions().map((s) => {
      if (s.id !== id) return s;
      updated = stamp({ ...s, ...patch });
      return updated;
    }),
  );
  return updated;
}

/** 1-based position among all rounds, for "Round 3 · today". */
export function roundNumber(id: string): number {
  return loadSessions().findIndex((s) => s.id === id) + 1;
}

/** Rounds whose latest change has not reached the server yet. */
export function unsyncedSessions(): Session[] {
  return allSessions().filter((s) => !s.syncedAt || (s.updatedAt ?? '') > s.syncedAt);
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

/**
 * A delete leaves a tombstone rather than a hole, so another device cannot
 * hand the round back on the next sync. The round's content goes at once.
 */
export function deleteSession(id: string): void {
  const now = new Date().toISOString();
  write(
    allSessions().map((s) =>
      s.id === id
        ? { ...s, deletedAt: now, updatedAt: now, recordingId: undefined, recordingPath: undefined, note: undefined, ratings: undefined }
        : s,
    ),
  );
}

/** Tombstones that have reached the server are no longer worth keeping. */
export function purgeSyncedTombstones(): void {
  write(allSessions().filter((s) => !(s.deletedAt && s.syncedAt && s.syncedAt >= (s.updatedAt ?? ''))));
}

/** Drops every recordingId, keeping the rounds themselves. */
export function forgetAllRecordings(): void {
  write(
    allSessions().map(({ recordingId: _dropped, recordingPath: _path, audioNote: _also, ...rest }) =>
      rest.deletedAt ? rest : stamp(rest),
    ),
  );
}
