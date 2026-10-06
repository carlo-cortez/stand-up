import { startOfWeek } from './activity';
import { CRITERIA } from './criteria';
import { enoughSpeech } from './feedback';
import type { Check, Flagged, Session } from './sessions';
import type { Structure } from './topics';

/*
 * Progress (handoff §4.8): how today and this week compare with what came
 * before, in the things feedback counts. Nothing new is stored and nothing
 * leaves the device: it is all read from rounds that have had feedback.
 *
 * It only ever compares you with yourself, and says "down from" or "up from"
 * rather than better or worse. Every threshold here is a first guess.
 */

const DAY = 86_400_000;
/** How many earlier rounds stand for "before" when there's no last week to use. */
const BEFORE = 10;
/** Fewer earlier rounds than this is too little to compare against. */
const ENOUGH = 3;

const at = (s: Session) => Date.parse(s.startedAt);
const minutes = (s: Session) => s.spokenSeconds / 60;

/** Rounds that have had feedback and enough speech to measure, oldest first. */
export function measuredRounds(sessions: Session[]): Session[] {
  return sessions
    .filter((s) => s.metrics !== undefined && enoughSpeech(s.transcript) && s.spokenSeconds > 0)
    .sort((a, b) => at(a) - at(b));
}

export type MeasureKey = 'fillers' | 'pace' | 'hedges' | 'hesitations' | 'clarity';

type Measure = {
  key: MeasureKey;
  label: string;
  /**
   * One round's share: a total and what it is out of, so a period's figure is
   * pooled (all its fillers over all its minutes) rather than an average of
   * averages, which a ten-second round would skew. Null when not measured.
   */
  part: (s: Session) => { sum: number; over: number } | null;
  /** The number as shown, and what it counts: "2.1" and "a minute". */
  figure: (value: number) => string;
  unit: string;
  /** A change smaller than this reads as "about the same". */
  same: number;
  /** Which way is the aim. Pace has none: faster isn't better. */
  wants: 'less' | 'more' | null;
};

const oneDecimal = (value: number) => value.toFixed(1);
const whole = (value: number) => String(Math.round(value));

/** A measure's value with its unit: "2.1 a minute". */
export const shown = (measure: { figure: (v: number) => string; unit: string }, value: number) =>
  `${measure.figure(value)} ${measure.unit}`;

export const MEASURES: Measure[] = [
  {
    key: 'fillers',
    label: 'Filler words',
    part: (s) => ({ sum: s.metrics!.fillerWords, over: minutes(s) }),
    figure: oneDecimal,
    unit: 'a minute',
    same: 0.3,
    wants: 'less',
  },
  {
    key: 'pace',
    label: 'Pace',
    part: (s) => ({ sum: s.metrics!.wordsPerMinute * minutes(s), over: minutes(s) }),
    figure: whole,
    unit: 'words a minute',
    same: 5,
    wants: null,
  },
  {
    key: 'hedges',
    label: 'Hedging',
    part: (s) => (s.metrics!.hedges === undefined ? null : { sum: s.metrics!.hedges, over: minutes(s) }),
    figure: oneDecimal,
    unit: 'a minute',
    same: 0.3,
    wants: 'less',
  },
  {
    key: 'hesitations',
    label: 'Mid-sentence pauses',
    part: (s) => (s.metrics!.delivery ? { sum: s.metrics!.delivery.hesitations, over: 1 } : null),
    figure: oneDecimal,
    unit: 'a round',
    same: 0.5,
    wants: 'less',
  },
  {
    key: 'clarity',
    label: 'Clarity',
    part: (s) => {
      const clarity = s.metrics!.delivery?.clarity;
      return clarity === null || clarity === undefined ? null : { sum: clarity, over: 1 };
    },
    figure: whole,
    unit: 'of 100',
    same: 3,
    wants: 'more',
  },
];

function pooled(rounds: Session[], measure: Measure): number | null {
  let sum = 0;
  let over = 0;
  for (const round of rounds) {
    const part = measure.part(round);
    if (!part) continue;
    sum += part.sum;
    over += part.over;
  }
  return over > 0 ? sum / over : null;
}

export type Row = {
  key: MeasureKey;
  label: string;
  /** The figures as shown, without the unit: "2.1" now, "3.4" before. */
  now: string;
  before: string;
  unit: string;
  change: 'less' | 'more' | 'same';
  /** The change went the way this measure aims. Never set for a change the other way. */
  wanted: boolean;
};

export type Comparison = {
  rows: Row[];
  nowCount: number;
  beforeCount: number;
  /** What "before" is: last week's rounds, or simply the rounds before. */
  against: 'last-week' | 'earlier';
};

