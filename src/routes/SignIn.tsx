import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { BackIcon } from '../components/Icon';
import { sendMagicLink } from '../lib/account';
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
