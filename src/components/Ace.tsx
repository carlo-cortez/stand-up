import './Ace.css';

type Pose = 'lean' | 'hop';

/*
 * Ace, the card that talks: the app's mascot. A playing card with a face,
 * standing on the same stage line as the logo.
 *
 * Three rules it lives by (handoff §3, Ace):
 * - No limbs. An earlier Ace had thin dark limbs behind a white face panel
 *   and a wide grin, which reads as minstrel caricature. The card is one
 *   material, and moves by tilting and hopping instead.
 * - Always a white card with dark features, in both themes — never a dark
 *   card with light eyes and mouth, which drifts back toward the same trope.
 * - It never reacts to how a round went. It appears only where playfulness
 *   is allowed (empty states, the celebration line), and the celebration
 *   line is the same after every round.
 */
export function Ace({ pose, className }: { pose: Pose; className?: string }) {
  return (
    <svg
      className={`ace ace--${pose}${className ? ` ${className}` : ''}`}
      viewBox="16 58 88 92"
      width="88"
      height="92"
      aria-hidden="true"
    >
      <line className="ace__floor" x1="22" y1="146" x2="98" y2="146" />
      {pose === 'lean' ? (
        // Leaning on the line, waiting.
        <g transform="rotate(-9 60 143)">
          <rect className="ace__card" x="36" y="75" width="48" height="68" rx="7" />
          <circle className="ace__eye" cx="52.5" cy="104" r="2.5" />
          <circle className="ace__eye" cx="67.5" cy="104" r="2.5" />
          <path className="ace__line" d="M55.5 111 Q60 114.5 64.5 111" />
        </g>
      ) : (
        // Upright, eyes smiling, and one small hop on arrival.
        <g className="ace__body">
          <rect className="ace__card" x="36" y="75" width="48" height="68" rx="7" />
          <path className="ace__line" d="M49.5 105 Q52.5 101.5 55.5 105" />
          <path className="ace__line" d="M64.5 105 Q67.5 101.5 70.5 105" />
          <path className="ace__line" d="M55 110.5 Q60 115 65 110.5" />
        </g>
      )}
    </svg>
  );
}
