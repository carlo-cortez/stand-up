import { Link } from 'react-router-dom';
import { BackIcon } from '../components/Icon';
import { cloudConfigured } from '../lib/supabase';
import './Setup.css';
import './Privacy.css';

/*
 * What happens to a person's voice, in plain words. Written to be true rather
 * than to be safe: every claim here is about something this codebase actually
 * does, and the one thing it cannot promise — what Groq keeps at their end —
 * says so and links out instead.
 *
 * Google sign-in cannot be published without a page at this URL.
 */

/** Kept here rather than built at render time, so the page states one date. */
const UPDATED = '4 October 2026';

export default function Privacy() {
  return (
    <div className="screen setup">
      <div className="screen__column">
        <header className="setup__header">
          <Link to="/" className="icon-button" aria-label="Back to home">
            <BackIcon />
          </Link>
          <h1 className="setup__title">Your data</h1>
          <span className="setup__spacer" aria-hidden="true" />
        </header>

        <main className="setup__form privacy">
          <p className="privacy__lede">
            This is a practice app for talking out loud. It records your voice, so it is worth being exact about where
            that recording goes. The short version: it stays on your device unless you sign in or ask for feedback, and
            you can delete all of it at any time.
          </p>

          <section className="privacy__section">
            <h2 className="section-label">On your device</h2>
            <p>
              Your rounds, their timings, your ratings and your notes are stored in this browser. Recordings are stored
              here too, separately from the rounds, which is why deleting the audio leaves everything else standing.
            </p>
            <p>
              None of it is sent anywhere by default. Clearing your browser's data for this site removes it, and so does
              the Delete all data button in Settings.
            </p>
          </section>

          {cloudConfigured && (
            <section className="privacy__section">
              <h2 className="section-label">If you sign in</h2>
              <p>
                Signing in is optional, and the app works fully without it. If you do, your rounds and recordings are
                copied to a database and file store run by Supabase, so they reach your other devices and survive losing
                this one. Your email address is kept so you can sign in again.
              </p>
              <p>
                Each account can read only its own rounds. That is enforced by the database itself, not by this app
                being careful.
              </p>
            </section>
          )}

          <section className="privacy__section">
            <h2 className="section-label">When you ask for feedback</h2>
            <p>
              Feedback is something you press, never something that happens on its own. When you press it, that one
              recording is sent to <strong>Groq</strong>, which turns it into text, with the time each word was said,
              and writes the feedback you read. Nothing about the round is stored on the way through — this app keeps
              no copy of the audio or the transcript on its server.
            </p>
            <p>
              How your voice moved — pitch, volume, how sentences ended — is measured on your phone, from the recording
              already there. That part never leaves it.
            </p>
            <p>
              What Groq keeps at their end is their decision rather than ours, and it is covered by{' '}
              <a href="https://groq.com/privacy-policy/" target="_blank" rel="noreferrer noopener">
                their privacy policy
              </a>
              . If you would rather no recording ever left the device, do not use feedback — everything else in the app
              works without it.
            </p>
          </section>

          <section className="privacy__section">
            <h2 className="section-label">What is never collected</h2>
            <p>
              There is no analytics, no tracking, no advertising and no third-party scripts watching you use this. Your
              rounds are not read, scored or used to train anything.
            </p>
            <p>
              One exception worth naming: the fonts are served by Google Fonts, so loading the page tells Google your IP
              address, as visiting any site that uses them does.
            </p>
          </section>

          <section className="privacy__section">
            <h2 className="section-label">Deleting it</h2>
            <p>
              <Link to="/settings">Settings</Link> has two buttons. Delete all recordings removes every audio file and
              keeps your rounds, ratings and notes. Delete all data removes the lot. Both act on this device and, if you
              are signed in, on the server copy too.
            </p>
          </section>

          <section className="privacy__section">
            <h2 className="section-label">Asking about any of this</h2>
            <p>
              Find me on GitHub as{' '}
              <a href="https://github.com/carlo-cortez" target="_blank" rel="noreferrer noopener">
                carlo-cortez
              </a>
              .
            </p>
          </section>

          <p className="privacy__updated">Last updated {UPDATED}.</p>
        </main>
      </div>
    </div>
  );
}
