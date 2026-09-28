import { currentUserId } from './account';
import { loadRecording, saveRecording } from './audioStore';
import {
  allSessions,
  getSession,
  purgeSyncedTombstones,
  putSessionFromCloud,
  unsyncedSessions,
  updateSession,
  type Session,
} from './sessions';
import { extensionFor, RECORDINGS_BUCKET, recordingPath, supabase } from './supabase';

/*
 * Sync, in one direction at a time and always local-first: a round is written
 * to this device the moment it ends, and reaches the server when it can. If
 * the network is down, or nobody is signed in, nothing here runs and nothing
 * is lost — the next sync picks it up.
 *
 * Conflicts are settled by updatedAt, last writer wins, which is right for one
 * person on a few devices. Deletes travel as tombstones so an older copy on
 * another device cannot resurrect a round.
 */

const CURSOR_KEY = 'standup.sync.cursor';
const SYNCED_AT_KEY = 'standup.sync.lastRun';

type Row = {
  id: string;
  user_id: string;
  started_at: string;
  topic_id: string;
  topic_text: string;
  category: string;
  difficulty: string;
  prep_seconds: number;
  target_seconds: number;
  spoken_seconds: number;
  recording_path: string | null;
  audio_note: string | null;
  ratings: Session['ratings'] | null;
  note: string | null;
  updated_at: string;
  deleted_at: string | null;
};

const toRow = (s: Session, userId: string): Row => ({
  id: s.id,
  user_id: userId,
  started_at: s.startedAt,
  topic_id: s.topicId,
  topic_text: s.topicText,
  category: s.category,
  difficulty: s.difficulty,
  prep_seconds: s.prepSeconds,
  target_seconds: s.targetSeconds,
  spoken_seconds: s.spokenSeconds,
  recording_path: s.recordingPath ?? null,
  audio_note: s.audioNote ?? null,
  ratings: s.ratings ?? null,
  note: s.note ?? null,
  updated_at: s.updatedAt ?? s.startedAt,
  deleted_at: s.deletedAt ?? null,
});

const fromRow = (row: Row): Session => ({
  id: row.id,
  startedAt: row.started_at,
  topicId: row.topic_id,
  topicText: row.topic_text,
  category: row.category as Session['category'],
  difficulty: row.difficulty as Session['difficulty'],
  prepSeconds: row.prep_seconds as Session['prepSeconds'],
  targetSeconds: row.target_seconds as Session['targetSeconds'],
  spokenSeconds: row.spoken_seconds,
  recordingPath: row.recording_path ?? undefined,
  audioNote: (row.audio_note as Session['audioNote']) ?? undefined,
  ratings: row.ratings ?? undefined,
  note: row.note ?? undefined,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at ?? undefined,
  syncedAt: row.updated_at,
});

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage is unavailable; the next sync simply starts from scratch.
  }
}

export function lastSyncedAt(): Date | null {
  const at = read(SYNCED_AT_KEY);
  return at ? new Date(at) : null;
}

let running: Promise<void> | null = null;

/** Safe to call often: overlapping calls share the one run. */
export function syncNow(): Promise<void> {
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}

async function run(): Promise<void> {
  if (!supabase || !navigator.onLine) return;
  const userId = await currentUserId();
  if (!userId) return;

  try {
    await pull(userId);
    await push(userId);
    await uploadPending(userId);
    purgeSyncedTombstones();
    write(SYNCED_AT_KEY, new Date().toISOString());
  } catch {
    // Offline, signed out mid-run, or the server said no: keep what is local
    // and try again next time. Nothing is dropped by failing here.
  }
}

/** Everything the server has heard since we last asked. */
async function pull(userId: string): Promise<void> {
  const since = read(CURSOR_KEY) ?? '1970-01-01T00:00:00Z';
  const { data, error } = await supabase!
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', since)
    .order('updated_at', { ascending: true });
  if (error) throw error;

  for (const row of (data ?? []) as Row[]) {
    const remote = fromRow(row);
    const local = allSessions().find((s) => s.id === remote.id);
    // The newer change wins; a local edit still waiting to go up is newer.
    if (local && (local.updatedAt ?? local.startedAt) > remote.updatedAt!) continue;
    // Feedback never goes to the server, so a newer copy from another device
    // arrives without it. Keep this device's, or rating a round on the laptop
    // would wipe the feedback the phone fetched for it.
    putSessionFromCloud({
      ...remote,
      recordingId: local?.recordingId,
      transcript: local?.transcript,
      metrics: local?.metrics,
      written: local?.written,
    });
    write(CURSOR_KEY, row.updated_at);
  }
}

/** Everything this device has changed since it last reached the server. */
async function push(userId: string): Promise<void> {
  const pending = unsyncedSessions();
  if (pending.length === 0) return;

  const rows = pending.map((s) => toRow(s, userId));
  const { error } = await supabase!.from('sessions').upsert(rows);
  if (error) throw error;

  for (const session of pending) {
    updateSession(session.id, { syncedAt: session.updatedAt ?? session.startedAt });
  }
}

/** Recordings that exist here but not up there. */
async function uploadPending(userId: string): Promise<void> {
  for (const session of allSessions()) {
    if (session.deletedAt || !session.recordingId || session.recordingPath) continue;
    const blob = await loadRecording(session.recordingId);
    if (!blob) continue;

    const path = recordingPath(userId, session.id, extensionFor(blob));
    const { error } = await supabase!.storage.from(RECORDINGS_BUCKET).upload(path, blob, {
      contentType: blob.type || 'audio/webm',
      upsert: true,
    });
    if (error) throw error;

    updateSession(session.id, { recordingPath: path });
    const updated = getSession(session.id);
    if (updated) {
      const { error: rowError } = await supabase!.from('sessions').upsert(toRow(updated, userId));
      if (rowError) throw rowError;
      updateSession(session.id, { syncedAt: updated.updatedAt });
    }
  }
}

/**
 * Fetch a recording this device has never held — the round was spoken
 * somewhere else. Cached locally afterwards, so it plays instantly next time.
 */
export async function fetchRecording(session: Session): Promise<Blob | null> {
  if (!supabase || !session.recordingPath) return null;
  const { data, error } = await supabase.storage.from(RECORDINGS_BUCKET).download(session.recordingPath);
  if (error || !data) return null;
  const id = session.recordingId ?? session.id;
  await saveRecording(id, data);
  if (!session.recordingId) updateSession(session.id, { recordingId: id });
  return data;
}

/** Remove one recording from the server, when the round keeps its ratings. */
export async function removeRemoteRecording(session: Session): Promise<void> {
  if (!supabase || !session.recordingPath) return;
  await supabase.storage.from(RECORDINGS_BUCKET).remove([session.recordingPath]);
}

/** Everything of this person's, gone from the server as well as the device. */
export async function deleteEverythingRemote(): Promise<void> {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  const paths = allSessions()
    .map((s) => s.recordingPath)
    .filter((p): p is string => Boolean(p));
  if (paths.length > 0) await supabase.storage.from(RECORDINGS_BUCKET).remove(paths);
  await supabase.from('sessions').delete().eq('user_id', userId);
  try {
    localStorage.removeItem(CURSOR_KEY);
    localStorage.removeItem(SYNCED_AT_KEY);
  } catch {
    // Nothing to clear.
  }
}
