import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_GOLD_RUSH, DEFAULT_ROTATION } from '../data/events';
import data from '../data/lines.json' with { type: 'json' };
import { copiesBetween, describeStars, starLevel, starParts } from '../data/stars';
import type { GameData, Line } from '../data/types';
import { candidatesFor, checkKey, minStarsForTier, nextStep, readiness, stepSlots, suggestPlan, type OwnedTatari } from './plan';
import { anchorFromCurrent, goldRushWindows, rotationWindows, windowKey } from './schedule';

const lines = new Map((data as GameData).lines.map((l) => [l.id, l as Line]));
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

test('rotation matches the known October 2026 schedule', () => {
  const ws = rotationWindows(DEFAULT_ROTATION, Date.parse('2026-10-17T00:00:00Z'), Date.parse('2026-11-01T00:00:00Z'));
  assert.deepEqual(
    ws.map((w) => `${w.slot} ${iso(w.start)}`),
    // In-game dates are UTC dates; each starts at 8pm US Eastern the evening before.
    ['zobo_shooter 2026-10-15', 'cozy_farm 2026-10-18', 'fishing 2026-10-21', 'treasure_hunt 2026-10-24', 'marathon 2026-10-27', 'zobo_shooter 2026-10-30'],
  );
});

test('rotation works before the anchor too', () => {
  const ws = rotationWindows(DEFAULT_ROTATION, Date.parse('2026-10-01T00:00:00Z'), Date.parse('2026-10-05T00:00:00Z'));
  // Cozy Farm on 3 Oct is one full cycle (15 days) before 18 Oct; Zobo Shooter runs before it.
  assert.deepEqual(ws.map((w) => `${w.slot} ${iso(w.start)}`), ['zobo_shooter 2026-09-30', 'cozy_farm 2026-10-03']);
});

test('re-anchoring from the current event reproduces the same schedule', () => {
  const cfg = anchorFromCurrent(DEFAULT_ROTATION, 'zobo_shooter', Date.parse('2026-10-18T00:00:00Z'));
  const a = rotationWindows(cfg, Date.parse('2026-10-20T00:00:00Z'), Date.parse('2026-11-20T00:00:00Z'));
  const b = rotationWindows(DEFAULT_ROTATION, Date.parse('2026-10-20T00:00:00Z'), Date.parse('2026-11-20T00:00:00Z'));
  assert.deepEqual(a, b);
});

test('gold rush is empty until anchored, then six on one off', () => {
  assert.equal(goldRushWindows({ ...DEFAULT_GOLD_RUSH, anchor: null }, 0, Date.now()).length, 0);
  const now = goldRushWindows(DEFAULT_GOLD_RUSH, Date.parse('2026-10-16T00:00:00Z'), Date.parse('2026-10-30T00:00:00Z'));
  assert.deepEqual(now.map((w) => `${iso(w.start)}→${iso(w.end)}`), ['2026-10-15→2026-10-21', '2026-10-22→2026-10-28', '2026-10-29→2026-11-04']);
  const ws = goldRushWindows({ ...DEFAULT_GOLD_RUSH, anchor: '2026-10-05T00:00:00Z' }, Date.parse('2026-10-10T00:00:00Z'), Date.parse('2026-10-25T00:00:00Z'));
  assert.deepEqual(ws.map((w) => `${iso(w.start)}→${iso(w.end)}`), ['2026-10-05→2026-10-11', '2026-10-12→2026-10-18', '2026-10-19→2026-10-25']);
});

test('step slots: Water T3 is fishing or raft race, Grass is any time', () => {
  assert.deepEqual(stepSlots(nextStep(lines.get('droppit')!, 2)!), [['fishing', 'marathon']]);
  assert.equal(stepSlots(nextStep(lines.get('buddi')!, 2)!), null);
});

const owned = (lineId: string, tier: number, stars: number, checks: Record<string, boolean> = {}): OwnedTatari => ({ uid: lineId, lineId, tier, stars, checks });

test('readiness tracks stars and prep tasks', () => {
  const line = lines.get('droppit')!;
  const step = nextStep(line, 2)!;
  const feedIndex = step.tasks.findIndex((t) => t.kind === 'feed');
  assert.equal(readiness(owned('droppit', 2, 10), line)!.starsMissing, (step.stars ?? 0) - 10);
  const r = readiness(owned('droppit', 2, 40, { [checkKey(step, feedIndex)]: true }), line)!;
  assert.equal(r.ready, true);
});

test('candidates and suggestions favour ready Tatari, two per event', () => {
  const fishing = { slot: 'fishing' as const, start: Date.parse('2026-10-22T00:00:00Z'), end: Date.parse('2026-10-25T00:00:00Z') };
  const feed = (id: string) => {
    const step = nextStep(lines.get(id)!, 2)!;
    return { [checkKey(step, step.tasks.findIndex((t) => t.kind === 'feed'))]: true };
  };
  const team = [owned('droppit', 2, 5), owned('cribbler', 2, 40, feed('cribbler')), owned('glowfly', 2, 40, feed('glowfly')), owned('buddi', 2, 40)];
  assert.deepEqual(candidatesFor(fishing, team, lines).map((c) => c.tatari.uid), ['cribbler', 'glowfly', 'droppit']);
  assert.deepEqual(suggestPlan([fishing], team, lines, 2).get(windowKey(fishing)), ['cribbler', 'glowfly']);
});

test('star levels: 4 silver moons + 2 gold stars is 22', () => {
  assert.equal(starLevel(3, 4), 22);
  assert.deepEqual(starParts(22), { type: 3, count: 4 });
  assert.equal(describeStars(22), '4 Silver Moons + 2 Gold Stars');
  assert.equal(describeStars(18), '6 Gold Stars');
  assert.deepEqual(starParts(0), { type: 0, count: 0 });
});

test('copy costs match the known cumulative totals', () => {
  const totals: [number, number][] = [[3, 6], [6, 19], [12, 49], [18, 91], [36, 229], [78, 751], [84, 889]];
  for (const [stars, copies] of totals) assert.equal(copiesBetween(0, stars), copies, `${stars}★`);
});

test('minimum stars for a tier come from that line\'s star gates', () => {
  const line = lines.get('manteeny')!; // T2 needs 6★, T3 18★, T4 36★
  assert.deepEqual([1, 2, 3, 4].map((t) => minStarsForTier(line, t)), [0, 6, 18, 36]);
});
