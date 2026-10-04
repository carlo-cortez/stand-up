/*
 * Voice analysis, off the main thread so the Review screen doesn't stutter.
 * Takes the recording as 16 kHz mono samples plus Groq's segment times, and
 * returns how the voice moved: pitch variety, loudness spread, and how many
 * sentences trailed off or ended on a rise. Pure arithmetic — nothing leaves
 * the device.
 *
 * Every threshold here is a first guess, to be tuned against real rounds.
 */

import type { Voice } from './sessions';

type Request = { samples: Float32Array; rate: number; segments: { start: number; end: number }[] };

const FRAME = 0.03; // 30 ms frames…
const HOP = 0.02; // …every 20 ms
const MIN_HZ = 75;
const MAX_HZ = 400;

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const std = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

export function analyse({ samples, rate, segments }: Request): Voice {
  const size = Math.round(FRAME * rate);
  const hop = Math.round(HOP * rate);
  const minLag = Math.floor(rate / MAX_HZ);
  const maxLag = Math.ceil(rate / MIN_HZ);

  // Loudness per frame, in dB.
  const db: number[] = [];
  for (let at = 0; at + size + maxLag < samples.length; at += hop) {
    let sum = 0;
    for (let i = at; i < at + size; i++) sum += samples[i] * samples[i];
    db.push(10 * Math.log10(sum / size + 1e-12));
  }

  // Speaking is anything well above the quietest tenth of the recording.
  const floor = [...db].sort((a, b) => a - b)[Math.floor(db.length * 0.1)] ?? -90;
  const voiced = db.map((d) => d > floor + 15 && d > -55);

  // Pitch of each voiced frame, by normalised autocorrelation.
  const pitch: (number | null)[] = db.map((_, f) => {
    if (!voiced[f]) return null;
    const at = f * hop;
    let energy = 0;
    for (let i = at; i < at + size; i++) energy += samples[i] * samples[i];
    const r = new Float64Array(maxLag + 2);
    let best = 0;
    for (let lag = minLag; lag <= maxLag + 1; lag++) {
      let sum = 0;
      let lagged = 0;
      for (let i = at; i < at + size; i++) {
        sum += samples[i] * samples[i + lag];
        lagged += samples[i + lag] * samples[i + lag];
      }
      r[lag] = sum / Math.sqrt(energy * lagged + 1e-12);
      if (lag <= maxLag) best = Math.max(best, r[lag]);
    }
    if (best <= 0.6) return null;
    // A periodic sound also matches at twice, three times its period, so the
    // strongest match can be an octave low. Take the shortest period that's
    // a peak and nearly as strong as the best: the true pitch.
    for (let lag = minLag + 1; lag <= maxLag; lag++) {
      if (r[lag] >= best * 0.9 && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) return rate / lag;
    }
    return null;
  });

  const heard = pitch.filter((p): p is number => p !== null);
  const middle = median(heard);
  const semitones = heard.map((p) => 12 * Math.log2(p / middle));
  const loud = db.filter((_, f) => voiced[f]);

  // Sentence by sentence: did the end drop in volume, or rise in pitch?
  let trailingOff = 0;
  let upspeak = 0;
  let sentences = 0;
  for (const s of segments) {
    if (s.end - s.start < 1.2) continue;
    const from = Math.floor(s.start / HOP);
    const to = Math.min(db.length, Math.ceil(s.end / HOP));
    const frames = Array.from({ length: Math.max(0, to - from) }, (_, k) => from + k).filter((f) => voiced[f]);
    if (frames.length < 20) continue;
    sentences++;

    const tail = Math.floor(frames.length * 0.8);
    if (mean(frames.slice(0, tail).map((f) => db[f])) - mean(frames.slice(tail).map((f) => db[f])) > 6) trailingOff++;

    const pitched = frames.map((f) => pitch[f]).filter((p): p is number => p !== null);
    if (pitched.length >= 12) {
      const end = pitched.slice(Math.floor(pitched.length * 0.85));
      const before = pitched.slice(Math.floor(pitched.length * 0.35), Math.floor(pitched.length * 0.85));
      if (12 * Math.log2(median(end) / median(before)) > 2) upspeak++;
    }
  }

  return {
    pitchVariety: round1(std(semitones)),
    loudnessSpread: round1(std(loud)),
    trailingOff,
    upspeak,
    sentences,
  };
}

self.onmessage = (event: MessageEvent<Request>) => {
  try {
    self.postMessage({ voice: analyse(event.data) });
  } catch {
    self.postMessage({ voice: null });
  }
};
