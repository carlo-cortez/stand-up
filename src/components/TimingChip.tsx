import type { TimingLight } from '../lib/useRoundTimer';

const LABELS: Record<TimingLight, string> = {
  on: 'On track',
  wrap: 'Start wrapping up',
  over: 'Past your target',
};

/**
 * Colour is never the only signal (handoff §2): each state also has its own
 * shape — circle, triangle, square — and its own words.
 */
export function TimingChip({ light }: { light: TimingLight }) {
  return (
    <div className="chip">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="chip__shape">
        {light === 'on' && <circle cx="7" cy="7" r="5.5" />}
        {light === 'wrap' && <path d="M7 1.5 L13 12.2 L1 12.2 Z" />}
        {light === 'over' && <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" />}
      </svg>
      <span>{LABELS[light]}</span>
    </div>
  );
}
