import { useEffect, useState } from 'react';
import type { Session as AuthSession, User } from '@supabase/supabase-js';
import { cloudConfigured, supabase } from './supabase';

/*
 * Who is signed in, if anyone. The app never waits on this: it renders and
 * works while the session is still being restored, and turns sync on quietly
 * once someone is known.
 */

export type Account = {
  /** Null when signed out, or when the app was built without cloud keys. */
  user: User | null;
  /** True until the stored session has been checked, to avoid a flash of "signed out". */
  loading: boolean;
};

let cached: AuthSession | null = null;

export function useAccount(): Account {
  const [user, setUser] = useState<User | null>(cached?.user ?? null);
  const [loading, setLoading] = useState(cloudConfigured && !cached);

  useEffect(() => {
    if (!supabase) return;
    let live = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      cached = data.session;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      cached = session;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      live = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Sends the magic link. No passwords: one less thing to lose. */
export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'This copy of the app has no account set up.' };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}/` },
  });
  return { error: error?.message ?? null };
}

/**
 * Google, for the one-tap path — much less friction on a phone than opening
 * an email. Supabase sends the user out and back; the session is picked up
 * from the returning URL by detectSessionInUrl.
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'This copy of the app has no account set up.' };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/` },
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
