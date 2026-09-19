/*
 * Recordings, in IndexedDB (handoff §1). Some browsers block IndexedDB in
 * private windows; then recordings are kept in memory for this visit only and
 * Home says so once, quietly (handoff §9).
 */

type Stored = { id: string; blob: Blob; createdAt: number };

const DB_NAME = 'standup';
const STORE = 'recordings';

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, Blob>();

function open(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        if (!db) return reject(new Error('unavailable'));
        const tx = db.transaction(STORE, mode);
        const request = body(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

/** True when recordings will outlive this visit. */
export async function isPersistent(): Promise<boolean> {
  return (await open()) !== null;
}

export type SaveResult = 'saved' | 'memory' | 'no-room';

export async function saveRecording(id: string, blob: Blob): Promise<SaveResult> {
  if (!(await open())) {
    memory.set(id, blob);
    return 'memory';
  }
  try {
    await run('readwrite', (store) => store.put({ id, blob, createdAt: Date.now() } satisfies Stored));
    return 'saved';
  } catch (error) {
    // Quota is the likely failure; the round is kept without its audio.
    if (error instanceof DOMException && error.name === 'QuotaExceededError') return 'no-room';
    return 'no-room';
  }
}

export async function loadRecording(id: string): Promise<Blob | null> {
  if (memory.has(id)) return memory.get(id)!;
  try {
    const row = await run<Stored | undefined>('readonly', (store) => store.get(id));
    return row?.blob ?? null;
  } catch {
    return null;
  }
}

/** Resolves only once the audio is really gone. */
export async function deleteRecording(id: string): Promise<void> {
  memory.delete(id);
  if (!(await open())) return;
  await run('readwrite', (store) => store.delete(id));
}
