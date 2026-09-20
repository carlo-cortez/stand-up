import type { Flagged, Metrics, Session, Written } from './sessions';

/*
 * The counted half of the feedback card (handoff §4.5). Everything here is
 * plain string work over the transcript: no model, no network, nothing to
 * pay for, and testable on its own. Only the written half needs a model.
 */

/** From the design brief. Kept in sync with it deliberately — it is the spec. */
const FILLERS = ['um', 'uh', 'erm', 'mm', 'like', 'you know', 'i mean'];
const VAGUE = ['stuff', 'things', 'thing', 'kind of', 'sort of', 'basically', 'whatever'];

const countPhrase = (text: string, phrase: string): number => {
  // Whole words only: "like" must not match "likely", and "thing" not "things".
  const pattern = new RegExp(`(?<![\\p{L}'])${phrase.replace(/ /g, '\\s+')}(?![\\p{L}'])`, 'giu');
  return (text.match(pattern) ?? []).length;
};

export function wordCount(transcript: string): number {
  return (transcript.trim().match(/[\p{L}'’-]+/gu) ?? []).length;
}

export function measure(transcript: string, spokenSeconds: number): Metrics {
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

  const minutes = Math.max(spokenSeconds, 1) / 60;
  return {
    wordsPerMinute: Math.round(wordCount(transcript) / minutes),
    fillerWords,
    vagueWords,
    // Most-said first: the ones worth noticing lead.
    flagged: flagged.sort((a, b) => b.count - a.count),
  };
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
    .filter((s) => s.id !== current.id && s.metrics && Date.parse(s.startedAt) < Date.parse(current.startedAt))
    .map((s) => s.metrics![key]);
  if (earlier.length < 3) return null;
  const average = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  return Math.round((current.metrics?.[key] ?? 0) - average);
}

/** Filler counts across the last few rounds, oldest first, for the small bar strip. */
export function fillerHistory(history: Session[], current: Session, span = 5): number[] {
  return history
    .filter((s) => s.metrics && Date.parse(s.startedAt) <= Date.parse(current.startedAt))
    .slice(-span)
    .map((s) => s.metrics!.fillerWords);
}

export type FeedbackResult = { transcript: string; written: Written | null };

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
export async function requestFeedback(blob: Blob, targetSeconds: number): Promise<FeedbackResult> {
  const body = new FormData();
  body.append('audio', blob, 'round.webm');
  body.append('targetSeconds', String(targetSeconds));

  const response = await fetch('/api/feedback', { method: 'POST', body });
  if (!response.ok) throw new Error(await explain(response));
  return (await response.json()) as FeedbackResult;
}
