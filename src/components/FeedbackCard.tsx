import { Button } from './Button';
import { Card } from './Card';
import { deltaAgainstAverage, fillerHistory, MIN_WORDS, wordCount } from '../lib/feedback';
import type { Criteria, Mark, Metrics, Session } from '../lib/sessions';

/*
 * The feedback card (handoff §4.5), in one of six states. The counted half —
 * the three tiles, the chips, the five-round strip — is derived from the
 * transcript with no model involved. The written half is the three prose
 * blocks. When it is missing the card says so and offers to try again,
 * rather than leaving a gap that looks like the whole of the feedback.
 */

type Props = {
  session: Session;
  history: Session[];
  /** Absent when the round has no audio to send. */
  onRun?: () => void;
  /** Why there's nothing to send: still loading, or no recording at all. */
  audio?: 'loading' | 'missing';
  state: 'idle' | 'loading' | 'offline' | 'thin' | 'ready';
  error?: string | null;
};

/** Point, Reason, Example, Point — the order the prep hint teaches — then the topic. */
const CRITERIA: { key: keyof Criteria; label: string }[] = [
  { key: 'point', label: 'Made a clear point' },
  { key: 'reason', label: 'Backed it with a reason' },
  { key: 'example', label: 'Gave an example' },
  { key: 'landed', label: 'Landed it at the end' },
  { key: 'answered', label: 'Answered the question' },
];

const MARK_LABEL: Record<Mark, string> = { there: 'There', partly: 'Partly', 'not-yet': 'Not yet' };

/*
 * Marks, not numbers (handoff §4.5): a checklist to see across rounds, never a
 * grade. It follows What went well, and its notes describe rather than
 * instruct — the one thing to change stays in Try next time.
 */
