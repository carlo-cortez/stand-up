import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { BackIcon } from '../components/Icon';
import { sendMagicLink, signInWithGoogle } from '../lib/account';
import { cloudConfigured } from '../lib/supabase';
import './Setup.css';

/*
 * An account is optional. Everything works without one; signing in only adds
 * the copy that follows you between devices. No passwords — a link by email,
 * which is one fewer thing to lose.
 */
export default function SignIn() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setState('sending');
    setError(null);
    const { error: failed } = await sendMagicLink(email.trim());
    if (failed) {
      setError(failed);
      setState('idle');
      return;
    }
    setState('sent');
  };

  return (
    <div className="screen setup">
      <div className="screen__column">
        <header className="setup__header">
          <Link to="/settings" className="icon-button" aria-label="Back to settings">
            <BackIcon />
          </Link>
          <h1 className="setup__title">Keep your rounds</h1>
          <span className="setup__spacer" aria-hidden="true" />
        </header>

        <main className="setup__form">
          {!cloudConfigured ? (
            <p className="settings__note">
              This copy of the app runs on your device only. Accounts are switched off here.
            </p>
          ) : state === 'sent' ? (
            <div className="signin__sent">
              <h2 className="signin__headline">Check your email.</h2>
              <p className="settings__note">
                There's a link waiting at {email}. Open it on this device and you'll be signed in — no password to
                remember.
              </p>
              <Button variant="secondary" onClick={() => setState('idle')}>
                Use a different address
              </Button>
            </div>
          ) : (
            <form className="signin__form" onSubmit={(e) => void submit(e)}>
              <p className="settings__note">
                Your rounds, ratings, notes and recordings are kept on this device. Sign in and they follow you to your
                other ones, and survive losing this one.
              </p>

              <Button
                type="button"
                variant="secondary"
                size="large"
                className="signin__google"
                onClick={() =>
                  void signInWithGoogle().then(({ error: failed }) => failed && setError(failed))
                }
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
                  <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
                </svg>
                Continue with Google
              </Button>

              <div className="signin__or">
                <span>or by email</span>
              </div>
              <div className="signin__field">
                <label htmlFor="signin-email" className="review__note-label">
                  Email
                </label>
                <input
                  id="signin-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="signin__error">{error}</p>}
              <Button type="submit" size="large" disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : 'Email me a link'}
              </Button>
              <p className="settings__note">You can keep practising without an account. Nothing here is required.</p>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
