import { useEffect, useState, type CSSProperties } from 'react';

type Props = {
  /** Seven on a fresh round, six after "Draw another". */
  count: number;
  /** The card the user tapped, once they have. */
  picked: number | null;
  /** What the picked card shows when it flips: the category, before the topic. */
  face: { category: string; difficulty: string };
  onPick: (index: number) => void;
};

/** The pile riffles twice, then spreads into a fan; see Round.css. */
const INTRO_MS = 1800;
const STAGGER_MS = 30;

/**
 * A deck to draw the topic from. Every card holds the same, already chosen
 * topic — the pick is a ritual, not a choice. The deck arrives as a pile,
 * shuffles, and spreads into a fan like a hand of cards. The picked card then
 * swings back along the fan's arc to the centre (the button's rotation), lifts
 * and grows around its own centre (.draw__lift) and flips (.draw__inner), while
 * the rest fall away.
 * All of the motion is CSS; the only state here is when the spread is ready
 * to be tapped.
 */
export function CardDraw({ count, picked, face, onPick }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setReady(true), reduced ? 0 : INTRO_MS + count * STAGGER_MS);
    return () => window.clearTimeout(timer);
  }, [count]);

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
            onClick={() => onPick(i)}
            disabled={!ready || picked !== null}
            aria-label={`Card ${i + 1} of ${count}`}
          >
            <span className="draw__lift">
              <span className="draw__inner">
                <span className="draw__back" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M14 3 C15.2 10 18 12.8 25 14 C18 15.2 15.2 18 14 25 C12.8 18 10 15.2 3 14 C10 12.8 12.8 10 14 3 Z" />
                  </svg>
                </span>
                <span className="draw__face" aria-hidden="true">
                  <span className="draw__dot" />
                  <span className="draw__category">{face.category}</span>
                  <span className="draw__difficulty">{face.difficulty}</span>
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