function Checklist({ criteria }: { criteria: Criteria }) {
  return (
    <div className="feedback__block">
      <h2 className="section-label">What the coach noticed</h2>
      <ul className="feedback__checklist">
        {CRITERIA.map(({ key, label }) => {
          const { mark, note } = criteria[key];
          return (
            <li key={key} className={`feedback__check feedback__check--${mark}`}>
              <span className="feedback__mark" aria-hidden="true" />
              <span className="feedback__check-text">
                <span className="feedback__check-head">
                  <span className="feedback__check-label">{label}</span>
                  <span className="feedback__check-mark">{MARK_LABEL[mark]}</span>
                </span>
                <span className="feedback__check-note">{note}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="feedback__note">Confidence and delivery aren't marked — the coach only reads your words.</p>
    </div>
  );
}

/*
 * "How it sounded" (PR B): pace over time, pauses, hedging, Clarity and the
 * voice. Described in plain words, never scored here; every band is a first
 * guess to tune against real rounds. Rows appear only for what was measured,
 * so rounds from before this existed simply show fewer.
 */
function Sounded({ metrics }: { metrics: Metrics }) {
  const { delivery: d, voice: v, hedges } = metrics;
  const rows: [string, string][] = [];

  if (d && d.paceWindows.length > 0) {
    const low = Math.min(...d.paceWindows);
    const high = Math.max(...d.paceWindows);
    rows.push([
      'Pace',
      d.paceSpread < 15
        ? `${metrics.wordsPerMinute} words a minute, and steady`
        : d.paceSpread < 30
          ? `${metrics.wordsPerMinute} words a minute, a little uneven`
          : `Varied, from ${low} to ${high} words a minute`,
    ]);
  }
  if (d) {
    rows.push([
      'Pauses',
      d.pauses === 0
        ? 'No long pauses'
        : `${d.pauses} ${d.pauses === 1 ? 'pause' : 'pauses'}` +
            (d.hesitations > 0 ? `, ${d.hesitations} mid-sentence` : '') +
            ` · longest ${d.longestPause}s`,
    ]);
  }
  if (hedges !== undefined) {
    rows.push(['Hedging', hedges === 0 ? 'None — you said it straight' : `${hedges} softener${hedges === 1 ? '' : 's'}, like "I think" or "maybe"`]);
  }
  if (d && d.clarity !== null) {
    rows.push([
      'Clarity',
      d.clarity >= 80 ? 'Clear throughout' : d.clarity >= 60 ? 'Mostly clear' : 'Hard to make out in places',
    ]);
  }
  if (v) {
    rows.push([
      'Pitch',
      v.pitchVariety < 1.5 ? 'Mostly level' : v.pitchVariety < 3 ? 'Some variety' : 'Lively, with plenty of movement',
    ]);
    rows.push(['Volume', v.loudnessSpread < 6 ? 'Even' : v.loudnessSpread < 10 ? 'Some ups and downs' : 'Uneven']);
    if (v.sentences > 0) {
      rows.push([
        'Endings',
        v.trailingOff === 0
          ? 'No trailing off'
          : `${v.trailingOff} of ${v.sentences} ${v.sentences === 1 ? 'sentence' : 'sentences'} trailed off`,
      ]);
      if (v.upspeak > 0) {
        rows.push(['Rising endings', `${v.upspeak} of ${v.sentences} ended on a rise, like a question`]);
      }
    }
  }
  if (rows.length === 0) return null;

  return (
    <div className="feedback__block">
      <h2 className="section-label">How it sounded</h2>
      <dl className="feedback__sounded">
        {rows.map(([label, value]) => (
          <div key={label} className="feedback__sounded-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {d && d.clarity !== null && (
        <p className="feedback__note">
          Clarity is how clearly the transcriber could follow you, not a pronunciation test. Pitch, volume and endings
          are measured on your phone; the recording doesn't leave it for those.
        </p>
      )}
    </div>
  );
}

function Delta({ value, better }: { value: number | null; better: 'lower' | 'either' }) {
  if (value === null) return null;
  const good = better === 'lower' && value < 0;
  return (
    <span className={`feedback__delta${good ? ' is-better' : ''}`}>
      {value > 0 ? '+' : value < 0 ? '−' : ''}
      {Math.abs(value)} vs avg
    </span>
  );
}

export function FeedbackCard({ session, history, onRun, audio, state, error }: Props) {
  if (state === 'idle') {
    return (
      <Card className="feedback">
        <div className="feedback__head">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="feedback__mark">
            <path d="M2 7.5v3" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 4.5v9" strokeWidth="2" strokeLinecap="round" />
            <path d="M10 2.5v13" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 6v6" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h2 className="feedback__title">Feedback on this round</h2>
        </div>
        <p className="feedback__lede">
          One thing that went well, your pace and filler-word count set against your own average, and a single sentence
          of yours written sharper.
        </p>
        <Button onClick={onRun} disabled={!onRun}>
          Get feedback
        </Button>
        <p className="feedback__note">
          {onRun
            ? 'About ten seconds. Your recording leaves the device to be turned into text, and is not kept once that is done.'
            : audio === 'loading'
              ? 'Getting the recording ready…'
              : 'This round has no recording, so there is nothing to listen back to.'}
        </p>
        {error && <p className="feedback__error">{error}</p>}
      </Card>
    );
  }

  if (state === 'thin') {
    const heard = session.transcript?.trim() ?? '';
    const words = wordCount(heard);
    return (
      <Card muted className="feedback">
        <div className="feedback__head">
          <h2 className="feedback__title">Not enough to go on</h2>
        </div>
        <p className="feedback__lede">
          {words === 0
            ? "This round didn't have any words in it that could be picked out, so there's nothing to give feedback on."
            : `This round had ${words} ${words === 1 ? 'word' : 'words'} in it — feedback needs about ${MIN_WORDS}, so there's nothing fair to say yet.`}{' '}
          Talk for half a minute or more next time and it will have something to work with.
        </p>
        {words > 0 && <TranscriptDetails transcript={heard} />}
      </Card>
    );
  }

  if (state === 'offline') {
    return (
      <Card muted className="feedback">
        <div className="feedback__head feedback__head--spread">
          <h2 className="feedback__title">No connection</h2>
          <span className="review__badge">Waiting</span>
        </div>
        <p className="feedback__lede">
          This round is saved in full — the recording, your ratings and your note. Turning it into text needs a
          connection, and you can ask again the next time you have one.
        </p>
      </Card>
    );
  }

  if (state === 'loading') {
    return (
      <Card className="feedback">
        <div className="feedback__head">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="feedback__spinner">
            <circle cx="9" cy="9" r="7" strokeWidth="2.5" className="feedback__spinner-track" />
            <path d="M9 2 A7 7 0 0 1 16 9" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <h2 className="feedback__title">Listening back to your round…</h2>
        </div>
        <div className="feedback__skeleton" aria-hidden="true">
          <span />
          <span />
          <span className="is-short" />
        </div>
        <div className="feedback__tiles" aria-hidden="true">
          <span className="feedback__tile-ghost" />
          <span className="feedback__tile-ghost" />
          <span className="feedback__tile-ghost" />
        </div>
        <p className="feedback__note">
          This takes about ten seconds. Your ratings are already saved, so you can carry on and check back.
        </p>
      </Card>
    );
  }

  const metrics = session.metrics!;
  const written = session.written;
  const fillers = fillerHistory(history, session);
  const tallest = Math.max(...fillers, 1);

  return (
    <Card className="feedback">
      {written && (
        <div className="feedback__block">
          <h2 className="section-label">What went well</h2>
          <p className="feedback__prose">{written.wentWell}</p>
        </div>
      )}

      {written?.criteria && <Checklist criteria={written.criteria} />}

      <div className="feedback__tiles">
        <div className="feedback__tile">
          <span className="feedback__value tabular">{metrics.wordsPerMinute}</span>
          <span className="feedback__label">Words per minute</span>
          <Delta value={deltaAgainstAverage(history, session, 'wordsPerMinute')} better="either" />
        </div>
        <div className="feedback__tile">
          <span className="feedback__value tabular">{metrics.fillerWords}</span>
          <span className="feedback__label">Filler words</span>
          <Delta value={deltaAgainstAverage(history, session, 'fillerWords')} better="lower" />
        </div>
        <div className="feedback__tile">
          <span className="feedback__value tabular">{metrics.vagueWords}</span>
          <span className="feedback__label">Vague words</span>
          <Delta value={deltaAgainstAverage(history, session, 'vagueWords')} better="lower" />
        </div>
      </div>

      {metrics.flagged.length > 0 && (
        <div className="feedback__block">
          <h2 className="section-label">Words worth swapping</h2>
          <div className="feedback__chips">
            {metrics.flagged.map((item) => (
              <span key={item.word} className={`feedback__chip feedback__chip--${item.kind}`}>
                {item.word}
                {item.count > 1 && ` ×${item.count}`}
              </span>
            ))}
          </div>
        </div>
      )}

      <Sounded metrics={metrics} />

      {fillers.length > 1 && (
        <div className="feedback__strip">
          <h2 className="section-label">Filler words, last {fillers.length} rounds</h2>
          <div className="feedback__bars" aria-hidden="true">
            {fillers.map((count, i) => (
              <span
                key={i}
                className={i === fillers.length - 1 ? 'is-current' : undefined}
                style={{ height: `${Math.max(6, (count / tallest) * 56)}px` }}
              />
            ))}
          </div>
          <p className="feedback__note">
            {metrics.fillerWords <= Math.min(...fillers)
              ? 'Your lowest so far.'
              : `${fillers.join(', ')} across your recent rounds.`}
          </p>
        </div>
      )}

      {written?.sharper && (
        <div className="feedback__sharper">
          <h2 className="section-label">One sharper version</h2>
          {written.quoted && <p className="feedback__quoted">You said: “{written.quoted}”</p>}
          <p className="feedback__rewrite">Sharper: “{written.sharper}”</p>
        </div>
      )}

      {written && (
        <div className="feedback__block feedback__block--tight">
          <h2 className="section-label">Try next time</h2>
          <p className="feedback__prose">{written.tryNextTime}</p>
        </div>
      )}

      {!written && (
        <div className="feedback__block feedback__block--tight">
          <h2 className="section-label">The written part</h2>
          <p className="feedback__prose">
            It didn't come back this time — the numbers above are still right.
            {onRun ? ' Trying again sends the recording once more.' : ''}
          </p>
          {onRun && (
            <Button variant="secondary" onClick={onRun}>
              Try again
            </Button>
          )}
          {error && <p className="feedback__error">{error}</p>}
        </div>
      )}

      {session.transcript && <TranscriptDetails transcript={session.transcript} />}
    </Card>
  );
}

function TranscriptDetails({ transcript }: { transcript: string }) {
  return (
    <details className="feedback__transcript">
      <summary>Read the full transcript</summary>
      <p>{transcript}</p>
    </details>
  );
}
