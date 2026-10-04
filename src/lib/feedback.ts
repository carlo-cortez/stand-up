import type { Delivery, Flagged, Metrics, Session, Written } from './sessions';

/*
 * The counted half of the feedback card (handoff §4.5). Everything here is
 * plain string work over the transcript: no model, no network, nothing to
 * pay for, and testable on its own. Only the written half needs a model.
 */

/** From the design brief. Kept in sync with it deliberately — it is the spec. */
const FILLERS = ['um', 'uh', 'erm', 'mm', 'like', 'you know', 'i mean'];
const VAGUE = ['stuff', 'things', 'thing', 'kind of', 'sort of', 'basically', 'whatever'];
/**
 * Softeners that undercut a point. "I feel like" is left out because "like"
 * already counts as a filler, and "sort of" because it's already vague.
 */
const HEDGES = ['i think', 'maybe', 'probably', 'i guess', 'perhaps', 'i suppose'];

const countPhrase = (text: string, phrase: string): number => {
  // Whole words only: "like" must not match "likely", and "thing" not "things".
  const pattern = new RegExp(`(?<![\\p{L}'])${phrase.replace(/ /g, '\\s+')}(?![\\p{L}'])`, 'giu');
  return (text.match(pattern) ?? []).length;
};

export function wordCount(transcript: string): number {
  return (transcript.trim().match(/[\p{L}'’-]+/gu) ?? []).length;
}

/**
 * Below this there is nothing to give feedback on: about ten seconds of
 * talking. A four-second round of breath came back as zero words, three
 * zeros and "Your lowest so far" — praise for saying nothing.
 */
export const MIN_WORDS = 20;

export function enoughSpeech(transcript: string | undefined): boolean {
  return wordCount(transcript ?? '') >= MIN_WORDS;
}

/** A round whose numbers mean something: measured, and long enough to measure. */
function counts(s: Session): boolean {
  return s.metrics !== undefined && enoughSpeech(s.transcript);
}

export function measure(transcript: string, spokenSeconds: number, timing?: Timing): Metrics {
  const flagged: Flagged[] = [];
  let fillerWords = 0;
  let vagueWords = 0;

  for (const word of FILLERS) {
    const count = countPhrase(transcript, word);
    if (count > 0) {
      flagged.push({ word, kind: 'filler', count });
      fillerWords += count;
    }
  }
  for (const word of VAGUE) {
    const count = countPhrase(transcript, word);
    if (count > 0) {
      flagged.push({ word, kind: 'vague', count });
      vagueWords += count;
    }
  }
  let hedges = 0;
  for (const word of HEDGES) {
    const count = countPhrase(transcript, word);
    if (count > 0) {
      flagged.push({ word, kind: 'hedge', count });
      hedges += count;
    }
  }

  const minutes = Math.max(spokenSeconds, 1) / 60;
  return {
    wordsPerMinute: Math.round(wordCount(transcript) / minutes),
    fillerWords,
    vagueWords,
    hedges,
    // Most-said first: the ones worth noticing lead.
    flagged: flagged.sort((a, b) => b.count - a.count),
    delivery: timing && timing.words.length > 1 ? delivery(timing) : undefined,
  };
}

/*
 * ---- Delivery, from Groq's timings. Every threshold below is a first guess,
 * to be tuned against real rounds (handoff §4.5), like the filler count was.
 */

const WINDOW = 15; // seconds per pace window
const PAUSE = 1.0; // a gap this long between words is a pause
const HESITATION = 1.5; // …and this long, mid-sentence, a hesitation

const round1 = (n: number) => Math.round(n * 10) / 10;

export function delivery({ words, segments }: Timing): Delivery {
  const first = words[0].start;
  const last = words[words.length - 1].end;

  // Words per minute in each 15-second stretch. A short last stretch counts
  // only if it's at least half a window, scaled up to a full one.
  const paceWindows: number[] = [];
  for (let from = first; from < last; from += WINDOW) {
    const length = Math.min(WINDOW, last - from);
    if (length < WINDOW / 2) break;
    const count = words.filter((w) => w.start >= from && w.start < from + length).length;
    paceWindows.push(Math.round((count / length) * 60));
  }
  const mean = paceWindows.reduce((a, b) => a + b, 0) / (paceWindows.length || 1);
  const spread =
    paceWindows.length > 1
      ? Math.sqrt(paceWindows.reduce((a, b) => a + (b - mean) ** 2, 0) / paceWindows.length) / (mean || 1)
      : 0;

  // Gaps between words. A gap inside one segment is mid-sentence; between
  // segments it's usually the natural breath between thoughts.
  const segmentOf = (t: number) => segments.findIndex((s) => t >= s.start && t <= s.end);
  let pauses = 0;
  let hesitations = 0;
  let longestPause = 0;
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap < PAUSE) continue;
    pauses++;
    longestPause = Math.max(longestPause, gap);
    const seg = segmentOf(words[i - 1].end);
    if (gap >= HESITATION && seg !== -1 && seg === segmentOf(words[i].start)) hesitations++;
  }

  return {
    paceWindows,
    paceSpread: Math.round(spread * 100),
    pauses,
    hesitations,
    longestPause: round1(longestPause),
    clarity: clarity(segments),
  };
}

/**
 * How sure the transcriber was, weighted by how long each segment ran, over
 * the segments that were speech. avg_logprob near -0.15 is crisp; near -1 the
 * transcriber was guessing. Mapped to 0–100.
 */
function clarity(segments: Segment[]): number | null {
  const speech = segments.filter((s) => s.no_speech_prob < 0.5 && s.end > s.start);
  const total = speech.reduce((a, s) => a + (s.end - s.start), 0);
  if (total === 0) return null;
  const avg = speech.reduce((a, s) => a + s.avg_logprob * (s.end - s.start), 0) / total;
  return Math.round(Math.max(0, Math.min(1, (avg + 1) / 0.85)) * 100);
}

/**
 * How this round compares with the rounds before it — the "−4 vs avg" line on
 * each tile. Silent until there are three earlier rounds to average, rather
 * than reading meaning into one.
 */
export function deltaAgainstAverage(
  history: Session[],
  current: Session,
  key: 'wordsPerMinute' | 'fillerWords' | 'vagueWords',
): number | null {
  const earlier = history
    .filter((s) => s.id !== current.id && counts(s) && Date.parse(s.startedAt) < Date.parse(current.startedAt))
    .map((s) => s.metrics![key]);
  if (earlier.length < 3) return null;
  const average = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  return Math.round((current.metrics?.[key] ?? 0) - average);
}

/** Filler counts across the last few rounds, oldest first, for the small bar strip. */
export function fillerHistory(history: Session[], current: Session, span = 5): number[] {
  return history
    .filter((s) => counts(s) && Date.parse(s.startedAt) <= Date.parse(current.startedAt))
    .slice(-span)
    .map((s) => s.metrics!.fillerWords);
}

/** A word and when it was said, in seconds from the start of the recording. */
export type Word = { word: string; start: number; end: number };
/** Roughly a sentence; avg_logprob is how sure the transcriber was of it. */
export type Segment = { start: number; end: number; avg_logprob: number; no_speech_prob: number };
export type Timing = { words: Word[]; segments: Segment[] };

/** words and segments are absent from a function deployed before they existed. */
export type FeedbackResult = { transcript: string; written: Written | null; words?: Word[]; segments?: Segment[] };

/**
 * The transcriber reads the file by its name, so the name has to match what
 * the browser recorded: webm on Chrome and Firefox, mp4 on Safari and iPhones.
 */
function extensionOf(type: string): string {
  if (/mp4|m4a|aac/.test(type)) return 'mp4';
  if (/ogg/.test(type)) return 'ogg';
  if (/wav/.test(type)) return 'wav';
  if (/mpeg|mp3/.test(type)) return 'mp3';
  return 'webm';
}

/** Something a person can act on, never a status code. */
async function explain(response: Response): Promise<string> {
  if (response.status === 404 || response.status === 503) {
    return 'Feedback is not switched on for this copy of the app yet.';
  }
  if (response.status === 413) return 'That recording is too long to send.';
  if (response.status === 422) {
    return (await response.text().catch(() => '')) || 'Nothing could be heard in that recording.';
  }
  return 'That did not work. Your round is safe — try again in a moment.';
}

/**
 * Sends the recording to our own function, which holds the API key — it can
 * never be in the browser. Returns the transcript, and the written half when
 * the model obliged; the counted half is derived here either way.
 */
export async function requestFeedback(blob: Blob, targetSeconds: number, topic: string): Promise<FeedbackResult> {
  const body = new FormData();
  body.append('audio', blob, `round.${extensionOf(blob.type)}`);
  body.append('targetSeconds', String(targetSeconds));
  body.append('topic', topic);

  const response = await fetch('/api/feedback', { method: 'POST', body });
  if (!response.ok) throw new Error(await explain(response));
  return (await response.json()) as FeedbackResult;
}
