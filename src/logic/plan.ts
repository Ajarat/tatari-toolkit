import { EVENTS } from '../data/events';
import { gradeAtLeast, ratingOf, stageFromGrades, type StatGrades } from '../data/feeding';
import type { EventSlot, Line, Step, Task } from '../data/types';
import { windowKey, type EventWindow } from './schedule';

/** A Tatari the player owns, as stored on the device. */
export type OwnedTatari = {
  uid: string;
  lineId: string;
  /** Current tier, 1-based. */
  tier: number;
  stars: number;
  /** Ticked prerequisites, keyed by `checkKey`. Keys include the target tier, so evolving starts a fresh list. */
  checks: Record<string, boolean>;
  /** Attack, health and defence grades. The card's Rating is the lowest; the feeding stage follows from them. */
  grades?: StatGrades;
  /** Window (see `windowKey`) the player has chosen to evolve this Tatari in. */
  plannedFor?: string;
  note?: string;
};

export const checkKey = (step: Step, taskIndex: number) => `${step.toTier}:${taskIndex}`;

export const nextStep = (line: Line, tier: number): Step | undefined => line.steps.find((s) => s.toTier === tier + 1);

/**
 * Fewest stars a Tatari can have at a tier: you can't start the trial for a tier until you have its
 * star requirement, so being there means you had at least that many. Stars never go down.
 */
export const minStarsForTier = (line: Line, tier: number) =>
  Math.max(0, ...line.steps.filter((s) => s.toTier <= tier).map((s) => s.stars ?? 0));

/** Tasks the player gets ready *before* the trial: feeding (kept when switched out) and things they already own. */
export const isPrepTask = (t: Task) => t.kind === 'feed' || t.kind === 'state';

/** Slots that only exist on some days. Pinball and Horde are always around, so they never decide the timing. */
const isScheduled = (slot: EventSlot) => EVENTS[slot].timing !== 'always';

/**
 * Which scheduled events this step's trial has to be done in, or null if it can be done any time.
 * A step can have several event tasks; a window works when every scheduled task can be done in it.
 */
export function stepSlots(step: Step): EventSlot[][] | null {
  const constrained = step.tasks
    .filter((t): t is Extract<Task, { kind: 'event' }> => t.kind === 'event')
    .map((t) => t.options.map((o) => o.slot))
    .filter((slots) => slots.every(isScheduled));
  return constrained.length ? constrained : null;
}

export const fitsWindow = (step: Step, slot: EventSlot) => stepSlots(step)?.every((slots) => slots.includes(slot)) ?? false;

/** Feeding stage a "feed" task asks for: "raise stats 3 times" is stage 3. B quality is about the Rating instead. */
export const FEED_TASK_STAGE = 3;

/** Whether a feed task is done, from what the player entered about feeding (it counts retroactively). */
export function feedTaskMet(t: OwnedTatari, task: Extract<Task, { kind: 'feed' }>) {
  return task.grade === 'B' ? gradeAtLeast(rating(t), 'B') : feedStage(t) >= FEED_TASK_STAGE;
}

/** Feeding stage (number of feeding upgrades), worked out from the stat grades; 0 until they're entered. */
export const feedStage = (t: Pick<OwnedTatari, 'grades'>) => (t.grades ? stageFromGrades(t.grades) : 0);

/** The card's Rating letter, once the player has entered the stat grades. */
export const rating = (t: OwnedTatari) => (t.grades ? ratingOf(t.grades) : undefined);

/** A prep task is done when its feeding is reached, or (for other tasks) when the player ticked it. */
export const prepTaskMet = (t: OwnedTatari, step: Step, task: Task, index: number) =>
  task.kind === 'feed' ? feedTaskMet(t, task) : !!t.checks[checkKey(step, index)];

export type Readiness = {
  step: Step;
  starsMissing: number;
  /** The trial isn't known yet, so it can't be planned or called ready. */
  unknown: boolean;
  /** Prep tasks not ticked yet, with their index in step.tasks. */
  unmet: { task: Task; index: number }[];
  ready: boolean;
};

