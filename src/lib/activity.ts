/*
 * Home's view of past rounds: first run versus returning, the activity line
 * and the History row. Reads the Session store, plus the bare records kept
 * for rounds finished before sessions existed, so nothing already done is
 * forgotten.
 */

import { countWord, capitalise } from './format';
import { loadLegacyRounds, loadSessions } from './sessions';

export type FinishedRound = { at: number; spokenSeconds: number };

export function loadRounds(): FinishedRound[] {
  const sessions = loadSessions().map((s) => ({ at: Date.parse(s.startedAt), spokenSeconds: s.spokenSeconds }));
  return [...loadLegacyRounds(), ...sessions].sort((a, b) => a.at - b.at);
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

/* ---------- History: the trend card (handoff §4.6) ---------- */

export type WeekCount = { count: number; current: boolean };

/** Rounds per week for the last four weeks, oldest first. */
export function weeklyCounts(times: number[], now = new Date()): WeekCount[] {
  const thisWeek = startOfWeek(now);
  const week = 7 * 86_400_000;
  return [3, 2, 1, 0].map((back) => {
    const from = thisWeek - back * week;
    return {
      count: times.filter((at) => at >= from && at < from + week).length,
      current: back === 0,
    };
  });
}

/** The mean of whatever ratings were given, or null if none were. */
export function averageRating(ratings: Record<string, number | undefined> | undefined): number | null {
  const given = Object.values(ratings ?? {}).filter((v): v is number => typeof v === 'number');
  if (given.length === 0) return null;
  return given.reduce((a, b) => a + b, 0) / given.length;
}

/**
 * One plain sentence about the direction of travel — no charts, no
 * percentages. It only claims a trend once there are enough rated rounds to
 * mean anything; before that it says what is actually true.
 */
export function trendSentence(
  rounds: { at: number; rating: number | null }[],
  weeks: WeekCount[],
): string {
  const busiest =
    weeks[3].count > 0 && weeks[3].count >= Math.max(...weeks.map((w) => w.count))
      ? 'this is your busiest week so far'
      : null;

  const rated = rounds.filter((r) => r.rating !== null) as { at: number; rating: number }[];
  if (rated.length < 4) {
    const start = busiest ? 'Keep going' : 'A few more rounds';
    return `${start} and the trend shows up here — it needs four rated rounds to say anything useful.`;
  }

  const half = Math.floor(rated.length / 2);
  const mean = (list: { rating: number }[]) => list.reduce((a, b) => a + b.rating, 0) / list.length;
  const before = mean(rated.slice(0, half));
  const after = mean(rated.slice(half));
  const change = after - before;
  const from = before.toFixed(1);
  const to = after.toFixed(1);

  const ratingPart =
    change >= 0.2
      ? `Your self-ratings have crept up from ${from} to ${to}`
      : change <= -0.2
        ? `Your self-ratings have eased from ${from} to ${to}`
        : `Your self-ratings are holding steady around ${to}`;

  return busiest ? `${ratingPart}, and ${busiest}.` : `${ratingPart}.`;
}

/*
 * Topics come round again: there are 35, and a category on one difficulty can
 * hold a single topic. When one does, say so on Prep, while there's still time
 * to take a new angle or draw another.
 */

/** Shorter than this was a false start, not an answer. */
const ANSWERED_SECONDS = 10;

export type Answered = { times: number; last: number };

/** How often this topic has been answered before, and when last. Null if never. */
export function answeredBefore(topicId: string): Answered | null {
  const times = loadSessions()
    .filter((s) => s.topicId === topicId && s.spokenSeconds >= ANSWERED_SECONDS)
    .map((s) => Date.parse(s.startedAt));
  if (times.length === 0) return null;
  return { times: times.length, last: Math.max(...times) };
}

/** "earlier today", "on Tuesday", "on 12 Sept" — for a sentence about when. */
export function whenLabel(at: number, now = new Date()): string {
  const day = dayLabel(at, now);
  return day === 'today' ? 'earlier today' : `on ${day}`;
}

/** Prep's line: "You've answered this one before, on Tuesday." */
export function answeredLine(answered: Answered, now = new Date()): string {
  const when = whenLabel(answered.last, now);
  return answered.times === 1
    ? `You've answered this one before, ${when}.`
    : `You've answered this one ${countWord(answered.times)} times, most recently ${when}.`;
}
