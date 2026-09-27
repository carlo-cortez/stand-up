import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Ace } from '../components/Ace';
import { AudioPlayer } from '../components/AudioPlayer';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FeedbackCard } from '../components/FeedbackCard';
import { CloseIcon } from '../components/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { Sheet } from '../components/Sheet';
import { dayLabel } from '../lib/activity';
import { announce } from '../lib/announce';
import { deleteRecording, loadRecording } from '../lib/audioStore';
import { enoughSpeech, measure, requestFeedback } from '../lib/feedback';
import { mmss, plusMmss } from '../lib/format';
import { newIntent } from '../lib/liveRound';
import {
  getSession,
  loadSessions,
  roundNumber,
  updateSession,
  type Rating,
  type Ratings,
  type Session,
} from '../lib/sessions';
import { loadLastRoundSettings, loadSettings, roundSettingsOf } from '../lib/settings';
import { fetchRecording, removeRemoteRecording, syncNow } from '../lib/sync';
import { useDesktop } from '../lib/useMediaQuery';
import './Review.css';

const RATING_OPTIONS: { value: Rating; label: string }[] = [1, 2, 3, 4, 5].map((n) => ({
  value: n as Rating,
  label: String(n),
}));

const RATINGS: { key: keyof Ratings; label: string }[] = [
  { key: 'structure', label: 'Structure' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'fillers', label: 'Filler words' },
];

const AUDIO_NOTES: Record<NonNullable<Session['audioNote']>, string> = {
  'no-room': "There wasn't room to save the audio, so this round is saved without it.",
  interrupted: 'The page reloaded during this round, so there is no recording of it.',
  incomplete: 'The recording stopped when the app went to the background, so it ends early.',
};

/**
 * Handoff §4.5. One component for the round just finished (/round/review)
 * and a past one (/history/:sessionId). Order is deliberate: what happened,
 * then what you thought, then anything the app has to say.
 */
export default function Review() {
  const { sessionId } = useParams();
  const location = useLocation();
  const fromRound = !sessionId;
  const id =
    sessionId ??
    (location.state as { sessionId?: string } | null)?.sessionId ??
    loadSessions().at(-1)?.id;

  const [session, setSession] = useState(() => (id ? getSession(id) : undefined));

  if (!session) {
    return (
      <div className="screen review">
        <div className="screen__column review__missing">
          <h1 className="review__headline">That round isn't here any more.</h1>
          <Link to="/">Back to Home</Link>
        </div>
      </div>
    );
  }
  return <ReviewScreen session={session} setSession={setSession} fromRound={fromRound} />;
}