export function readiness(t: OwnedTatari, line: Line): Readiness | null {
  const step = nextStep(line, t.tier);
  if (!step) return null;
  const starsMissing = Math.max(0, (step.stars ?? 0) - t.stars);
  const unmet = step.tasks.map((task, index) => ({ task, index })).filter(({ task, index }) => isPrepTask(task) && !prepTaskMet(t, step, task, index));
  const unknown = !!step.unknown;
  return { step, starsMissing, unknown, unmet, ready: !unknown && starsMissing === 0 && unmet.length === 0 };
}

export type Candidate = { tatari: OwnedTatari; line: Line; r: Readiness };

/** Owned Tatari whose next evolution can be done in this window. Planned first, then ready, then closest to ready. */
export function candidatesFor(w: EventWindow, owned: OwnedTatari[], lines: Map<string, Line>): Candidate[] {
  const key = windowKey(w);
  const out: Candidate[] = [];
  for (const t of owned) {
    const line = lines.get(t.lineId);
    const r = line && readiness(t, line);
    if (r && fitsWindow(r.step, w.slot)) out.push({ tatari: t, line, r });
  }
  const score = (c: Candidate) => (c.tatari.plannedFor === key ? 0 : 1) * 1000 + (c.r.ready ? 0 : 100) + c.r.starsMissing + c.r.unmet.length;
  return out.sort((a, b) => score(a) - score(b));
}

/** Owned Tatari whose next evolution doesn't depend on a scheduled event (pinball, Horde, or nothing at all). */
export function anytimeCandidates(owned: OwnedTatari[], lines: Map<string, Line>): Candidate[] {
  const out: Candidate[] = [];
  for (const t of owned) {
    const line = lines.get(t.lineId);
    const r = line && readiness(t, line);
    if (r && !r.unknown && !stepSlots(r.step)) out.push({ tatari: t, line, r });
  }
  return out.sort((a, b) => Number(b.r.ready) - Number(a.r.ready));
}

/** The next few windows this Tatari's next evolution could happen in. */
export function opportunities(t: OwnedTatari, line: Line, windows: EventWindow[], limit = 3): EventWindow[] {
  const step = nextStep(line, t.tier);
  return step ? windows.filter((w) => fitsWindow(step, w.slot)).slice(0, limit) : [];
}

/**
 * Suggests who to evolve in each upcoming window, `goal` per window. Choices the player has made
 * (plannedFor) are kept and count toward the goal. Otherwise each window takes ready Tatari first,
 * favouring ones with the fewest later chances, then the closest to ready.
 */
export function suggestPlan(windows: EventWindow[], owned: OwnedTatari[], lines: Map<string, Line>, goal: number) {
  const now = new Set(windows.map(windowKey));
  const taken = new Set(owned.filter((t) => t.plannedFor && now.has(t.plannedFor)).map((t) => t.uid));
  const plan = new Map<string, string[]>();
  const laterChances = (c: Candidate, after: number) => windows.filter((w) => w.start > after && fitsWindow(c.r.step, w.slot)).length;

  for (const w of windows) {
    const key = windowKey(w);
    const chosen = owned.filter((t) => t.plannedFor === key).map((t) => t.uid);
    const pool = candidatesFor(w, owned, lines)
      .filter((c) => !taken.has(c.tatari.uid))
      .sort((a, b) => Number(b.r.ready) - Number(a.r.ready) || laterChances(a, w.start) - laterChances(b, w.start) || a.r.starsMissing - b.r.starsMissing);
    for (const c of pool) {
      if (chosen.length >= goal) break;
      chosen.push(c.tatari.uid);
      taken.add(c.tatari.uid);
    }
    plan.set(key, chosen);
  }
  return plan;
}

/** Short label for a feeding requirement. Stage 3 is 540 food points in total and needs 2 stars. */
export function feedLabel(task: Extract<Task, { kind: 'feed' }>) {
  return task.grade === 'B' ? 'Feed to B rating' : 'Feed to stage 3 (3 stat upgrades)';
}
