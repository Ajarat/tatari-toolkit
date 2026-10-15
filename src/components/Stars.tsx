import { Button, Tooltip } from '@heroui/react';
import { Minus, Plus } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { describeStars, MAX_STARS, SLOTS, starLevel, starParts, starSlots, STAR_TYPES, type Finish, type StarType } from '../data/stars';

/** Colours picked from in-game screenshots: bronze reads peach, silver pale ice blue, "blue" crowns lavender. */
const FINISH: Record<Exclude<Finish, 'iridescent'>, string> = {
  bronze: '#f2a46a',
  silver: '#bfe6f7',
  gold: '#f4c542',
  red: '#f05a3c',
  blue: '#9d8cff',
};

function IridescentGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#f9a8d4" />
      <stop offset="0.5" stopColor="#67e8f9" />
      <stop offset="1" stopColor="#c4b5fd" />
    </linearGradient>
  );
}

/** Points for a star polygon centred on (cx, cy). */
const starPoints = (cx: number, cy: number, outer: number, inner: number, n = 5) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / n - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');

const WING = 'M22 14C16 6 8 3 1 6c4 2 6 4 7 7-3 0-5 1-6 3 6 2 13 2 20 1z';
const FEATHER = 'M20 14c-4-5-8-7-13-7 3 2 5 4 6 8z';
const RIBBON = 'M21 18l-6 9 4-1 2 3 4-9z';

/**
 * The top two star types: one emblem around a gem that fills from the bottom, `fill` of 6.
 * Winged (confirmed) has gold wings; Ribbon (a guess for now) has ribbon tails. Twice as wide as tall.
 */
export function Emblem({ kind, fill, height = 20 }: { kind: 'wings' | 'ribbons'; fill: number; height?: number }) {
  const id = useId();
  const gemTop = 22 - (16 * fill) / SLOTS;
  return (
    <svg viewBox="0 0 56 28" width={height * 2} height={height} aria-hidden className="shrink-0">
      <defs>
        <IridescentGradient id={`${id}-gem`} />
        <clipPath id={`${id}-fill`}>
          <rect x="0" y={gemTop} width="56" height="28" />
        </clipPath>
      </defs>
      <g stroke="rgba(0,0,0,0.35)" strokeWidth="0.6">
        {kind === 'wings' ? (
          <>
            <path d={WING} fill="#f4c542" />
            <path d={FEATHER} fill="#67e8f9" />
            <g transform="translate(56 0) scale(-1 1)">
              <path d={WING} fill="#f4c542" />
              <path d={FEATHER} fill="#f472b6" />
            </g>
          </>
        ) : (
          <>
            <path d={RIBBON} fill="#67e8f9" />
            <g transform="translate(56 0) scale(-1 1)">
              <path d={RIBBON} fill="#f472b6" />
            </g>
          </>
        )}
        <polygon points={starPoints(28, 15, 13, 6)} fill={kind === 'wings' ? '#f4c542' : '#d3dae3'} />
      </g>
      <polygon points={starPoints(28, 15.5, 8, 4.2, 6)} fill="#3b2a5a" />
      <polygon points={starPoints(28, 15.5, 8, 4.2, 6)} fill={`url(#${id}-gem)`} clipPath={`url(#${id}-fill)`} />
    </svg>
  );
}

const SHAPES: Record<'star' | 'moon' | 'sun' | 'crown', ReactNode> = {
  star: <polygon points="12,2 15.1,8.6 22,9.3 16.8,14 18.2,21 12,17.3 5.8,21 7.2,14 2,9.3 8.9,8.6" />,
  moon: <path d="M19.5 15.5A8.5 8.5 0 1 1 8.5 4.5a7 7 0 0 0 11 11z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="5" />
      {Array.from({ length: 8 }, (_, i) => (
        <polygon key={i} points="12,0.5 13.6,5 10.4,5" transform={`rotate(${i * 45} 12 12)`} />
      ))}
    </>
  ),
  crown: (
    <>
      <path d="M3 8l4.5 4L12 4l4.5 8L21 8l-1.8 10H4.8zM4.8 19.5h14.4V21H4.8z" />
      <circle cx="12" cy="14" r="2" fill="#e11d48" />
    </>
  ),
};

/** One star-level icon in its finish. `null` draws an empty outline (a slot with no star yet). */
export function StarGlyph({ type, size = 20 }: { type: StarType | null; size?: number }) {
  const gradientId = useId();
  if (!type) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="shrink-0">
        <g fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/50">
          {SHAPES.star}
        </g>
      </svg>
    );
  }
  if (type.icon === 'wings' || type.icon === 'ribbons') return <Emblem kind={type.icon} fill={SLOTS} height={size} />;
  const fill = type.finish === 'iridescent' ? `url(#${gradientId})` : FINISH[type.finish];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="shrink-0">
      {type.finish === 'iridescent' && (
        <defs>
          <IridescentGradient id={gradientId} />
        </defs>
      )}
      <g fill={fill} stroke="rgba(0,0,0,0.35)" strokeWidth="0.6">
        {SHAPES[type.icon]}
      </g>
    </svg>
  );
}

const emblemKind = (t: StarType) => (t.icon === 'wings' ? 'wings' : 'ribbons');

