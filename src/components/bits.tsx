import { Checkbox, Chip } from '@heroui/react';
import { Check, Clock, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { ELEMENT_STYLE } from '../data/game';
import type { Element } from '../data/types';

/**
 * Round portrait: the official art when the art pack has it (see src/data/art.ts), otherwise the
 * element colour with the form's initials.
 */
export function TatariAvatar({ name, element, art, size = 'md' }: { name: string; element: Element; art?: string; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'size-7 text-[11px]' : 'size-10 text-sm';
  if (art) {
    return (
      <span aria-hidden className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-linear-to-br ${ELEMENT_STYLE[element].art} ${box}`}>
        <img src={art} alt="" loading="lazy" draggable={false} className="size-[90%] object-contain" />
      </span>
    );
  }
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-semibold ${ELEMENT_STYLE[element].solid} ${box}`}>
      {name.slice(0, 2)}
    </span>
  );
}

export function ElementChip({ element }: { element: Element }) {
  return <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${ELEMENT_STYLE[element].soft}`}>{element}</span>;
}

export function SectionTitle({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-baseline justify-between gap-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
      <span>{children}</span>
      {trailing && <span className="font-normal normal-case tracking-normal">{trailing}</span>}
    </h2>
  );
}

export function StarsChip({ missing }: { missing: number }) {
  return (
    <Chip size="sm" variant="soft" color="warning">
      <Star size={12} />
      <Chip.Label>{missing} more ★</Chip.Label>
    </Chip>
  );
}

export function ReadyChip() {
  return (
    <Chip size="sm" variant="soft" color="success">
      <Check size={12} />
      <Chip.Label>Ready</Chip.Label>
    </Chip>
  );
}

export function NeedsChip({ children }: { children: ReactNode }) {
  return (
    <Chip size="sm" variant="soft" color="warning">
      <Clock size={12} />
      <Chip.Label>{children}</Chip.Label>
    </Chip>
  );
}

export function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Checkbox isSelected={checked} onChange={onChange} variant="secondary" className="min-w-0">
      <Checkbox.Content className="flex w-full min-w-0 cursor-pointer items-start gap-2.5 py-1 text-sm">
        <Checkbox.Control className="mt-0.5">
          <Checkbox.Indicator />
        </Checkbox.Control>
        <span className={checked ? 'text-muted line-through' : ''}>{children}</span>
      </Checkbox.Content>
    </Checkbox>
  );
}
