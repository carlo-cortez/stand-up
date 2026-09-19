/** 83 → "1:23". Negative input clamps to 0:00. */
export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 20 → "+0:20", for overtime. */
export function plusMmss(totalSeconds: number): string {
  return `+${mmss(totalSeconds)}`;
}

/**
 * The countdown shows whole seconds rounded up, so a two-minute round opens
 * on 2:00 and reads 0:00 only at the instant it runs out.
 */
export function countdown(remainingSeconds: number): string {
  return mmss(Math.ceil(remainingSeconds));
}

/** 120 → "2 min". */
export function minutes(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten',
];

/** Small counts read better as words: 3 → "three". Falls back to digits. */
export function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
