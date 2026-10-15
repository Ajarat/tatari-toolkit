import { Droplet, Flame, Leaf, Mountain, Zap, type LucideIcon } from 'lucide-react';
import type { Element } from '../data/types';

/** Stand-ins for the game's element badges: water drop, flame, leaf, mountain, bolt. */
export const ELEMENT_ICON: Record<Element, LucideIcon> = { Water: Droplet, Fire: Flame, Grass: Leaf, Rock: Mountain, Lightning: Zap };
