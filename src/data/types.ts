/** Shapes of the generated game data (src/data/lines.json) and the event calendar config. */

export type Element = 'Water' | 'Fire' | 'Grass' | 'Rock' | 'Lightning';

/**
 * Where an event-bound trial task can be progressed.
 * - Rotating slots take turns, one at a time, three days each.
 * - gold_rush runs on its own schedule alongside the rotation.
 * - horde opens every three hours; pinball is always available. Both still need the Tatari in trial.
 */
export type RotatingSlot = 'zobo_shooter' | 'cozy_farm' | 'fishing' | 'treasure_hunt' | 'marathon';
export type EventSlot = RotatingSlot | 'gold_rush' | 'horde' | 'pinball';

/** One way to finish an event task, e.g. "use 2,000 rods in Fishing Contest". */
export type EventOption = { slot: EventSlot; amount?: number; unit?: string };

/**
 * A single trial requirement.
 * - feed: feeding grade, which keeps its progress when the Tatari is switched out of trial.
 * - event: progress only counts while the Tatari is in trial *and* one of the listed events is on.
 * - state: something you either have or don't (owned Tatari, badges, chapter cleared); counts retroactively.
 * - progress: has to be done while in trial but isn't tied to an event (feed 15 X, obtain 50 wishboxes).
 */
export type Task =
  | { kind: 'feed'; text: string; grade: 'stats3' | 'B' }
  | { kind: 'event'; text: string; options: EventOption[] }
  | { kind: 'state'; text: string }
  | { kind: 'progress'; text: string };

export type Step = {
  /** Tier being evolved into: 2, 3 or 4. */
  toTier: number;
  from: string;
  to: string;
  /** Star level needed before the trial can start. Null when the source text couldn't be read as a number. */
  stars: number | null;
  starsText: string;
  tasks: Task[];
  /** TataDex's label for how well-checked this step is. */
  confidence: 'Verified' | 'Community' | string;
  /** The form is known (from the game) but its trial requirements haven't been found yet. */
  unknown?: boolean;
};

export type Line = {
  /** URL slug, e.g. "frostnip". */
  id: string;
  element: Element;
  /** Names of every form, tier 1 first. */
  forms: string[];
  steps: Step[];
  /**
   * Lines are either 2 tiers (blue, common) or 4 tiers (purple, rare). Anything else means the
   * source is missing a stage.
   */
  incomplete: boolean;
};

export type GameData = {
  lines: Line[];
  source: { name: string; url: string; fetchedAt: string };
};
