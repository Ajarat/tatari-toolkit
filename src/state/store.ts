/**
 * Everything the player enters lives here and is saved in the browser (localStorage). Cloud sync
 * (src/sync) copies the same `Save` to Supabase when signed in.
 */
import { z } from 'zod';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_GOLD_RUSH, DEFAULT_ROTATION } from '../data/events';
import { GRADES, starsForFeedStage } from '../data/feeding';
import { lines } from '../data/game';
import { feedStage, minStarsForTier, type OwnedTatari } from '../logic/plan';

const Slot = z.enum(['zobo_shooter', 'cozy_farm', 'fishing', 'treasure_hunt', 'marathon']);

export const Save = z.object({
  version: z.literal(1),
  updatedAt: z.string(),
  owned: z.array(
    z.object({
      uid: z.string(),
      lineId: z.string(),
      tier: z.number().int().min(1).max(4),
      stars: z.number().int().min(0),
      checks: z.record(z.string(), z.boolean()),
      grades: z.object({ atk: z.enum(GRADES), hp: z.enum(GRADES), def: z.enum(GRADES) }).optional(),
      plannedFor: z.string().optional(),
      note: z.string().optional(),
    }),
  ),
  rotation: z.object({
    order: z.array(Slot),
    daysEach: z.number().positive(),
    anchor: z.object({ slot: Slot, startsAt: z.string() }),
  }),
  goldRush: z.object({ roundDays: z.number().positive(), gapDays: z.number().min(0), anchor: z.string().nullable() }),
  /** How many evolutions the player aims for per event. */
  goal: z.number().int().min(1).max(6),
});
export type Save = z.infer<typeof Save>;

const fresh = (): Save => ({
  version: 1,
  updatedAt: new Date(0).toISOString(),
  owned: [],
  rotation: DEFAULT_ROTATION,
  goldRush: DEFAULT_GOLD_RUSH,
  goal: 2,
});

/**
 * Every player has every Tatari (they're easy to get early on), so there's one record per line,
 * created the first time the player sets its form or stars. `uid` is the line id.
 */
type Actions = {
  update: (lineId: string, patch: Partial<Omit<OwnedTatari, 'uid' | 'lineId' | 'tier'>>) => void;
  /** Sets the current form, raising stars to that tier's minimum if needed. Clears any plan. */
  setTier: (lineId: string, tier: number) => void;
  toggleCheck: (lineId: string, key: string, value: boolean) => void;
  /** Moves to the next tier (like setTier); prerequisites for the new tier start unticked. */
  evolve: (lineId: string) => void;
  /** Forgets what the player entered for this line (back to T1, no stars, off the calendar). */
  remove: (lineId: string) => void;
  setSchedule: (patch: Partial<Pick<Save, 'rotation' | 'goldRush' | 'goal'>>) => void;
  replace: (save: Save) => void;
  reset: () => void;
};

const stamp = () => ({ updatedAt: new Date().toISOString() });
export const blankTatari = (lineId: string): OwnedTatari => ({ uid: lineId, lineId, tier: 1, stars: 0, checks: {} });

/** Stars can't be below what the current tier, or the current feeding stage, needed. */
function atLeastTierMinimum(t: OwnedTatari): OwnedTatari {
  const line = lines.get(t.lineId);
  const min = Math.max(line ? minStarsForTier(line, t.tier) : 0, starsForFeedStage(feedStage(t)));
  return { ...t, stars: Math.max(t.stars, min) };
}

const atTier = (t: OwnedTatari, tier: number): OwnedTatari => atLeastTierMinimum({ ...t, tier, plannedFor: undefined });

/** Applies `f` to the line's record, creating it first if the player hasn't touched this line yet. */
function withOwned(s: Save, lineId: string, f: (t: OwnedTatari) => OwnedTatari) {
  const exists = s.owned.some((t) => t.lineId === lineId);
  const owned = exists ? s.owned.map((t) => (t.lineId === lineId ? f(t) : t)) : [...s.owned, f(blankTatari(lineId))];
  return { owned, ...stamp() };
}

export const useStore = create<Save & Actions>()(
  persist(
    (set) => ({
      ...fresh(),
      update: (lineId, patch) => set((s) => withOwned(s, lineId, (t) => atLeastTierMinimum({ ...t, ...patch }))),
      toggleCheck: (lineId, key, value) => set((s) => withOwned(s, lineId, (t) => ({ ...t, checks: { ...t.checks, [key]: value } }))),
      setTier: (lineId, tier) => set((s) => withOwned(s, lineId, (t) => atTier(t, tier))),
      evolve: (lineId) => set((s) => withOwned(s, lineId, (t) => atTier(t, t.tier + 1))),
      remove: (lineId) => set((s) => ({ owned: s.owned.filter((t) => t.lineId !== lineId), ...stamp() })),
      setSchedule: (patch) => set(() => ({ ...patch, ...stamp() })),
      replace: (save) => set(() => save),
      reset: () => set(() => ({ ...fresh(), ...stamp() })),
    }),
    {
      name: 'tatari-toolkit',
      version: 2,
      // v1 allowed several records per line and used the wrong default schedule; start fresh.
      migrate: () => fresh(),
    },
  ),
);

/** The saveable part of the store. */
export function currentSave(): Save {
  const { version, updatedAt, owned, rotation, goldRush, goal } = useStore.getState();
  return { version, updatedAt, owned, rotation, goldRush, goal };
}