/** The icons as they look in game (six of them, or an emblem at the top), plus the level number. */
export function StarRow({ level, size = 16, showNumber = true }: { level: number; size?: number; showNumber?: boolean }) {
  const { type, count } = starParts(level);
  const t = STAR_TYPES[type];
  return (
    <span className="inline-flex items-center gap-1.5" title={describeStars(level)}>
      {t.emblem ? (
        <Emblem kind={emblemKind(t)} fill={count} height={size + 2} />
      ) : (
        <span className="inline-flex gap-0.5">
          {starSlots(level).map((s, i) => (
            <StarGlyph key={i} type={s} size={size} />
          ))}
        </span>
      )}
      {showNumber && <span className="text-xs tabular-nums text-muted">{level}★</span>}
      <span className="sr-only">{describeStars(level)}</span>
    </span>
  );
}

/**
 * The six icons (or the emblem's gem) as buttons: tapping one sets how many of the newest type are
 * showing. Tapping the only bronze star clears back to none.
 */
export function StarSlotsInput({
  value,
  onChange,
  size,
  min = 0,
  overlap = false,
}: {
  value: number;
  onChange: (level: number) => void;
  size: number;
  min?: number;
  /** Tuck the icons into each other a little, like the in-game cards, to fit narrow spaces. */
  overlap?: boolean;
}) {
  const { type, count } = starParts(value);
  const t = STAR_TYPES[type];

  if (t.emblem) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <Emblem kind={emblemKind(t)} fill={count} height={size * 1.4} />
        <div className="flex gap-1" role="group" aria-label={`${t.name} gem`}>
          {Array.from({ length: SLOTS }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Gem ${i + 1} of ${SLOTS}`}
              aria-pressed={i < count}
              disabled={starLevel(type, i + 1) < min}
              onClick={() => onChange(starLevel(type, i + 1))}
              className={`h-2 rounded-full transition-colors ${i < count ? 'bg-accent' : 'bg-surface-tertiary hover:bg-accent/40'}`}
              style={{ width: size * 0.7 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${overlap ? '-space-x-1' : ''}`} role="group" aria-label={`${t.name}s showing`}>
      {starSlots(value).map((s, i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i + 1} ${t.name}${i ? 's' : ''}`}
          aria-pressed={i < count}
          disabled={starLevel(type, i + 1) < min}
          onClick={() => onChange(type === 0 && count === 1 && i === 0 ? 0 : starLevel(type, i + 1))}
          className="rounded-md p-px transition-transform enabled:hover:scale-110 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent"
        >
          <StarGlyph type={s} size={size} />
        </button>
      ))}
    </div>
  );
}

/**
 * Every tier has a star minimum (you can't start a trial without it), so stars can't go below it.
 * `min` is that floor and `minReason` explains it in the tooltip on the disabled − button.
 */
type StarLimits = { min?: number; minReason?: string };

function LessButton({ value, min = 0, minReason, onPress, size, className }: StarLimits & { value: number; onPress: () => void; size: number; className?: string }) {
  const atFloor = value <= min;
  return (
    <Tooltip delay={150} isDisabled={!atFloor || !minReason}>
      <Tooltip.Trigger className={`shrink-0 ${className ?? ''}`}>
        <Button isIconOnly size="sm" variant="ghost" aria-label="One less star" isDisabled={atFloor} onPress={onPress} className={className}>
          <Minus size={size} />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow className="max-w-56 text-center text-xs">
        <Tooltip.Arrow />
        {minReason}
      </Tooltip.Content>
    </Tooltip>
  );
}

/** Compact star editing for a card: − / the icons (tap one to set it) / +. */
export function StarControl({ value, onChange, min = 0, minReason }: StarLimits & { value: number; onChange: (level: number) => void }) {
  const set = (level: number) => onChange(Math.max(min, Math.min(MAX_STARS, level)));
  return (
    <div className="flex items-center justify-center gap-0.5">
      <LessButton value={value} min={min} minReason={minReason} onPress={() => set(value - 1)} size={14} className="size-6 min-w-6" />
      <StarSlotsInput value={value} onChange={set} size={19} min={min} overlap />
      <Button isIconOnly size="sm" variant="ghost" aria-label="One more star" isDisabled={value >= MAX_STARS} onPress={() => set(value + 1)} className="size-6 min-w-6 shrink-0">
        <Plus size={14} />
      </Button>
    </div>
  );
}

/** Larger star editor for the details drawer: − / the icons as in game / +, with the level spelled out. */
export function StarPicker({ value, onChange, min = 0, minReason }: StarLimits & { value: number; onChange: (level: number) => void }) {
  const set = (level: number) => onChange(Math.max(min, Math.min(MAX_STARS, level)));

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-surface-secondary/60 p-4">
      <div className="flex items-center gap-3">
        <LessButton value={value} min={min} minReason={minReason} onPress={() => set(value - 1)} size={16} />
        <StarSlotsInput value={value} onChange={set} size={34} min={min} />
        <Button isIconOnly size="sm" variant="ghost" aria-label="One more star" isDisabled={value >= MAX_STARS} onPress={() => set(value + 1)}>
          <Plus size={16} />
        </Button>
      </div>
      <p className="text-center text-sm">
        <span className="font-semibold tabular-nums">{value}★</span> <span className="text-muted">· {describeStars(value)}</span>
      </p>
    </div>
  );
}
