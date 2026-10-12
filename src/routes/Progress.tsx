import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ace } from '../components/Ace';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { BackIcon } from '../components/Icon';
import { newIntent } from '../lib/liveRound';
import {
  checklistRates,
  habits,
  measuredRounds,
  MEASURES,
  series,
  shown,
  todayComparison,
  weekComparison,
  type Comparison,
  type MeasureKey,
  type Rate,
} from '../lib/progress';
import { loadSessions } from '../lib/sessions';
import { loadSettings, roundSettingsOf } from '../lib/settings';
import './Progress.css';

/*
 * Progress (handoff §4.8): today and this week against what came before, the
 * same measures round by round, how often each checklist item was there, and
 * the words said most. Read from rounds that have had feedback; nothing new is
 * stored. It compares you only with yourself, in the accent colour, and never
 * calls a change better or worse.
 */

const CHARTED: MeasureKey[] = ['fillers', 'pace', 'clarity'];
/** A line through fewer points than this says nothing. */
const CHART_MIN = 4;

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

function basis(c: Comparison, period: 'today' | 'this week'): string {
  const before =
    c.against === 'last-week' ? `${plural(c.beforeCount, 'round')} last week` : `your ${c.beforeCount} rounds before`;
  return `${plural(c.nowCount, 'round')} ${period}, against ${before}.`;
}

function Compared({ title, comparison, period }: { title: string; comparison: Comparison; period: 'today' | 'this week' }) {
  return (
    <Card className="trends__card">
      <h2 className="section-label">{title}</h2>
      <dl className="trends__rows">
        {comparison.rows.map((row) => (
          <div key={row.key} className="trends__row">
            <dt>{row.label}</dt>
            <dd>
              <span className="trends__now">
                {row.now} {row.unit}
              </span>
              <span className={`trends__change${row.wanted ? ' is-wanted' : ''}`}>
                {row.change === 'same'
                  ? 'About the same'
                  : `${row.change === 'less' ? 'Down' : 'Up'} from ${row.before}`}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="trends__note">{basis(comparison, period)}</p>
    </Card>
  );
}

/** One measure, round by round: a line, with where it started and where it is now. */
function Line({ label, values, show }: { label: string; values: number[]; show: (v: number) => string }) {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - low) / span) * 24}`).join(' ');
  const last = values[values.length - 1];
  return (
    <div className="trends__line">
      <div className="trends__line-head">
        <span className="trends__line-label">{label}</span>
        <span className="trends__line-now">{show(last)}</span>
      </div>
      <svg
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        className="trends__chart"
        role="img"
        aria-label={`${label} over your last ${values.length} rounds: from ${show(values[0])} to ${show(last)}.`}
      >
        <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function Checklist({ title, rounds, rates }: { title: string; rounds: number; rates: Rate[] }) {
  return (
    <Card className="trends__card">
      <h2 className="section-label">{title}</h2>
      <ul className="trends__rates">
        {rates.map((rate) => (
          <li key={rate.key} className="trends__rate">
            <span className="trends__rate-head">
              <span>{rate.label}</span>
              <span className="trends__rate-count">
                There in {rate.there} of {rounds}
                {rate.partly > 0 && `, partly in ${rate.partly}`}
              </span>
            </span>
            {/* Solid for there, lighter for partly; the rest of the bar is not yet. */}
            <span className="trends__rate-bar" aria-hidden="true">
              <span style={{ width: `${(rate.there / rounds) * 100}%` }} />
              <span className="is-partly" style={{ width: `${(rate.partly / rounds) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <p className="trends__note">Your last {plural(rounds, 'round')} the coach marked.</p>
    </Card>
  );
}

export default function Progress() {
  const navigate = useNavigate();
  const sessions = useMemo(() => loadSessions(), []);
  const measured = useMemo(() => measuredRounds(sessions), [sessions]);

  const header = (
    <header className="trends__header">
      <Link to="/history" className="icon-button" aria-label="Back to history">
        <BackIcon />
      </Link>
      <h1 className="trends__title">Progress</h1>
      <span className="trends__spacer" aria-hidden="true" />
    </header>
  );

  // Nothing to compare until a few rounds have had feedback.
  if (measured.length < 3) {
    return (
      <div className="screen trends">
        <div className="screen__column">
          {header}
          <main className="trends__empty">
            <Ace pose="lean" />
            <div className="trends__empty-text">
              <h2 className="trends__empty-headline">Not enough to compare yet.</h2>
              <p className="trends__empty-body">
                Progress is read from rounds that have had feedback, and it needs three of them. After a round, tap Get
                feedback on the review screen.{' '}
                {measured.length > 0 && `You have ${measured.length} so far.`}
              </p>
            </div>
          </main>
          <Button size="large" onClick={() => navigate('/round', { state: newIntent(roundSettingsOf(loadSettings())) })}>
            Start practicing
          </Button>
        </div>
      </div>
    );
  }

  const today = todayComparison(sessions);
  const week = weekComparison(sessions);
  const lines = CHARTED.map((key) => ({ measure: MEASURES.find((m) => m.key === key)!, values: series(sessions, key) })).filter(
    (l) => l.values.length >= CHART_MIN,
  );
  const prep = checklistRates(sessions, 'prep');
  const star = checklistRates(sessions, 'star');
  const said = habits(sessions);

  return (
    <div className="screen trends">
      <div className="screen__column">
        {header}
        <p className="trends__lede">
          From your {measured.length} rounds with feedback on this device, compared only with your own.
        </p>

        <main className="trends__grid">
          {today && <Compared title="Today" comparison={today} period="today" />}
          {week ? (
            <Compared title="This week" comparison={week} period="this week" />
          ) : (
            <Card muted className="trends__card">
              <h2 className="section-label">This week</h2>
              <p className="trends__note">
                No rounds with feedback yet this week. Do one and this week's numbers show up here.
              </p>
            </Card>
          )}

          {lines.length > 0 && (
            <Card className="trends__card">
              <h2 className="section-label">Round by round</h2>
              {lines.map(({ measure, values }) => (
                <Line key={measure.key} label={measure.label} values={values} show={(v) => shown(measure, v)} />
              ))}
              <p className="trends__note">Oldest on the left, your latest on the right.</p>
            </Card>
          )}

          {prep && <Checklist title="What the coach noticed" rounds={prep.rounds} rates={prep.rates} />}
          {star && <Checklist title="On story questions" rounds={star.rounds} rates={star.rates} />}

          {said.length > 0 && (
            <Card className="trends__card">
              <h2 className="section-label">Said most, last 30 days</h2>
              <ul className="trends__said">
                {said.map((f) => (
                  <li key={`${f.kind}:${f.word}`} className={`trends__word trends__word--${f.kind}`}>
                    {f.word.replace(/^i\b/, 'I')} <span className="trends__word-count">×{f.count}</span>
                  </li>
                ))}
              </ul>
              <p className="trends__note">Filler words, vague words and hedges, counted across your rounds.</p>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
