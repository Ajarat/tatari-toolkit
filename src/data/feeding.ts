import type { Line } from './types';

/**
 * Feeding. Each food adds points to a bar; filling the bar raises one stat ("an upgrade") and starts
 * the next, bigger bar. In game the bar reads e.g. "198/640": the total says which feeding stage the
 * Tatari is at (640 = stage 6, i.e. six upgrades so far). Reaching some stages also needs stars.
 *
 * Bar sizes and star gates are from the Clash of Critters wiki, and match in-game screenshots for
 * stages 0–6 (100, 180, 260, 340, 440, 540, 640). Blue (2-tier) Tatari can't be fed past stage 10.
 */
export const FEED_STAGES: { bar: number; stars: number }[] = [
  { bar: 100, stars: 0 },
  { bar: 180, stars: 0 },
  { bar: 260, stars: 0 },
  { bar: 340, stars: 2 },
  { bar: 440, stars: 4 },
  { bar: 540, stars: 6 },
  { bar: 640, stars: 12 },
  { bar: 750, stars: 18 },
  { bar: 860, stars: 24 },
  { bar: 960, stars: 30 },
  { bar: 1100, stars: 36 },
  { bar: 1100, stars: 45 },
  { bar: 1100, stars: 54 },
  { bar: 1100, stars: 63 },
  { bar: 1100, stars: 72 },
  { bar: 1100, stars: 78 },
];

export const MAX_FEED_STAGE = FEED_STAGES.length - 1;
export const BLUE_MAX_FEED_STAGE = 10;

/**
 * Food points still needed to get from (stage, points into its bar) to `target`. Called with 0 points
 * it's the most it could take, since players don't enter how full the current bar is.
 */
export function pointsToStage(stage: number, points: number, target: number) {
  let total = 0;
  for (let s = stage; s < target && s <= MAX_FEED_STAGE; s++) total += FEED_STAGES[s].bar - (s === stage ? points : 0);
  return Math.max(0, total);
}

/** Stars needed before a Tatari can reach this feeding stage. */
export const starsForFeedStage = (stage: number) => FEED_STAGES[Math.min(stage, MAX_FEED_STAGE)].stars;

/**
 * Stat grades, worst to best. E–A are confirmed from screenshots; S is assumed to be the top.
 *
 * Attack, health and defence each have a grade, and the card's Rating is the lowest of the three.
 * Each feeding upgrade raises one stat (the one highlighted in game) by one grade, then the game
 * picks the next stat to highlight, apparently at random. In every screenshot so far the three
 * grades add up to the feeding stage + 2 (counting E as 0), consistent with one grade per upgrade.
 */
export const GRADES = ['E', 'D', 'C', 'B', 'A', 'S'] as const;
export type Grade = (typeof GRADES)[number];

export const STATS = ['atk', 'hp', 'def'] as const;
export type Stat = (typeof STATS)[number];
export type StatGrades = Record<Stat, Grade>;
export const STAT_NAME: Record<Stat, string> = { atk: 'Attack', hp: 'Health', def: 'Defence' };

const gi = (g: Grade) => GRADES.indexOf(g);

export const gradeAtLeast = (have: Grade | undefined, need: Grade) => !!have && gi(have) >= gi(need);

/** The card's Rating: the lowest of the three stat grades. */
export const ratingOf = (grades: StatGrades): Grade => GRADES[Math.min(...STATS.map((s) => gi(grades[s])))];

/**
 * Every Tatari seen so far starts with grades totalling 2 (e.g. D/D/E), and each feeding upgrade adds
 * one grade, so the feeding stage can be read straight off the three grades without the points bar.
 * (Unproven beyond stage 6, and it can't hold past stage 13: three S grades only total 15.)
 */
export const BASE_GRADE_TOTAL = 2;
export const gradeTotal = (grades: StatGrades) => STATS.reduce((n, s) => n + gi(grades[s]), 0);
export const stageFromGrades = (grades: StatGrades) => Math.max(0, gradeTotal(grades) - BASE_GRADE_TOTAL);

/** Fewest feeding upgrades for every stat to reach `target` (more if the game highlights stats already there). */
export const upgradesToGrade = (grades: StatGrades, target: Grade) => STATS.reduce((n, s) => n + Math.max(0, gi(target) - gi(grades[s])), 0);

/** Grade letter colours, matching the in-game badges. */
export const GRADE_STYLE: Record<Grade, string> = {
  E: 'bg-violet-300 text-violet-950',
  D: 'bg-lime-400 text-lime-950',
  C: 'bg-sky-400 text-sky-950',
  B: 'bg-fuchsia-500 text-white',
  A: 'bg-amber-400 text-amber-950',
  S: 'bg-red-500 text-white',
};

/** Highest feeding stage this Tatari can be at: blue lines stop at 10, and later stages need stars. */
export function maxFeedStage(line: Line, stars: number) {
  const cap = line.forms.length === 2 ? BLUE_MAX_FEED_STAGE : MAX_FEED_STAGE;
  let stage = 0;
  while (stage < cap && starsForFeedStage(stage + 1) <= stars) stage++;
  return stage;
}
