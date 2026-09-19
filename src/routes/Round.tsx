import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CountdownRing } from '../components/CountdownRing';
import { ChevronDownIcon, CloseIcon, MicOffIcon } from '../components/Icon';
import { ProgressBar } from '../components/ProgressBar';
import { Sheet } from '../components/Sheet';
import { TimingChip } from '../components/TimingChip';
import { recordRound } from '../lib/activity';
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
import { categoryLabel, decoysFor, difficultyLabel, pickTopic, topicById, type Topic } from '../lib/topics';
import { useDesktop, useReducedMotion } from '../lib/useMediaQuery';
import { clockNow, timingLight, useRoundTimer } from '../lib/useRoundTimer';
import './Round.css';

type Start = { round: LiveRound; resumed: boolean } | { interrupted: true };

/*
 * The topic reveal: real topics shuffle past, slow down, and land on yours.
 * Prep is scheduled to begin the moment it lands — phaseStartedAt sits in the
 * future while the shuffle runs — so the suspense never costs thinking time,
 * and a refresh mid-shuffle needs no special handling.
 */
const REVEAL_MS = 1900;
const SKIP_REVEAL_MS = 1200;
const REVEAL_FRAMES = 16;

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
    return isResumable(persisted) ? { round: persisted, resumed: true } : { interrupted: true };
  }

  const { startId, settings, topicId } = intent ?? newIntent(roundSettingsOf(loadSettings()));
  const topic = (topicId && topicById(topicId)) || pickTopic({ ...settings, exclude: loadRecentTopics() });
  return {
    resumed: false,
    round: {
      startId,
      settings,
      topicId: topic.id,
      phase: 'prep',
      // A topic picked by hand (Topic of the day) is already known: no shuffle.
      phaseStartedAt: clockNow() + (topicId ? 0 : revealDelay(REVEAL_MS)),
      skipUsed: false,
    } as LiveRound,
  };
}

export default function Round() {
  const location = useLocation();
  const navigate = useNavigate();
  const [start] = useState(() => resolveStart((location.state as RoundIntent | null) ?? null));

  useEffect(() => {
    if ('interrupted' in start) {
      clearLiveRound();
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
    if (revealing || lastAnnounced.current === phaseKey) return;
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
    setRound((r) => ({
      ...r,
      topicId: next.id,
      phase: 'prep',
      phaseStartedAt: clockNow() + revealDelay(SKIP_REVEAL_MS),
      skipUsed: true,
    }));
  };

  // Tapping the shuffle lands it at once; prep starts from that instant.
  const showNow = () => setRound((r) => ({ ...r, phaseStartedAt: clockNow() }));

  // Decoys are drawn once per reveal, then eased through: fast at first,
  // slowing as it closes in, holding on the real topic before prep starts.
  const decoys = useMemo(
    () => decoysFor(topic, REVEAL_FRAMES - 1),
    // A new reveal is a new topic or a new scheduled prep start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topic.id, round.phaseStartedAt],
  );
  const revealTotal = round.skipUsed ? SKIP_REVEAL_MS : REVEAL_MS;
  const progress = revealing ? Math.min(1, Math.max(0, 1 + (sinceStart * 1000) / revealTotal)) : 1;
  const frame = Math.min(REVEAL_FRAMES - 1, Math.floor(REVEAL_FRAMES * (1 - (1 - progress) ** 2)));
  const landed = frame === REVEAL_FRAMES - 1;
  const shown = revealing && !landed ? decoys[frame] : topic;

  const finish = () => {
    leaving.current = true;
    recordRound({ at: Date.now(), spokenSeconds: Math.round(elapsed) });
    saveLastRoundSettings(round.settings);
    clearLiveRound();
    announce('Round finished');
    navigate('/', { replace: true });
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

  const topicMeta = `${categoryLabel(shown.category)} · ${difficultyLabel(shown.difficulty)}`;

  const sheet = (
    <Sheet open={sheetOpen} title="Leave this round?" onCancel={keepGoing}>
      <p className="sheet__text">The topic and your time go. Nothing is saved.</p>
      <div className="sheet__actions">
        <Button variant="destructive" onClick={leave}>
          Leave
        </Button>
        {/* Focus lands on the safe choice, never the destructive one. */}
        <Button variant="secondary" onClick={keepGoing} autoFocus>
          Keep going
        </Button>
      </div>
    </Sheet>
  );

  if (round.phase === 'prep') {
    const hint = hintOpen ? (
      <StructureHint onHide={() => setHint(false)} />
    ) : (
      <Button variant="pill" onClick={() => setHint(true)}>
        <ChevronDownIcon />
        Show structure hint
      </Button>
    );

    const actions = (
      <div className="prep__actions" inert={revealing}>
        <Button size={desktop ? 'large' : 'default'} onClick={startNow} className="prep__start">
          Start now
        </Button>
        {round.skipUsed ? (
          <Button variant="text" disabled>
            Skip used — this one's yours
          </Button>
        ) : (
          <Button variant={desktop ? 'secondary' : 'text'} onClick={skip} className="prep__skip">
            Skip this topic · 1 left
          </Button>
        )}
      </div>
    );
    const caption = <p className="prep__caption">Speaking starts on its own when prep runs out.</p>;

    return (
      <div className="screen round round--prep">
        <div className="screen__column">
          <header className="round__header">
            <span className="round__pill">
              <span className="round__dot" aria-hidden="true" />
              {topicMeta}
            </span>
            {desktop && <span className="wordmark round__wordmark">Stand Up</span>}
            <button type="button" className="icon-button" aria-label="End practice session" onClick={() => setCloseAsked(true)}>
              <CloseIcon />
            </button>
          </header>

          <main className={`prep${hintOpen ? ' prep--hint' : ''}`}>
            <div className="prep__centre">
              <div className={`prep__timer${revealing ? ' is-waiting' : ''}`}>
                <CountdownRing
                  remaining={prepRemaining}
                  total={prepSeconds}
                  size={desktop ? 'desktop' : hintOpen ? 'small' : 'regular'}
                  reducedMotion={reducedMotion}
                />
              </div>
              <h1 className="prep__topic">
                {/* The real topic always sets the height, so nothing jumps
                    while decoys of other lengths flicker over it. */}
                <span className="prep__topic-text" aria-hidden={revealing}>
                  {topic.text}
                </span>
                {revealing && (
                  <button type="button" className="reveal" onClick={showNow} aria-label="Drawing your topic. Show it now">
                    <span key={landed ? 'landed' : 'shuffling'} className={landed ? 'reveal__text is-landed' : 'reveal__text'}>
                      {shown.text}
                    </span>
                  </button>
                )}
              </h1>
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
            <div className="prep__bottom" inert={revealing}>
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
          <span className="speaking__recording">
            <MicOffIcon />
            Recording off
          </span>
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
