import { EVENTS } from '../data/events';
import type { EventOption, Task } from '../data/types';
import type { Line } from '../data/types';
import { FEED_STAGES, gradeAtLeast, pointsToStage, STAT_NAME, STATS, starsForFeedStage, upgradesToGrade } from '../data/feeding';
import { FEED_TASK_STAGE, feedLabel, feedStage, feedTaskMet, minStarsForTier, rating, type OwnedTatari } from './plan';

export const eventName = (slot: EventOption['slot']) => EVENTS[slot].name;

/** "2,000 rods in Fishing Contest". */
export function optionLabel(o: EventOption) {
  return o.amount ? `${o.amount.toLocaleString()} ${o.unit} in ${eventName(o.slot)}` : eventName(o.slot);
}

/** Readable label for a task: event options spelled out with current event names, others as written. */
export function taskLabel(t: Task) {
  if (t.kind === 'feed') return feedLabel(t);
  if (t.kind === 'event' && t.options.every((o) => o.amount)) return t.options.map(optionLabel).join(' or ');
  return t.text;
}

/**
 * Floor and tooltip text for a Tatari's stars: its tier needed them to unlock, and so do some
 * feeding stages.
 */
export function starFloor(line: Line, t: Pick<OwnedTatari, 'tier' | 'grades'>, name: string) {
  const tierMin = minStarsForTier(line, t.tier);
  const stage = feedStage(t);
  const feedMin = starsForFeedStage(stage);
  const min = Math.max(tierMin, feedMin);
  if (!min) return { min, minReason: undefined };
  const why = feedMin > tierMin ? `its stat grades mean feeding stage ${stage}, which needs that many` : 'it needed that many to reach this tier';
  return { min, minReason: `A T${t.tier} ${name} can't have fewer than ${min} stars: ${why}.` };
}

/** Where a Tatari stands on a feed task: "Stage 2 of 3 · 339 more food points" or "Rating C, needs B". */
export function feedProgress(t: OwnedTatari, task: Extract<Task, { kind: 'feed' }>) {
  if (feedTaskMet(t, task)) return 'Done';
  const stage = feedStage(t);
  if (task.grade === 'B') {
    if (!t.grades) return 'Set its stat grades to check';
    const n = upgradesToGrade(t.grades, 'B');
    const low = STATS.filter((s) => !gradeAtLeast(t.grades![s], 'B')).map((s) => `${STAT_NAME[s]} ${t.grades![s]}`);
    const pts = pointsToStage(stage, 0, stage + n);
    const gate = starsForFeedStage(stage + n);
    return `Rating ${rating(t)} (${low.join(', ')}) · at least ${n} more upgrade${n === 1 ? '' : 's'}, up to ${pts.toLocaleString()} food points${t.stars < gate ? ` · needs ${gate}★` : ''}`;
  }
  if (!t.grades) return 'Set its stat grades to check';
  const pts = pointsToStage(stage, 0, FEED_TASK_STAGE);
  const gate = starsForFeedStage(FEED_TASK_STAGE);
  return `Stage ${stage} of ${FEED_TASK_STAGE} · up to ${pts.toLocaleString()} more food points${t.stars < gate ? ` · needs ${gate}★` : ''}`;
}

export const feedBarLabel = (stage: number) => `/${FEED_STAGES[stage].bar}`;
