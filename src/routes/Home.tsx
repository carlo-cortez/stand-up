import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ChevronRightIcon, ClockIcon, SettingsIcon } from '../components/Icon';
import { activityLine, dayLabel, historyLine, loadRounds } from '../lib/activity';
import { minutes } from '../lib/format';
import { clearFlash, newIntent, peekFlash } from '../lib/liveRound';
import {
  loadLastRoundSettings,
  loadSettings,
  roundSettingsOf,
  roundSummary,
  sameRound,
  type RoundSettings,
} from '../lib/settings';
import { categoryLabel, topicOfTheDay } from '../lib/topics';
import { useDesktop } from '../lib/useMediaQuery';
import './Home.css';

function sameAsLastLabel(s: RoundSettings): string {
  return `Same as last time · ${categoryLabel(s.category)}, ${s.prepSeconds}s, ${minutes(s.targetSeconds)}`;
}

const STEPS = [
  'A topic lands. Anything from pineapple on pizza to “tell me about yourself.”',
  'A minute to gather a point, a reason, an example.',
  'Then you talk. Go long if you like — the timer keeps counting, gently.',
];

export default function Home() {
  const navigate = useNavigate();
  const desktop = useDesktop();

  const [rounds] = useState(loadRounds);
  const [settings] = useState(loadSettings);
  const [lastRound] = useState(loadLastRoundSettings);
  const [topic] = useState(() => topicOfTheDay());
  const firstRun = rounds.length === 0;

  // Read the "interrupted" line once and clear it after paint, so it shows on
  // this visit only. Peek-then-clear keeps StrictMode's double render safe.
  const [flash] = useState(peekFlash);
  useEffect(clearFlash, []);

  // Fresh intents per visit to Home; each one starts a distinct round.
  const round = useMemo(() => roundSettingsOf(settings), [settings]);
  const topicIntent = useMemo(() => newIntent(round, topic.id), [round, topic.id]);

  const start = () => navigate('/round', { state: newIntent(round) });
  const repeat = () => lastRound && navigate('/round', { state: newIntent(lastRound) });

  const summary = flash ?? (firstRun ? null : activityLine(rounds));

  const header = (
    <header className="home__header">
      <span className="wordmark">Stand Up</span>
      <nav className="home__nav" aria-label="Main">
        {desktop && (
          <Link to="/history" className="home__nav-link">
            History
          </Link>
        )}
        <Link to="/settings" className="icon-button" aria-label="Settings">
          <SettingsIcon />
        </Link>
      </nav>
    </header>
  );

  const intro = (
    <div className="home__intro">
      <h1 className="home__headline">The floor is yours.</h1>
      {firstRun && !flash ? (
        <p className="home__lede">
          You get a topic, a minute to think, then two minutes to talk. Nobody's listening but you.
        </p>
      ) : (
        summary && <p className="home__summary">{summary}</p>
      )}
    </div>
  );

  // The round the big button will play, spelled out — otherwise the choice
  // lives only behind a text button and goes unfound. Handoff §11 q8.
  const actions = (
    <div className="home__actions">
      <Button size="hero" onClick={start} aria-describedby="home-round">
        Start practicing
      </Button>
      <p className="home__round" id="home-round">
        <span className="home__round-text">{roundSummary(round)}</span>
        <Link to="/setup" className="home__change">
          Change
        </Link>
      </p>
      {lastRound && !sameRound(lastRound, round) && (
        <Button variant="secondary" className="home__repeat" onClick={repeat}>
          {sameAsLastLabel(lastRound)}
        </Button>
      )}
    </div>
  );

  const explainer = (
    <Card className="home__steps">
      <ol>
        {STEPS.map((step, i) => (
          <li key={step}>
            <span className="home__step-number" aria-hidden="true">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </Card>
  );

  const topicCard = (
    <Card className="home__topic">
      <div className="home__topic-label">
        <span className="home__dot" aria-hidden="true" />
        <span className="section-label">Topic of the day</span>
      </div>
      <p className="home__topic-text">{topic.text}</p>
      <Link to="/round" state={topicIntent} className="home__topic-link">
        Take this one
        <ChevronRightIcon />
      </Link>
    </Card>
  );

  const historyRow = firstRun ? (
    <div className="home__empty-history">
      <ClockIcon />
      <span>No rounds yet. Your first one shows up here.</span>
    </div>
  ) : desktop ? (
    <Link to="/history" className="home__history home__history--card">
      <span className="home__history-text">
        <span className="home__history-title">
          {rounds.length} {rounds.length === 1 ? 'round' : 'rounds'} so far
        </span>
        <span className="home__history-meta">Last one {dayLabel(rounds[rounds.length - 1].at)}</span>
      </span>
      <ChevronRightIcon size={20} />
    </Link>
  ) : (
    <Link to="/history" className="home__history">
      <span className="home__history-text">
        <span className="home__history-title">History</span>
        <span className="home__history-meta">{historyLine(rounds)}</span>
      </span>
      <ChevronRightIcon size={18} />
    </Link>
  );

  if (desktop) {
    return (
      <div className="screen home">
        {header}
        <main className="home__grid">
          <div className="home__left">
            {intro}
            {actions}
          </div>
          <div className="home__right">
            {firstRun ? explainer : topicCard}
            {historyRow}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="screen home">
      <div className="screen__column">
        {header}
        <main className={`home__main${firstRun ? ' home__main--first' : ''}`}>
          {intro}
          {firstRun ? (
            <>
              {explainer}
              {actions}
            </>
          ) : (
            <>
              {actions}
              {topicCard}
            </>
          )}
        </main>
        {historyRow}
      </div>
    </div>
  );
}
