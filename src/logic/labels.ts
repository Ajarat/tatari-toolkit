import { EVENTS } from '../data/events';
import type { EventOption, Task } from '../data/types';
import type { Line } from '../data/types';
import { feedLabel, minStarsForTier } from './plan';

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

/** Floor and tooltip text for a Tatari's stars at its current tier. */
export function starFloor(line: Line, tier: number, name: string) {
  const min = minStarsForTier(line, tier);
  return { min, minReason: min ? `A T${tier} ${name} can't have fewer than ${min} stars. It needed that many to reach this tier.` : undefined };
}
