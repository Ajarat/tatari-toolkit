/**
 * Star levels. The game never shows a number: a Tatari has six icons, and each new level upgrades
 * one icon to the next type (bronze star → silver star → … → iridescent crown). So "4 silver moons and
 * 2 gold stars" is the Silver Moon type with 4 upgraded: 3 × 6 + 4 = 22. The last two types are
 * different: the six icons become a single emblem whose centre gem fills up over six levels. The
 * winged one (79–84) is confirmed from screenshots; the ribbon one (73–78) is a best guess so far.
 *
 * Copy costs per level are from the Clash of Critters wiki and TataDex's calculator (the cumulative
 * totals match: 6 copies for 3★, 19 for 6★, … 889 for 84★).
 */
export type StarIcon = 'star' | 'moon' | 'sun' | 'crown' | 'ribbons' | 'wings';
export type Finish = 'bronze' | 'silver' | 'gold' | 'iridescent' | 'red' | 'blue';

export type StarType = {
  name: string;
  icon: StarIcon;
  finish: Finish;
  copies: number[];
  /** Shown as a single emblem whose gem fills up, instead of six icons. */
  emblem?: boolean;
  /** Not yet confirmed against the game. */
  unconfirmed?: boolean;
};

const each = (n: number) => Array(6).fill(n) as number[];

export const STAR_TYPES: StarType[] = [
  { name: 'Bronze Star', icon: 'star', finish: 'bronze', copies: [1, 2, 3, 4, 4, 5] },
  { name: 'Silver Star', icon: 'star', finish: 'silver', copies: each(5) },
  { name: 'Gold Star', icon: 'star', finish: 'gold', copies: each(7) },
  { name: 'Silver Moon', icon: 'moon', finish: 'silver', copies: each(7) },
  { name: 'Gold Moon', icon: 'moon', finish: 'gold', copies: each(7) },
  { name: 'Iridescent Moon', icon: 'moon', finish: 'iridescent', copies: each(9) },
  { name: 'Gold Sun', icon: 'sun', finish: 'gold', copies: each(9) },
  { name: 'Iridescent Sun', icon: 'sun', finish: 'iridescent', copies: each(11) },
  { name: 'Red Sun', icon: 'sun', finish: 'red', copies: each(11) },
  { name: 'Blue Crown', icon: 'crown', finish: 'blue', copies: each(13) },
  { name: 'Gold Crown', icon: 'crown', finish: 'gold', copies: each(13) },
  { name: 'Iridescent Crown', icon: 'crown', finish: 'iridescent', copies: each(15) },
  { name: 'Ribbon Star', icon: 'ribbons', finish: 'iridescent', copies: each(15), emblem: true, unconfirmed: true },
  { name: 'Winged Star', icon: 'wings', finish: 'gold', copies: [18, 20, 22, 24, 26, 28], emblem: true },
];

export const SLOTS = 6;
export const MAX_STARS = STAR_TYPES.length * SLOTS;

/** Level → the type being filled and how many of its six icons are showing (1–6). Level 0 has no stars. */
export function starParts(level: number): { type: number; count: number } {
  if (level <= 0) return { type: 0, count: 0 };
  const type = Math.min(Math.floor((level - 1) / SLOTS), STAR_TYPES.length - 1);
  return { type, count: Math.min(level - type * SLOTS, SLOTS) };
}

export const starLevel = (type: number, count: number) => type * SLOTS + count;

/** What each of the six icons shows: upgraded ones first, the rest still the previous type (or empty). */
export function starSlots(level: number): (StarType | null)[] {
  const { type, count } = starParts(level);
  const previous = type > 0 ? STAR_TYPES[type - 1] : null;
  return Array.from({ length: SLOTS }, (_, i) => (i < count ? STAR_TYPES[type] : previous));
}

const plural = (n: number, name: string) => `${n} ${name}${n === 1 ? '' : 's'}`;

/** "4 Silver Moons + 2 Gold Stars", "6 Gold Stars", "No stars". */
export function describeStars(level: number) {
  const { type, count } = starParts(level);
  if (!count) return 'No stars';
  if (STAR_TYPES[type].emblem) return count === SLOTS ? `${STAR_TYPES[type].name}, gem full (max)` : `${STAR_TYPES[type].name}, gem ${count}/${SLOTS}`;
  const rest = SLOTS - count;
  return rest && type > 0 ? `${plural(count, STAR_TYPES[type].name)} + ${plural(rest, STAR_TYPES[type - 1].name)}` : plural(count, STAR_TYPES[type].name);
}

/** Copies (duplicates) needed to go from one star level to another. */
export function copiesBetween(from: number, to: number) {
  let total = 0;
  for (let level = Math.max(from, 0) + 1; level <= Math.min(to, MAX_STARS); level++) {
    const { type, count } = starParts(level);
    total += STAR_TYPES[type].copies[count - 1];
  }
  return total;
}