function ReviewScreen({
  session,
  setSession,
  fromRound,
}: {
  session: Session;
  setSession: (s: Session) => void;
  fromRound: boolean;
}) {
  const navigate = useNavigate();
  const desktop = useDesktop();

  // ---- Audio, loaded from IndexedDB. undefined while loading, null if gone.
  const hasAudio = Boolean(session.recordingId || session.recordingPath);
  const [blob, setBlob] = useState<Blob | null | undefined>(hasAudio ? undefined : null);
  useEffect(() => {
    if (!hasAudio) return;
    let live = true;
    void (async () => {
      // On the device that recorded it, it is already here; on another one,
      // fetch it once and keep it.
      const local = session.recordingId ? await loadRecording(session.recordingId) : null;
      const found = local ?? (await fetchRecording(session));
      if (live) setBlob(found);
    })();
    return () => {
      live = false;
    };
  }, [hasAudio, session]);

  // ---- Ratings and note save on change, so leaving by any route keeps them.
  const rate = (key: keyof Ratings, value: Rating) => {
    const next = updateSession(session.id, { ratings: { ...session.ratings, [key]: value } });
    if (next) setSession(next);
  };

  const [note, setNote] = useState(session.note ?? '');
  const pendingNote = useRef<string | null>(null);
  const flushNote = () => {
    if (pendingNote.current === null) return;
    updateSession(session.id, { note: pendingNote.current });
    pendingNote.current = null;
  };
  useEffect(() => {
    if (pendingNote.current === null) return;
    const timer = window.setTimeout(flushNote, 400);
    return () => window.clearTimeout(timer);
    // flushNote reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);
  // Leaving mid-sentence still keeps it.
  useEffect(() => {
    window.addEventListener('pagehide', flushNote);
    return () => {
      window.removeEventListener('pagehide', flushNote);
      flushNote();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Delete recording: the audio goes, ratings and notes stay.
  const [deleteAsked, setDeleteAsked] = useState(false);
  const confirmDelete = async () => {
    if (session.recordingId) await deleteRecording(session.recordingId);
    await removeRemoteRecording(session);
    const next = updateSession(session.id, { recordingId: undefined, recordingPath: undefined, audioNote: undefined });
    void syncNow();
    if (next) setSession(next);
    setBlob(null);
    setDeleteAsked(false);
    announce('Recording deleted. Your ratings and notes are still here.');
  };

  // ---- Feedback: asked for, never automatic (handoff §4.5).
  // 'thin' is a transcript with too little in it to say anything about. Rounds
  // measured before that existed still carry numbers; they read as thin too.
  const [feedbackState, setFeedbackState] = useState<'idle' | 'loading' | 'offline' | 'thin' | 'ready'>(
    session.transcript !== undefined && !enoughSpeech(session.transcript) ? 'thin' : session.metrics ? 'ready' : 'idle',
  );
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const runFeedback = async () => {
    if (!blob) return;
    if (!navigator.onLine) {
      setFeedbackState('offline');
      return;
    }
    setFeedbackState('loading');
    setFeedbackError(null);
    try {
      const { transcript, written } = await requestFeedback(blob, session.targetSeconds);
      // The counted half is derived here, from the transcript: no model, and
      // nothing to go wrong that would cost the round its numbers.
      if (!enoughSpeech(transcript)) {
        // Keep what was heard, but no numbers: zeros would read as results
        // and drag the averages down.
        const next = updateSession(session.id, { transcript, metrics: undefined, written: undefined });
        if (next) setSession(next);
        setFeedbackState('thin');
        void syncNow();
        announce('Not enough speech in this round for feedback');
        return;
      }
      const metrics = measure(transcript, session.spokenSeconds);
      const next = updateSession(session.id, { transcript, metrics, written: written ?? undefined });
      if (next) setSession(next);
      setFeedbackState('ready');
      void syncNow();
      announce(written ? 'Feedback ready' : 'Feedback ready, without the written part');
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : 'That did not work. Try again in a moment.');
      // A failed retry keeps the numbers it already had.
      setFeedbackState(session.metrics ? 'ready' : 'idle');
    }
  };

  const nextTopic = () => {
    const settings = loadLastRoundSettings() ?? roundSettingsOf(loadSettings());
    navigate('/round', { state: newIntent(settings) });
  };

  const over = session.spokenSeconds - session.targetSeconds;
  const label = `Round ${roundNumber(session.id)} · ${dayLabel(Date.parse(session.startedAt))}`;

  const summary = (
    <Card className="review__summary">
      <p className="review__topic">{session.topicText}</p>
      <div className="review__tiles">
        <div className="review__tile">
          <span className="review__tile-value tabular">{mmss(session.spokenSeconds)}</span>
          <span className="review__tile-label">Spoken</span>
        </div>
        <div className="review__tile">
          <span className="review__tile-value tabular">{mmss(session.targetSeconds)}</span>
          <span className="review__tile-label">Target</span>
        </div>
        {/* Overtime is the same neutral colour as the rest: never red, never "exceeded". */}
        <div className="review__tile">
          <span className="review__tile-value tabular">{over > 0 ? plusMmss(over) : '0:00'}</span>
          <span className="review__tile-label">Over</span>
        </div>
      </div>
    </Card>
  );

  // Absent entirely when the round was never recorded (handoff §4.5).
  const playback =
    hasAudio || session.audioNote ? (
      <Card className="review__playback">
        {blob && <AudioPlayer blob={blob} fallbackSeconds={session.spokenSeconds} />}
        {blob === undefined && <div className="review__player-placeholder" aria-hidden="true" />}
        {hasAudio && blob === null && (
          <p className="review__audio-note">This recording is no longer in this browser.</p>
        )}
        {session.audioNote && <p className="review__audio-note">{AUDIO_NOTES[session.audioNote]}</p>}
        {blob && (
          <Button variant="text" className="review__delete" onClick={() => setDeleteAsked(true)}>
            Delete recording
          </Button>
        )}
      </Card>
    ) : null;

  const ratings = (
    <Card className="review__ratings">
      <h2 className="section-label">How did it feel?</h2>
      {RATINGS.map(({ key, label }) => (
        <SegmentedControl
          key={key}
          legend={label}
          name={`rating-${key}`}
          layout="ratings"
          options={RATING_OPTIONS}
          value={session.ratings?.[key]}
          onChange={(value) => rate(key, value)}
        />
      ))}
      <div className="review__note">
        <label htmlFor="review-notes" className="review__note-label">
          One thing to try next time
        </label>
        <textarea
          id="review-notes"
          rows={3}
          placeholder="Slow down before the example."
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            pendingNote.current = e.target.value;
          }}
          onBlur={flushNote}
        />
      </div>
    </Card>
  );

  const feedback = (
    <FeedbackCard
      session={session}
      history={loadSessions()}
      state={feedbackState}
      error={feedbackError}
      onRun={blob ? () => void runFeedback() : undefined}
    />
  );

  const actions = (
    <div className="review__actions">
      <Button onClick={nextTopic}>Next topic</Button>
      <Button variant="secondary" onClick={() => navigate('/')}>
        Save and go home
      </Button>
    </div>
  );

  return (
    <div className="screen review">
      <div className="screen__column">
        <header className="review__header">
          <span className="section-label review__label">{label}</span>
          <Link to={fromRound ? '/' : '/history'} className="icon-button" aria-label="Close review">
            <CloseIcon />
          </Link>
        </header>
        {/* The celebration line is the same after every round, so Ace's hop
            marks finishing one — never how it went. Only on arrival from a
            round, not when a past one is reopened from History. */}
        <div className="review__hello">
          <h1 className="review__headline">Nice — that's the hard part done.</h1>
          {fromRound && <Ace pose="hop" className="review__ace" />}
        </div>

        <main className="review__body">
        {desktop ? (
          <div className="review__grid">
            <div className="review__column">
              {summary}
              {playback}
              {feedback}
            </div>
            <div className="review__column">
              {ratings}
              {actions}
            </div>
          </div>
        ) : (
          <>
            {summary}
            {playback}
            {ratings}
            {feedback}
            {actions}
          </>
        )}
        </main>
      </div>

      <Sheet open={deleteAsked} title="Delete this recording?" onCancel={() => setDeleteAsked(false)}>
        <p className="sheet__text">
          This one is permanent — the audio is gone for good. Your ratings and notes stay put, so your history keeps the
          progress.
        </p>
        <div className="sheet__actions">
          <Button variant="destructive" onClick={() => void confirmDelete()}>
            Delete recording
          </Button>
          <Button variant="secondary" onClick={() => setDeleteAsked(false)} data-autofocus>
            Keep it
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
