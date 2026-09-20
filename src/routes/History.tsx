import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { BackIcon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { averageRating, dayLabel, trendSentence, weeklyCounts } from '../lib/activity';
import { announce } from '../lib/announce';
import { deleteAllRecordings, deleteRecording } from '../lib/audioStore';
import { mmss } from '../lib/format';
import { newIntent } from '../lib/liveRound';
import { deleteSession, forgetAllRecordings, loadSessions, updateSession, type Session } from '../lib/sessions';
import { loadSettings, roundSettingsOf } from '../lib/settings';
import { categoryLabel } from '../lib/topics';
import './History.css';

const WEEK_BAR_MAX = 58; // px, from the artboard

/** Handoff §4.6: trend first, then the rounds, then the delete control. */
export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState(() => [...loadSessions()].reverse());
  const [askDelete, setAskDelete] = useState<Session | null>(null);
  const [askDeleteAll, setAskDeleteAll] = useState(false);

  const reload = () => setSessions([...loadSessions()].reverse());

  const start = () => navigate('/round', { state: newIntent(roundSettingsOf(loadSettings())) });

  const deleteRound = async (session: Session) => {
    if (session.recordingId) await deleteRecording(session.recordingId);
    deleteSession(session.id);
    setAskDelete(null);
    reload();
    announce('Round deleted');
  };

  const deleteAudioOnly = async (session: Session) => {
    if (session.recordingId) await deleteRecording(session.recordingId);
    updateSession(session.id, { recordingId: undefined, audioNote: undefined });
    setAskDelete(null);
    reload();
    announce('Recording deleted. The round is still here.');
  };

  const deleteEveryRecording = async () => {
    await deleteAllRecordings();
    forgetAllRecordings();
    setAskDeleteAll(false);
    reload();
    announce('Every recording deleted. Your rounds, ratings and notes are still here.');
  };

  const header = (
    <header className="history__header">
      <Link to="/" className="icon-button" aria-label="Back to home">
        <BackIcon />
      </Link>
      <h1 className="history__title">History</h1>
      <span className="history__spacer" aria-hidden="true" />
    </header>
  );

  if (sessions.length === 0) {
    return (
      <div className="screen history">
        <div className="screen__column">
          {header}
          <main className="history__empty">
            <EmptyMark />
            <div className="history__empty-text">
              <h2 className="history__empty-headline">Nothing here yet.</h2>
              <p className="history__empty-body">
                Once you've spoken a round, it lands here — the topic, how long you went, and how you rated yourself.
                Three minutes from now you'll have one.
              </p>
            </div>
          </main>
          <Button size="large" onClick={start}>
            Start practicing
          </Button>
        </div>
      </div>
    );
  }

  const weeks = weeklyCounts(sessions.map((s) => Date.parse(s.startedAt)));
  const tallest = Math.max(...weeks.map((w) => w.count), 1);
  const trend = trendSentence(
    [...sessions]
      .reverse()
      .map((s) => ({ at: Date.parse(s.startedAt), rating: averageRating(s.ratings) })),
    weeks,
  );
  const recordings = sessions.filter((s) => s.recordingId).length;

  return (
    <div className="screen history">
      <div className="screen__column">
        {header}

        <main className="history__body">
        <Card className="history__trend">
          <div className="history__trend-head">
            <span className="section-label">Last four weeks</span>
            <span className="history__trend-total">
              {sessions.length} {sessions.length === 1 ? 'round' : 'rounds'}
            </span>
          </div>
          <div className="history__bars">
            {weeks.map((week, i) => (
              <div key={i} className="history__bar">
                <span
                  className={`history__bar-fill${week.current ? ' is-current' : ''}`}
                  style={{ height: `${Math.max(6, (week.count / tallest) * WEEK_BAR_MAX)}px` }}
                />
                <span className={`history__bar-count${week.current ? ' is-current' : ''}`}>{week.count}</span>
              </div>
            ))}
          </div>
          <p className="history__trend-text">{trend}</p>
        </Card>

        <ul className="history__list">
          {sessions.map((session) => {
            const rating = averageRating(session.ratings);
            return (
              <li key={session.id} className="history__row">
                <Link to={`/history/${session.id}`} className="history__link">
                  <span className="history__meta">
                    <span>
                      {dayLabel(Date.parse(session.startedAt))} · {categoryLabel(session.category)}
                    </span>
                    <span className="tabular">{mmss(session.spokenSeconds)}</span>
                  </span>
                  <span className="history__topic">{session.topicText}</span>
                  {rating !== null && (
                    <span className="history__rating">
                      <span>Rated {rating.toFixed(1)}</span>
                      <span className="history__dots" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={n <= Math.round(rating) ? 'is-filled' : undefined} />
                        ))}
                      </span>
                    </span>
                  )}
                </Link>
                {/* The artboard's sheet needs a way in; this is it. */}
                <button
                  type="button"
                  className="history__more icon-button"
                  aria-label={`Delete options for ${session.topicText}`}
                  onClick={() => setAskDelete(session)}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="currentColor">
                    <circle cx="4" cy="10" r="1.6" />
                    <circle cx="10" cy="10" r="1.6" />
                    <circle cx="16" cy="10" r="1.6" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="history__footer">
          <Button onClick={start}>Start practicing</Button>
          {recordings > 0 && (
            <Button variant="text" className="history__delete-all" onClick={() => setAskDeleteAll(true)}>
              Delete all recordings
            </Button>
          )}
        </div>
        </main>
      </div>

      <Sheet open={askDelete !== null} title="Delete this whole round?" onCancel={() => setAskDelete(null)}>
        <p className="sheet__text">
          The recording, your ratings and your note all go, and they don't come back. If you only want the audio gone,
          delete the recording and keep the rest.
        </p>
        <div className="sheet__actions">
          <Button variant="destructive" onClick={() => askDelete && void deleteRound(askDelete)}>
            Delete the round
          </Button>
          <Button variant="secondary" onClick={() => askDelete && void deleteAudioOnly(askDelete)}>
            Delete the recording only
          </Button>
          <Button variant="text" onClick={() => setAskDelete(null)} data-autofocus>
            Cancel
          </Button>
        </div>
      </Sheet>

      <Sheet open={askDeleteAll} title="Delete every recording?" onCancel={() => setAskDeleteAll(false)}>
        <p className="sheet__text">
          The audio for all {recordings} {recordings === 1 ? 'round' : 'rounds'} goes for good. Your topics, ratings and
          notes stay put, so your history keeps the progress.
        </p>
        <div className="sheet__actions">
          <Button variant="destructive" onClick={() => void deleteEveryRecording()}>
            Delete all recordings
          </Button>
          <Button variant="secondary" onClick={() => setAskDeleteAll(false)} data-autofocus>
            Keep them
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function EmptyMark() {
  return (
    <svg width="96" height="80" viewBox="0 0 96 80" fill="none" aria-hidden="true">
      <rect x="41" y="28" width="14" height="24" rx="7" stroke="var(--accent)" strokeWidth="2.5" />
      <path
        d="M33 46a15 15 0 0 0 30 0"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M48 61v8" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 20h18M12 28h10M66 20h18M74 28h10" stroke="var(--border)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
