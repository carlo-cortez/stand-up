import type { Structure } from './topics';

/**
 * What the coach marks, in the order the prep hint taught them, then the
 * topic: Point, Reason, Example, Point for most topics; Situation, Task,
 * Action, Result for a question about a time you did something.
 */
export const CRITERIA: Record<Structure, { key: string; label: string }[]> = {
  prep: [
    { key: 'point', label: 'Made a clear point' },
    { key: 'reason', label: 'Backed it with a reason' },
    { key: 'example', label: 'Gave an example' },
    { key: 'landed', label: 'Landed it at the end' },
    { key: 'answered', label: 'Answered the question' },
  ],
  star: [
    { key: 'situation', label: 'Set the scene' },
    { key: 'task', label: 'Said what was on you' },
    { key: 'action', label: 'Walked through what you did' },
    { key: 'result', label: 'Gave the result' },
    { key: 'answered', label: 'Answered the question' },
  ],
};