function rows(now: Session[], before: Session[]): Row[] {
  const out: Row[] = [];
  for (const measure of MEASURES) {
    const a = pooled(now, measure);
    const b = pooled(before, measure);
    if (a === null || b === null) continue;
    const shownNow = measure.figure(a);
    const shownBefore = measure.figure(b);
    const change =
      Math.abs(a - b) < measure.same || shownNow === shownBefore ? 'same' : a < b ? 'less' : 'more';
    out.push({
      key: measure.key,
      label: measure.label,
      now: shownNow,
      before: shownBefore,
      unit: measure.unit,
      change,
      wanted: change !== 'same' && change === measure.wants,
    });
  }
  return out;
}

function comparison(now: Session[], before: Session[], against: Comparison['against']): Comparison | null {
  const found = rows(now, before);
  return found.length ? { rows: found, nowCount: now.length, beforeCount: before.length, against } : null;
}

/** Today's rounds against the ten before today. Null with no round today, or too few before. */
export function todayComparison(sessions: Session[], now = new Date()): Comparison | null {
  const all = measuredRounds(sessions);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const today = all.filter((s) => at(s) >= start);
  const before = all.filter((s) => at(s) < start).slice(-BEFORE);
  if (today.length === 0 || before.length < ENOUGH) return null;
  return comparison(today, before, 'earlier');
}

/**
 * This week (from Monday) against last week; with nothing last week, against
 * the ten rounds before this week. Null with no round this week.
 */
export function weekComparison(sessions: Session[], now = new Date()): Comparison | null {
  const all = measuredRounds(sessions);
  const monday = startOfWeek(now);
  const thisWeek = all.filter((s) => at(s) >= monday);
  if (thisWeek.length === 0) return null;
  const lastWeek = all.filter((s) => at(s) >= monday - 7 * DAY && at(s) < monday);
  if (lastWeek.length > 0) return comparison(thisWeek, lastWeek, 'last-week');
  const before = all.filter((s) => at(s) < monday).slice(-BEFORE);
  return before.length < ENOUGH ? null : comparison(thisWeek, before, 'earlier');
}

/** One line for the way in from History: the first change that went the way it aims, if any. */
export function headline(sessions: Session[], now = new Date()): string {
  const week = weekComparison(sessions, now);
  const best = week?.rows.find((r) => r.wanted);
  if (best) {
    const direction = best.change === 'less' ? 'down' : 'up';
    return `${best.label} ${direction} this week: ${best.now} ${best.unit}, from ${best.before}.`;
  }
  if (week) return week.against === 'last-week' ? 'See how this week compares with last.' : 'See how this week compares.';
  return 'Your filler words, pace and habits over time.';
}

/** One measure, round by round, for the last `span` rounds that have it. Oldest first. */
export function series(sessions: Session[], key: MeasureKey, span = 20): number[] {
  const measure = MEASURES.find((m) => m.key === key)!;
  return measuredRounds(sessions)
    .map((s) => measure.part(s))
    .filter((p): p is { sum: number; over: number } => p !== null && p.over > 0)
    .map((p) => p.sum / p.over)
    .slice(-span);
}

export type Rate = { key: string; label: string; there: number; partly: number };

/**
 * How often each checklist item was there, over the last `span` rounds the
 * coach marked in that shape. PREP and STAR are counted apart: they mark
 * different things. Null until there are three such rounds.
 */
export function checklistRates(
  sessions: Session[],
  structure: Structure,
  span = 10,
): { rounds: number; rates: Rate[] } | null {
  const marked = measuredRounds(sessions)
    .filter((s) => s.written?.criteria && (s.written.structure ?? 'prep') === structure)
    .slice(-span);
  if (marked.length < ENOUGH) return null;
  const rates = CRITERIA[structure].map(({ key, label }) => {
    const marks = marked.map((s) => (s.written!.criteria as Record<string, Check | undefined>)[key]?.mark);
    return {
      key,
      label,
      there: marks.filter((m) => m === 'there').length,
      partly: marks.filter((m) => m === 'partly').length,
    };
  });
  return { rounds: marked.length, rates };
}

/** The words said most, of the ones feedback flags, over the last `days` days. */
export function habits(sessions: Session[], now = new Date(), days = 30, top = 5): Flagged[] {
  const since = now.getTime() - days * DAY;
  const totals = new Map<string, Flagged>();
  for (const round of measuredRounds(sessions)) {
    if (at(round) < since) continue;
    for (const { word, kind, count } of round.metrics!.flagged) {
      const id = `${kind}:${word}`;
      totals.set(id, { word, kind, count: (totals.get(id)?.count ?? 0) + count });
    }
  }
  return [...totals.values()]
    .filter((f) => f.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, top);
}
