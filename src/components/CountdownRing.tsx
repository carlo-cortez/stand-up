import { countWord } from '../lib/format';

const CIRCUMFERENCE = 364.42; // 2π × 58, handoff §3
const BLOCKS = 15;

type Props = {
  remaining: number;
  total: number;
  /** "small" is the ring with the structure hint open on mobile. */
  size: 'regular' | 'small' | 'desktop';
  reducedMotion: boolean;
};

/**
 * Prep countdown. Under prefers-reduced-motion the sweeping ring becomes the
 * 15-block bar: one block drops every total/15 seconds, a discrete change
 * rather than a per-frame animation.
 */
export function CountdownRing({ remaining, total, size, reducedMotion }: Props) {
  const seconds = Math.max(0, Math.ceil(remaining));

  if (reducedMotion) {
    const filled = Math.ceil((Math.max(0, remaining) / total) * BLOCKS);
    const interval = total / BLOCKS;
    return (
      <div className="prep-blocks" aria-hidden="true">
        <div className="prep-blocks__count">
          <span className="prep-blocks__seconds tabular">{seconds}</span>
          <span className="prep-blocks__label">Sec prep</span>
        </div>
        <div className="prep-blocks__bar">
          {Array.from({ length: BLOCKS }, (_, i) => (
            <span key={i} className={i < filled ? 'is-filled' : undefined} />
          ))}
        </div>
        <span className="prep-blocks__caption">
          One block drops every {countWord(interval)} {interval === 1 ? 'second' : 'seconds'}.
        </span>
      </div>
    );
  }

  const elapsed = Math.min(total, Math.max(0, total - remaining));
  const offset = CIRCUMFERENCE * (elapsed / total);

  return (
    <div className={`ring ring--${size}`} aria-hidden="true">
      <svg viewBox="0 0 132 132" className="ring__svg">
        <circle cx="66" cy="66" r="58" className="ring__track" />
        <circle
          cx="66"
          cy="66"
          r="58"
          className="ring__progress"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring__centre">
        <span className="ring__seconds tabular">{seconds}</span>
        <span className="ring__label">Prep</span>
      </div>
    </div>
  );
}
