import art from './art.json';
import type { Element } from './types';

/**
 * Official art from the Clash of Critters creator art pack, imported by `npm run fetch:art` into
 * public/art. Lookups return undefined when a picture isn't in the pack, so callers fall back to the
 * drawn placeholder.
 */
const manifest = art as { tatari: Record<string, string>; stars: Record<string, string>; elements: Record<string, string> };
const url = (rel?: string) => (rel ? `${import.meta.env.BASE_URL}${rel}` : undefined);

/** Picture of a line's form at a tier. */
export const tatariArt = (lineId: string, tier: number) => url(manifest.tatari[`${lineId}-${tier}`]);

/** Star level icon by name, e.g. "moon-gold" or "emblem-iridescent". */
export const starArt = (name: string) => url(manifest.stars[name]);

export const elementArt = (element: Element) => url(manifest.elements[element]);
