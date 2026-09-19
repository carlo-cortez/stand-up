/*
 * The smallest record Home needs to tell first run from returning and to
 * write its activity line. Phase 2 replaces this with the full Session store.
 */

import { countWord, capitalise } from './format';

export type FinishedRound = { at: number; spokenSeconds: number };

const KEY = 'standup.rounds';
const LIMIT = 500;

export function loadRounds(): FinishedRound[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as FinishedRound[];
  } catch {
    return [];
  }
}

export function recordRound(round: FinishedRound): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...loadRounds(), round].slice(-LIMIT)));
  } catch {
    // Best-effort, as with all storage here.
  }
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function startOfWeek(now: Date): number {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return d.getTime();
}

function isToday(at: number, now: Date): boolean {
  const d = new Date(at);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** "Tuesday", "today", or a short date for anything older than a week. */
export function dayLabel(at: number, now = new Date()): string {
  if (isToday(at, now)) return 'today';
  if (now.getTime() - at < 6 * 86_400_000) return DAY_NAMES[new Date(at).getDay()];
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Home's one-line summary, e.g. "Three rounds this week. Tuesday was your longest yet." */
export function activityLine(rounds: FinishedRound[], now = new Date()): string {
  const thisWeek = rounds.filter((r) => r.at >= startOfWeek(now));
  if (thisWeek.length === 0) return 'Nothing yet this week.';

  const count = `${capitalise(countWord(thisWeek.length))} ${thisWeek.length === 1 ? 'round' : 'rounds'} this week.`;
  if (thisWeek.length === 1) return count;

  const longestEver = Math.max(...rounds.map((r) => r.spokenSeconds));
  const longestThisWeek = thisWeek.reduce((a, b) => (b.spokenSeconds > a.spokenSeconds ? b : a));
  if (longestThisWeek.spokenSeconds < longestEver) return count;

  const day = dayLabel(longestThisWeek.at, now);
  return `${count} ${capitalise(day)} was your longest yet.`;
}

/** "12 rounds · last one Tuesday" */
export function historyLine(rounds: FinishedRound[], now = new Date()): string {
  const last = rounds[rounds.length - 1];
  return `${rounds.length} ${rounds.length === 1 ? 'round' : 'rounds'} · last one ${dayLabel(last.at, now)}`;
}
