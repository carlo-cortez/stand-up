import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/*
 * The cloud half of the app: an account, so rounds follow you between
 * devices. It is optional by design — with no keys configured, or nobody
 * signed in, everything works exactly as it did, on the device alone.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False when the app was built without Supabase keys: local-only mode. */
export const cloudConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = cloudConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The magic link comes back as a URL fragment; take it and tidy up.
        detectSessionInUrl: true,
      },
    })
  : null;

export const RECORDINGS_BUCKET = 'recordings';

/** Where one person's audio lives: a folder per user, which the storage policy enforces. */
export function recordingPath(userId: string, sessionId: string, extension: string): string {
  return `${userId}/${sessionId}.${extension}`;
}

/** webm on Chrome and Firefox, mp4 on Safari — keep whatever the recorder produced. */
export function extensionFor(blob: Blob): string {
  if (blob.type.includes('mp4') || blob.type.includes('m4a')) return 'mp4';
  if (blob.type.includes('ogg')) return 'ogg';
  return 'webm';
}
