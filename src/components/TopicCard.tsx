import type { ReactNode } from 'react';
import type { Difficulty, Topic } from '../lib/topics';
import './TopicCard.css';

/*
 * One topic as a printed card: the same card in the draw and in the
 * collection, so the one you pick is the one you collect. The face is white
 * and the back the app's green in both themes, like a real card. Rarity is
 * printed on it: pips for difficulty, a gold rule for hard, a dotted frame for
 * Wildcard.
 */

const PIPS: Record<Difficulty, string> = { easy: '◆', medium: '◆◆', hard: '◆◆◆' };

type Props = {
  topic: Topic;
  side: 'face' | 'back';
  /** The face's bottom line: when it was answered, or its category. */
  foot?: ReactNode;
  /** Print the difficulty on the back too (the collection does; the draw keeps it for the flip). */
  backPips?: boolean;
  /** Read aloud in place of the card's contents; without it the card is decorative. */
  label?: string;
  /** Makes a face tappable. */
  onClick?: () => void;
  className?: string;
};

export function TopicCard({ topic, side, foot, backPips = true, label, onClick, className }: Props) {
  if (side === 'back') {
    return (
      <span
        className={['tcard', 'tcard--back', `tcard--${topic.difficulty}`, className].filter(Boolean).join(' ')}
        {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      >
        {backPips && <span className="tcard__pips">{PIPS[topic.difficulty]}</span>}
        <svg className="tcard__mark" viewBox="0 0 64 64">
          <rect x="14" y="10" width="36" height="46" rx="6" fill="none" stroke="currentColor" strokeWidth="3" transform="rotate(-9 32 56)" />
          <circle cx="27" cy="33" r="2.4" fill="currentColor" />
          <circle cx="37" cy="32" r="2.4" fill="currentColor" />
        </svg>
      </span>
    );
  }

  const classes = [
    'tcard',
    'tcard--face',
    `tcard--${topic.difficulty}`,
    topic.category === 'wildcard' && 'tcard--wild',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const contents = (
    <>
      <span className="tcard__pips" aria-hidden="true">
        {PIPS[topic.difficulty]}
      </span>
      <span className="tcard__topic">{topic.text}</span>
      {foot && (
        <span className="tcard__foot" aria-hidden="true">
          {foot}
        </span>
      )}
    </>
  );

  return onClick ? (
    <button type="button" className={classes} onClick={onClick} aria-label={label}>
      {contents}
    </button>
  ) : (
    <span className={classes} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      {contents}
    </span>
  );
}
