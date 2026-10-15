import type { EventSlot, RotatingSlot } from './types';

export type EventInfo = {
  /** What the event is called right now. Slots keep their mechanics but get re-themed by season. */
  name: string;
  /** Earlier themes for the same slot, so trial text that uses an old name still makes sense. */
  alsoKnownAs: string[];
  currency: string;
  timing: 'rotating' | 'parallel' | 'always';
};

export const EVENTS: Record<EventSlot, EventInfo> = {
  zobo_shooter: { name: 'Zobo Shooter', alsoKnownAs: [], currency: 'Gold Hunt Coins', timing: 'rotating' },
  cozy_farm: { name: 'Cozy Farm', alsoKnownAs: [], currency: 'Fertilizer', timing: 'rotating' },
  fishing: { name: 'Fishing Contest', alsoKnownAs: [], currency: 'Fishing rods', timing: 'rotating' },
  treasure_hunt: { name: 'Treasure Hunt', alsoKnownAs: [], currency: 'Pickaxes', timing: 'rotating' },
  marathon: { name: 'Raft Race', alsoKnownAs: ['Marathon Party', 'Snowboard Sprint'], currency: 'Boards', timing: 'rotating' },
  gold_rush: { name: 'Island Gold Rush', alsoKnownAs: ['Gold Rush'], currency: 'Energy drinks', timing: 'parallel' },
  horde: { name: 'Horde Invasion', alsoKnownAs: [], currency: '', timing: 'always' },
  pinball: { name: 'Pinball', alsoKnownAs: [], currency: 'Pinballs', timing: 'always' },
};

/**
 * The rotating events take turns in this order, each for `daysEach` days, starting and ending at
 * the daily server reset. `anchor` is any one known start; everything else is counted from it.
 *
 * Defaults are from one player's server (Oct 2026). The in-game dates are UTC dates: Cozy Farm is
 * listed as 18 Oct and starts at 00:00 UTC that day, which is 8pm US Eastern on the 17th. Other
 * servers can be on a different rotation, so players can re-anchor in Settings.
 */
export type RotationConfig = {
  order: RotatingSlot[];
  daysEach: number;
  anchor: { slot: RotatingSlot; startsAt: string };
};

export const DEFAULT_ROTATION: RotationConfig = {
  order: ['zobo_shooter', 'cozy_farm', 'fishing', 'treasure_hunt', 'marathon'],
  daysEach: 3,
  anchor: { slot: 'cozy_farm', startsAt: '2026-10-18T00:00:00.000Z' },
};

/**
 * Gold Rush rounds run alongside the rotation: six days on, one day off. Rounds are grouped into a
 * monthly campaign (four rounds and a special final round) whose exact timing isn't known yet.
 * Default: round 2 of October 2026 ran 15–20 Oct (UTC dates), ending 8pm US Eastern on the 20th.
 */
export type GoldRushConfig = { roundDays: number; gapDays: number; anchor: string | null };

export const DEFAULT_GOLD_RUSH: GoldRushConfig = { roundDays: 6, gapDays: 1, anchor: '2026-10-15T00:00:00.000Z' };
