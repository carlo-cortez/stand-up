import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useBlocker, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CardDraw } from '../components/CardDraw';
import { CountdownRing } from '../components/CountdownRing';
import { ChevronDownIcon, CloseIcon, MicOffIcon } from '../components/Icon';
import { ProgressBar } from '../components/ProgressBar';
import { Sheet } from '../components/Sheet';
import { TimingChip } from '../components/TimingChip';
import { saveRecording } from '../lib/audioStore';
import { checkMic, micPermission, startRecording, type Recording } from '../lib/recorder';
import { addSession, sessionFor, type Session } from '../lib/sessions';
import { syncNow } from '../lib/sync';
import { announce } from '../lib/announce';
import { countdown, mmss, plusMmss } from '../lib/format';
import {
  clearLiveRound,
  isResumable,
  loadLiveRound,
  newIntent,
  saveLiveRound,
  setFlash,
  type LiveRound,
  type RoundIntent,
} from '../lib/liveRound';
import {
  loadRecentTopics,
  loadSettings,
  rememberTopic,
  roundSettingsOf,
  saveLastRoundSettings,
  saveSettings,
} from '../lib/settings';
import { categoryLabel, difficultyLabel, pickTopic, topicById, type Topic } from '../lib/topics';
import { useDesktop, useReducedMotion } from '../lib/useMediaQuery';
import { clockNow, timingLight, useRoundTimer } from '../lib/useRoundTimer';
import './Round.css';

type Start = { round: LiveRound; resumed: boolean } | { interrupted: LiveRound };

/*
 * The topic reveal: the user draws a card. The draw itself is untimed; once a
 * card is picked, prep is scheduled to begin when its animation ends —
 * phaseStartedAt sits in the future while the card lifts, flips and dissolves
 * — so the suspense never costs thinking time, and a refresh mid-flip needs
 * no special handling.
 */
const CARD_MS = 1700;

function revealDelay(ms: number): number {
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
}

/**
 * Handoff §9, refresh mid-round. A persisted round belongs to this visit if
 * no Start button sent us here, or if the one that did has the same startId —
 * that is a reload of the same history entry. Anything else is a new round.
 */
function resolveStart(intent: RoundIntent | null): Start {
  const persisted = loadLiveRound();
  if (persisted && (!intent || persisted.startId === intent.startId)) {
    return isResumable(persisted) ? { round: persisted, resumed: true } : { interrupted: persisted };
  }

  const { startId, settings, topicId } = intent ?? newIntent(roundSettingsOf(loadSettings()));
  const topic = (topicId && topicById(topicId)) || pickTopic({ ...settings, exclude: loadRecentTopics() });
  return {
    resumed: false,
    round: {
      startId,
      settings,
      topicId: topic.id,
      // A topic picked by hand (Topic of the day) is already known: no draw.
      phase: topicId ? 'prep' : 'draw',
      phaseStartedAt: clockNow(),
      skipUsed: false,
    } as LiveRound,
  };
}

export default function Round() {
  const location = useLocation();
  const navigate = useNavigate();
  const [start] = useState(() => resolveStart((location.state as RoundIntent | null) ?? null));

  // Handoff §9: a round interrupted for more than five seconds is not resumed.
  // If it had reached Speaking, what was captured is kept and shown on Review
  // (without audio — a MediaRecorder does not survive a reload); otherwise
  // Home says so in one quiet line.
  useEffect(() => {
    if (!('interrupted' in start)) return;
    const live = start.interrupted;
    clearLiveRound();
    if (live.phase === 'speaking') {
      const spoken = Math.max(0, (live.heartbeatAt - live.phaseStartedAt) / 1000);
      const session = sessionFor(live, spoken, {
        audioNote: live.settings.recordAudio === false ? undefined : 'interrupted',
      });
      addSession(session);
      navigate('/round/review', { replace: true, state: { sessionId: session.id } });
    } else {
      setFlash('That round got interrupted.');
      navigate('/', { replace: true });
    }
  }, [start, navigate]);

  if ('interrupted' in start) return null;
  return <LiveRoundScreen initial={start.round} resumed={start.resumed} />;
}

