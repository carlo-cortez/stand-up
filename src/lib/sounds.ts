/*
 * The card draw's three sounds — riffle, spread, flip — made in the browser
 * from shaped noise rather than loaded from files: nothing to fetch, license
 * or precache, and the texture is tuned here in numbers.
 *
 * Only the draw makes sound, and the draw is over before the mic opens
 * (recording starts with the speaking phase), so none of this can reach a
 * recording or the transcript.
 *
 * Browsers start audio suspended until a tap. unlockSounds() runs on the first
 * gesture anywhere in the app; the Start button's tap is enough to have it
 * ready by the time the deck arrives. With no gesture yet — a refresh straight
 * into a draw — the sounds simply don't play.
 */

import { loadSettings } from './settings';

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (context) return context;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  // One second of white noise, reused by every sound.
  noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return context;
}

/** Call from a user gesture. Safe to call more than once. */
export function unlockSounds(): void {
  const ctx = audio();
  if (!ctx || ctx.state === 'running') return;
  void ctx.resume();
  // iOS wants something actually played inside the gesture before it believes it.
  const silent = ctx.createBufferSource();
  silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  silent.connect(ctx.destination);
  silent.start();
}

/** Listen for the first tap or key anywhere, unlock, then stop listening. */
export function unlockSoundsOnFirstGesture(): void {
  const events = ['pointerdown', 'touchend', 'keydown'] as const;
  const handler = () => {
    // Switched off, the app never makes an audio context at all — so turning
    // sounds off also rules them out entirely when a recording misbehaves.
    if (!loadSettings().sounds) return;
    unlockSounds();
    if (context?.state === 'running') events.forEach((e) => window.removeEventListener(e, handler, true));
  };
  events.forEach((e) => window.addEventListener(e, handler, true));
}

function ready(): AudioContext | null {
  if (!loadSettings().sounds) return null;
  return context?.state === 'running' ? context : null;
}

/**
 * How long a sound takes from being played to being heard: the browser's
 * own buffer plus the device's output, which on phones can be 50–150ms, and
 * more over Bluetooth. Not every browser reports it (Safari often doesn't);
 * then it counts as none.
 */
function lag(ctx: AudioContext): number {
  const reported = (ctx.baseLatency || 0) + (ctx.outputLatency || 0);
  return Number.isFinite(reported) ? Math.min(Math.max(reported, 0), 0.4) : 0;
}

/**
 * One burst of filtered noise: the building block of every sound here.
 * `at` is seconds from now, when it should be heard, so it is played that
 * much earlier to land on the animation; `length` is its duration in seconds.
 */
function burst(
  ctx: AudioContext,
  at: number,
  length: number,
  { frequency, q = 1, gain, type = 'bandpass' }: { frequency: number; q?: number; gain: number; type?: BiquadFilterType },
): AudioBufferSourceNode {
  const start = ctx.currentTime + Math.max(0, at - lag(ctx));
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(gain, start + Math.min(0.004, length / 4));
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
  source.connect(filter).connect(envelope).connect(ctx.destination);
  // A random offset into the buffer, so no two bursts are the same noise.
  source.start(start, Math.random() * 0.9, length + 0.02);
  return source;
}

/**
 * A riffle: the two halves of the deck falling into each other, card by
 * card — a fast run of tiny clicks that slows as it runs out.
 */
function riffle(ctx: AudioContext, at: number, duration: number): AudioBufferSourceNode[] {
  const clicks = 16;
  return Array.from({ length: clicks }, (_, i) => {
    const t = at + duration * Math.pow(i / clicks, 1.3) + (Math.random() - 0.5) * 0.006;
    return burst(ctx, t, 0.012 + Math.random() * 0.008, {
      frequency: 2600 + Math.random() * 1800,
      q: 1.6,
      gain: 0.07 + Math.random() * 0.05,
    });
  });
}

function stopAll(sources: AudioBufferSourceNode[]): () => void {
  return () => {
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        // Already finished.
      }
    }
  };
}

/**
 * The shuffle, timed to the deck-intro keyframes in Round.css. Returns a stop
 * function, for leaving mid-shuffle (and StrictMode's double mount).
 */
export function playShuffle(): () => void {
  const ctx = ready();
  if (!ctx) return () => {};
  return stopAll([
    // The halves close at 30–42% and 52–64% of the 1800ms intro.
    ...riffle(ctx, 0.56, 0.2),
    ...riffle(ctx, 0.95, 0.2),
    // The fan spreads over the last third: one soft slide across it.
    burst(ctx, 1.2, 0.5, { frequency: 1400, q: 0.6, gain: 0.035 }),
  ]);
}

/** The picked card turning over; the flip starts 440ms after the tap. */
export function playFlip(reducedMotion: boolean): void {
  const ctx = ready();
  if (!ctx) return;
  // Timed to the card passing edge-on, halfway through its 520ms turn.
  const at = reducedMotion ? 0.44 : 0.66;
  burst(ctx, at, 0.09, { frequency: 1800, q: 0.8, gain: 0.08 });
  burst(ctx, at + 0.05, 0.05, { frequency: 700, q: 1.2, gain: 0.05, type: 'lowpass' });
}
