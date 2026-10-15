import type { GoldRushConfig, RotationConfig } from '../data/events';
import type { EventSlot } from '../data/types';

const DAY = 24 * 60 * 60 * 1000;

/** One run of an event, from start (inclusive) to end (exclusive), as epoch milliseconds. */
export type EventWindow = { slot: EventSlot; start: number; end: number };

export const windowKey = (w: Pick<EventWindow, 'slot' | 'start'>) => `${w.slot}@${new Date(w.start).toISOString()}`;

/** Rotating events overlapping [from, to), in order. */
export function rotationWindows(cfg: RotationConfig, from: number, to: number): EventWindow[] {
  const len = cfg.daysEach * DAY;
  const cycle = cfg.order.length;
  const anchorIndex = cfg.order.indexOf(cfg.anchor.slot);
  const anchorStart = Date.parse(cfg.anchor.startsAt);
  // Index of the window containing `from`, counted from the anchor (negative before it).
  let i = Math.floor((from - anchorStart) / len);
  const out: EventWindow[] = [];
  for (let start = anchorStart + i * len; start < to; i++, start += len) {
    const slot = cfg.order[(((anchorIndex + i) % cycle) + cycle) % cycle];
    out.push({ slot, start, end: start + len });
  }
  return out;
}

/** Gold Rush rounds overlapping [from, to); none until the schedule's anchor is known. */
export function goldRushWindows(cfg: GoldRushConfig, from: number, to: number): EventWindow[] {
  if (!cfg.anchor) return [];
  const period = (cfg.roundDays + cfg.gapDays) * DAY;
  const anchor = Date.parse(cfg.anchor);
  const out: EventWindow[] = [];
  for (let start = anchor + Math.floor((from - anchor) / period) * period; start < to; start += period) {
    const end = start + cfg.roundDays * DAY;
    if (end > from) out.push({ slot: 'gold_rush', start, end });
  }
  return out;
}

export type Schedule = { rotation: RotationConfig; goldRush: GoldRushConfig };

/** Every scheduled event window overlapping [from, to), sorted by start. */
export function scheduleWindows(s: Schedule, from: number, to: number): EventWindow[] {
  return [...rotationWindows(s.rotation, from, to), ...goldRushWindows(s.goldRush, from, to)].sort((a, b) => a.start - b.start);
}

/**
 * Re-anchors the rotation from what a player sees in game: the event that's on now and when it ends.
 * Everything else about the rotation (order, length) stays the same.
 */
export function anchorFromCurrent(cfg: RotationConfig, current: RotationConfig['anchor']['slot'], endsAt: number): RotationConfig {
  return { ...cfg, anchor: { slot: current, startsAt: new Date(endsAt - cfg.daysEach * DAY).toISOString() } };
}

export { DAY };
