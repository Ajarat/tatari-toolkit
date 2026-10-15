import raw from './lines.json';
import type { Element, GameData, Line } from './types';

export const game = raw as GameData;
export const lines = new Map<string, Line>(game.lines.map((l) => [l.id, l]));

export const formName = (line: Line, tier: number) => line.forms[tier - 1] ?? line.forms.at(-1)!;
export const maxTier = (line: Line) => line.forms.length;

/** Every form of every line, for searching ("Frostpaw" → frostnip line, tier 2). */
export const allForms = game.lines
  .flatMap((line) => line.forms.map((name, i) => ({ name, line, tier: i + 1 })))
  .sort((a, b) => a.name.localeCompare(b.name));

export const ELEMENTS: Element[] = ['Water', 'Fire', 'Grass', 'Rock', 'Lightning'];

/** Tailwind classes per element: a solid swatch, a soft tint for chips, and a gradient for card art. */
export const ELEMENT_STYLE: Record<Element, { solid: string; soft: string; art: string }> = {
  Water: { solid: 'bg-sky-500 text-white', soft: 'bg-sky-500/15 text-sky-300', art: 'from-sky-400 to-blue-700' },
  Fire: { solid: 'bg-orange-500 text-white', soft: 'bg-orange-500/15 text-orange-300', art: 'from-orange-400 to-red-700' },
  Grass: { solid: 'bg-emerald-500 text-white', soft: 'bg-emerald-500/15 text-emerald-300', art: 'from-lime-400 to-emerald-700' },
  Rock: { solid: 'bg-amber-700 text-white', soft: 'bg-amber-700/20 text-amber-300', art: 'from-amber-500 to-stone-700' },
  Lightning: { solid: 'bg-yellow-400 text-yellow-950', soft: 'bg-yellow-400/15 text-yellow-200', art: 'from-yellow-300 to-amber-600' },
};
