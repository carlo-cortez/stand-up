import { useEffect, useState, type CSSProperties } from 'react';
import { playFlip, playShuffle } from '../lib/sounds';
import type { Topic } from '../lib/topics';
import { TopicCard } from './TopicCard';

type Props = {
  /** Seven on a fresh round, six after "Draw another". */
  count: number;
  /** The card the user tapped, once they have. */
  picked: number | null;
  /** The topic every card holds, shown as its collection card when it flips. */
  topic: Topic;
  onPick: (index: number) => void;
};

/** The pile riffles twice, then spreads into a fan; see Round.css. */
const INTRO_MS = 1800;
const STAGGER_MS = 30;

/**
 * A deck to draw the topic from. Every card holds the same, already chosen
 * topic — the pick is a ritual, not a choice. The cards are the collection's
 * own (TopicCard), so the one you pick is the one you collect. The deck
 * arrives as a pile, shuffles, and spreads into a fan like a hand of cards. The picked card then
 * swings back along the fan's arc to the centre (the button's rotation), lifts
 * and grows around its own centre (.draw__lift) and flips (.draw__inner), while
 * the rest fall away.
 * All of the motion is CSS; the only state here is when the spread is ready
 * to be tapped.
 */
export function CardDraw({ count, picked, topic, onPick }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setReady(true), reduced ? 0 : INTRO_MS + count * STAGGER_MS);
    // No shuffle on screen, so no shuffle to hear.
    const stop = reduced ? () => {} : playShuffle();
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [count]);

  const pick = (index: number) => {
    playFlip(matchMedia('(prefers-reduced-motion: reduce)').matches);
    onPick(index);
  };

  const middle = (count - 1) / 2;

  return (
    <div className={`draw__deck${picked !== null ? ' has-pick' : ''}${ready ? ' is-ready' : ''}`}>
      {Array.from({ length: count }, (_, i) => {
        const state = picked === null ? '' : picked === i ? ' is-picked' : ' is-other';
        const style = {
          '--i': i,
          '--fan': i - middle, // −3 … 3 across seven cards
          '--side': i % 2 === 0 ? -1 : 1, // which half of the riffle this card falls in
          '--pile-r': `${((i * 37) % 7) - 3}deg`, // a pile, not a perfect stack
          '--gap-from-pick': picked === null ? 0 : Math.abs(i - picked), // the deck falls away outward
        } as CSSProperties;
        return (
          <button
            key={i}
            type="button"
            className={`draw__card${state}`}
            style={style}
            onClick={() => pick(i)}
            disabled={!ready || picked !== null}
            aria-label={`Card ${i + 1} of ${count}`}
          >
            <span className="draw__lift">
              <span className="draw__inner">
                <span className="draw__back">
                  {/* No pips on the back: the flip is where the difficulty shows. */}
                  <TopicCard topic={topic} side="back" backPips={false} />
                </span>
                <span className="draw__face">
                  <TopicCard topic={topic} side="face" />
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