function LiveRoundScreen({ initial, resumed }: { initial: LiveRound; resumed: boolean }) {
  const navigate = useNavigate();
  const desktop = useDesktop();
  const reducedMotion = useReducedMotion();

  const [round, setRound] = useState(initial);
  const roundRef = useRef(round);
  useLayoutEffect(() => {
    roundRef.current = round;
  });

  const topic = topicById(round.topicId) as Topic;
  const { prepSeconds, targetSeconds } = round.settings;

  const now = useRoundTimer(true, () => saveLiveRound(roundRef.current));

  // ---- Recording (handoff §4.4). Speaking only, never prep.
  const wantsAudio = round.settings.recordAudio !== false;
  // A refresh loses the recorder; a round resumed mid-Speaking goes on unrecorded.
  const resumedIntoSpeaking = resumed && initial.phase === 'speaking';
  const recording = useRef<Recording | null>(null);
  const [recordingOn, setRecordingOn] = useState(false);
  const audioIncomplete = useRef(resumedIntoSpeaking && wantsAudio);

  // What the browser will say when asked, so the draw screen can warn first.
  const [micState, setMicState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  useEffect(() => {
    if (!wantsAudio) return;
    void micPermission().then(setMicState);
  }, [wantsAudio]);

  // Ask for the mic as the round begins, so the prompt never lands mid-sentence.
  useEffect(() => {
    if (wantsAudio && !resumed) void checkMic();
    // Once per round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (round.phase !== 'speaking' || !wantsAudio || resumedIntoSpeaking) return;
    let cancelled = false;
    void startRecording().then((result) => {
      if (typeof result === 'string') return; // blocked or unavailable: the round goes on
      if (cancelled) return result.discard();
      recording.current = result;
      setRecordingOn(true);
    });
    return () => {
      cancelled = true;
    };
  }, [round.phase, wantsAudio, resumedIntoSpeaking]);

  // A phone may suspend the recorder when the user switches apps. Mark the
  // round rather than quietly producing a truncated file (handoff §9).
  useEffect(() => {
    const onVisibility = () => {
      if (recording.current && !recording.current.isHealthy()) {
        audioIncomplete.current = true;
        setRecordingOn(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Leaving by any route other than Finish throws the audio away.
  const finished = useRef(false);
  useEffect(
    () => () => {
      if (!finished.current) recording.current?.discard();
    },
    [],
  );

  // ---- Persistence: on entry to prep, on entry to speaking, on a new topic.
  useEffect(() => {
    saveLiveRound(round);
  }, [round]);

  useEffect(() => {
    rememberTopic(round.topicId);
  }, [round.topicId]);

  // ---- Timing, always derived from the clock, never accumulated.
  const sinceStart = (now - round.phaseStartedAt) / 1000;
  const revealing = round.phase === 'prep' && sinceStart < 0;
  const prepRemaining = prepSeconds - Math.max(0, sinceStart);
  const elapsed = round.phase === 'speaking' ? Math.max(0, sinceStart) : 0;
  const remaining = targetSeconds - elapsed;
  const light = timingLight(remaining, targetSeconds);

  // Prep runs out → Speaking, with no interstitial. Speaking starts at the
  // instant prep ended, not when this effect happens to run, so a round that
  // hit zero in a background tab is already the right number of seconds in.
  const prepOver = round.phase === 'prep' && prepRemaining <= 0;
  useEffect(() => {
    if (!prepOver) return;
    // The trigger is the clock crossing zero, which only the rAF loop sees,
    // and the phase change must be persisted, so this belongs in an effect.
    // oxlint-disable-next-line react/set-state-in-effect
    setRound((r) => ({ ...r, phase: 'speaking', phaseStartedAt: r.phaseStartedAt + r.settings.prepSeconds * 1000 }));
  }, [prepOver]);

  // ---- Announcements at meaningful moments only (handoff §7).
  // Keyed on phase and topic, so a skip re-announces prep, a resumed round
  // stays silent, and StrictMode's second effect run is a no-op.
  const phaseKey = `${round.phase}:${round.topicId}`;
  const lastAnnounced = useRef(resumed ? phaseKey : null);
  useEffect(() => {
    if (round.phase === 'draw' || revealing || lastAnnounced.current === phaseKey) return;
    lastAnnounced.current = phaseKey;
    announce(
      round.phase === 'prep'
        ? `Prep started, ${prepSeconds} seconds`
        : `Speaking started, ${targetSeconds / 60} ${targetSeconds === 60 ? 'minute' : 'minutes'}`,
    );
  }, [phaseKey, revealing, round.phase, prepSeconds, targetSeconds]);

  const overtime = round.phase === 'speaking' && light === 'over';
  const wasOvertime = useRef(overtime);
  useEffect(() => {
    if (overtime && !wasOvertime.current) announce("Time's up, still going");
    wasOvertime.current = overtime;
  }, [overtime]);

  // ---- Leaving. Back asks first; so does the close button.
  const leaving = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  );
  const [closeAsked, setCloseAsked] = useState(false);
  const sheetOpen = blocker.state === 'blocked' || closeAsked;

  const keepGoing = () => {
    setCloseAsked(false);
    if (blocker.state === 'blocked') blocker.reset();
  };

  const leave = () => {
    leaving.current = true;
    recording.current?.discard();
    clearLiveRound();
    setCloseAsked(false);
    if (blocker.state === 'blocked') blocker.proceed();
    else navigate('/', { replace: true });
  };

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // ---- Actions.
  const startNow = () => setRound((r) => ({ ...r, phase: 'speaking', phaseStartedAt: clockNow() }));

  const skip = () => {
    if (round.skipUsed) return;
    const next = pickTopic({
      ...round.settings,
      exclude: [round.topicId, ...loadRecentTopics()],
    });
    setPicked(null);
    setRound((r) => ({ ...r, topicId: next.id, phase: 'draw', phaseStartedAt: clockNow(), skipUsed: true }));
  };

  // Which card was drawn. Local to this screen: after a refresh mid-flip the
  // prep screen simply shows, waiting out the last of the animation.
  const [picked, setPicked] = useState<number | null>(null);
  const draw = (card: number) => {
    setPicked(card);
    setRound((r) => ({ ...r, phase: 'prep', phaseStartedAt: clockNow() + revealDelay(CARD_MS) }));
  };

  const finish = async () => {
    if (finished.current) return;
    finished.current = true;
    leaving.current = true;
    const spoken = elapsed;
    const id = crypto.randomUUID();

    let recordingId: string | undefined;
    let audioNote: Session['audioNote'];
    const blob = (await recording.current?.stop()) ?? null;
    if (blob) {
      const saved = await saveRecording(id, blob);
      if (saved === 'no-room') audioNote = 'no-room';
      else recordingId = id;
    }
    if (recordingId && audioIncomplete.current) audioNote = 'incomplete';
    if (!blob && wantsAudio && audioIncomplete.current) audioNote = 'interrupted';

    addSession(sessionFor(round, spoken, { id, recordingId, audioNote }));
    void syncNow();
    saveLastRoundSettings(round.settings);
    clearLiveRound();
    announce('Round finished');
    navigate('/round/review', { replace: true, state: { sessionId: id } });
  };

  // Space and Enter finish the round, bound only while Speaking is mounted.
  // A focused control already activates on those keys, so leave it be.
  const finishRef = useRef(finish);
  useLayoutEffect(() => {
    finishRef.current = finish;
  });
  useEffect(() => {
    if (round.phase !== 'speaking' || sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return;
      if ((event.target as HTMLElement).closest('button, a, input, textarea, select')) return;
      event.preventDefault();
      finishRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [round.phase, sheetOpen]);

  // ---- Structure hint: closed on phones, open on desktop, until the user chooses.
  const [hintPref, setHintPref] = useState(() => loadSettings().showStructureHint);
  const hintOpen = hintPref ?? desktop;
  const setHint = (open: boolean) => {
    setHintPref(open);
    saveSettings({ showStructureHint: open });
  };

  const topicMeta = `${categoryLabel(topic.category)} · ${difficultyLabel(topic.difficulty)}`;

  const sheet = (
    <Sheet open={sheetOpen} title="Leave this round?" onCancel={keepGoing}>
      <p className="sheet__text">The topic and your time go. Nothing is saved.</p>
      <div className="sheet__actions">
        <Button variant="destructive" onClick={leave}>
          Leave
        </Button>
        {/* Focus lands on the safe choice, never the destructive one. */}
        <Button variant="secondary" onClick={keepGoing} data-autofocus>
          Keep going
        </Button>
      </div>
    </Sheet>
  );

  const header = (meta: string) => (
    <header className="round__header">
      <span className="round__pill">
        <span className="round__dot" aria-hidden="true" />
        {/* Keyed so "Surprise me" cross-fades into the category that came up. */}
        <span key={meta} className="round__pill-text">
          {meta}
        </span>
      </span>
      {desktop && <span className="wordmark round__wordmark">Stand Up</span>}
      <button type="button" className="icon-button" aria-label="End practice session" onClick={() => setCloseAsked(true)}>
        <CloseIcon />
      </button>
    </header>
  );

  // ---- The draw: untimed, then the picked card's animation plays out.
  if (round.phase === 'draw' || (revealing && picked !== null)) {
    // Until the card flips, the pill shows what was asked for, not what came up.
    const asked = `${categoryLabel(round.settings.category)} · ${difficultyLabel(round.settings.difficulty)}`;
    return (
      <div className="screen round round--draw">
        <div className="screen__column">
          {header(asked)}
          <main className={`draw${picked !== null ? ' has-pick' : ''}`}>
            <h1 className="draw__title">Pick a card</h1>
            <CardDraw
              count={round.skipUsed ? 6 : 7}
              picked={picked}
              face={{ category: categoryLabel(topic.category), difficulty: difficultyLabel(topic.difficulty) }}
              onPick={draw}
            />
          </main>
          <div className="prep__bottom">
            <p className="prep__caption">Your prep time starts once the topic is showing.</p>
            {/* Warn before the round rather than surprising someone mid-draw. */}
            {wantsAudio && micState === 'prompt' && (
              <p className="prep__caption">Your browser will ask for the microphone — say yes and this round is recorded.</p>
            )}
            {wantsAudio && micState === 'denied' && (
              <p className="prep__caption">
                The mic is blocked, so this round won't be recorded. Everything else works the same, or{' '}
                <Link to="/setup">turn it back on</Link>.
              </p>
            )}
          </div>
        </div>
        {sheet}
      </div>
    );
  }

  if (round.phase === 'prep') {
    const hint = hintOpen ? (
      <StructureHint onHide={() => setHint(false)} />
    ) : (
      <Button variant="pill" onClick={() => setHint(true)} className="prep__hint-toggle">
        <ChevronDownIcon />
        Show structure hint
      </Button>
    );

    const actions = (
      <div className="prep__actions">
        <Button size={desktop ? 'large' : 'default'} onClick={startNow} className="prep__start">
          Start now
        </Button>
        {round.skipUsed ? (
          <Button variant="text" disabled>
            Skip used — this one's yours
          </Button>
        ) : (
          <Button variant={desktop ? 'secondary' : 'text'} onClick={skip} className="prep__skip">
            Draw another · 1 left
          </Button>
        )}
      </div>
    );
    const caption = <p className="prep__caption">Speaking starts on its own when prep runs out.</p>;

    return (
      <div className={`screen round round--prep${picked !== null ? ' round--drawn' : ''}`}>
        <div className="screen__column">
          {header(topicMeta)}

          <main className={`prep${hintOpen ? ' prep--hint' : ''}`}>
            <div className="prep__centre">
              <div className="prep__timer">
                <CountdownRing
                  remaining={prepRemaining}
                  total={prepSeconds}
                  size={desktop ? 'desktop' : hintOpen ? 'small' : 'regular'}
                  reducedMotion={reducedMotion}
                />
              </div>
              <h1 className="prep__topic">{topic.text}</h1>
              {desktop ? (
                <>
                  {actions}
                  {caption}
                  {!hintOpen && hint}
                </>
              ) : (
                hint
              )}
            </div>
            {desktop && hintOpen && hint}
          </main>

          {!desktop && (
            <div className="prep__bottom">
              {actions}
              {!hintOpen && caption}
            </div>
          )}
        </div>
        {sheet}
      </div>
    );
  }

  // ---- Speaking.
  const over = light === 'over';
  const target = mmss(targetSeconds);
  const meta = desktop ? `${topicMeta} · target ${target}` : `Target ${target}`;

  return (
    <div className="screen round round--speaking" data-light={light}>
      <div className="screen__column">
        <header className="round__header">
          {recordingOn ? (
            <span className="speaking__recording">
              {/* A clay dot, and it does not blink (handoff §4.4). */}
              <span className="speaking__rec-dot" aria-hidden="true" />
              Recording
            </span>
          ) : (
            <span className="speaking__recording">
              <MicOffIcon />
              Recording off
            </span>
          )}
          {desktop && <span className="wordmark round__wordmark">Stand Up</span>}
          <span className="speaking__meta">
            {meta}
            {over && ` · spoke ${mmss(elapsed)}`}
          </span>
        </header>

        <main className="speaking">
          <h1 className="speaking__topic">{topic.text}</h1>
          <div className="speaking__centre">
            <TimingChip light={light} />
            <div className="speaking__clock">
              <span className="speaking__time tabular" role="timer">
                {over ? plusMmss(elapsed - targetSeconds) : countdown(remaining)}
              </span>
              <span className="speaking__label">{over ? 'Still going' : 'Left to speak'}</span>
            </div>
            <ProgressBar fraction={elapsed / targetSeconds} />
          </div>
        </main>

        <footer className="speaking__footer">
          <Button size="large" onClick={finish} className="speaking__finish">
            Finish
          </Button>
          {desktop ? (
            <span className="speaking__hint">Or press Space when you're done.</span>
          ) : (
            over && <p className="speaking__hint">No rush. Land your last point, then finish.</p>
          )}
        </footer>
      </div>
      {sheet}
    </div>
  );
}

const PREP_STEPS = [
  { letter: 'P', name: 'Point', text: 'Answer in one sentence.' },
  { letter: 'R', name: 'Reason', text: 'Why you land there.' },
  { letter: 'E', name: 'Example', text: 'One story, case, or number.' },
  { letter: 'P', name: 'Point', text: 'Say it again, shorter.' },
];

function StructureHint({ onHide }: { onHide: () => void }) {
  return (
    <Card className="hint">
      <div className="hint__header">
        <h2 className="section-label">Structure hint</h2>
        <Button variant="text" onClick={onHide} className="hint__hide">
          Hide
        </Button>
      </div>
      <ol className="hint__steps">
        {PREP_STEPS.map((step, i) => (
          <li key={i}>
            <span className="hint__letter" aria-hidden="true">
              {step.letter}
            </span>
            <span className="hint__text">
              <span className="hint__name">{step.name}</span>
              <span className="hint__desc">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
