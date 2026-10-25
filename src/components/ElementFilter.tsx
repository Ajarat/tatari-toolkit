import { elementArt } from '../data/art';
import { ELEMENTS, ELEMENT_STYLE } from '../data/game';
import type { Element } from '../data/types';
import { ELEMENT_ICON } from './elementIcons';

/** Round element badge, like the type icon on in-game cards: the official icon when we have it. */
export function ElementIcon({ element, size = 'md' }: { element: Element; size?: 'sm' | 'md' }) {
  const Icon = ELEMENT_ICON[element];
  const src = elementArt(element);
  if (src) return <img src={src} alt={element} draggable={false} className={`shrink-0 drop-shadow ${size === 'sm' ? 'size-5' : 'size-7'}`} />;
  return (
    <span className={`grid shrink-0 place-items-center rounded-full ring-2 ring-white/80 ${ELEMENT_STYLE[element].solid} ${size === 'sm' ? 'size-5' : 'size-7'}`}>
      <Icon className={size === 'sm' ? 'size-3' : 'size-4'} strokeWidth={2.5} aria-hidden />
      <span className="sr-only">{element}</span>
    </span>
  );
}

/** Element filter as a row of coloured icon buttons. Tap the selected one again to show all. */
export function ElementFilter({ value, onChange }: { value: Element | 'all'; onChange: (v: Element | 'all') => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by element">
      {ELEMENTS.map((e) => {
        const Icon = ELEMENT_ICON[e];
        const on = value === e;
        return (
          <button
            key={e}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? 'all' : e)}
            className={`flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-sm transition-all ${
              on ? `${ELEMENT_STYLE[e].solid} shadow-md` : value === 'all' ? 'bg-surface text-foreground hover:bg-surface-secondary' : 'bg-surface text-muted opacity-60 hover:opacity-100'
            }`}
          >
            {elementArt(e) ? (
              <img src={elementArt(e)} alt="" draggable={false} className="size-6 shrink-0" />
            ) : (
              <span className={`grid size-6 place-items-center rounded-full ${on ? 'bg-black/15' : ELEMENT_STYLE[e].solid}`}>
                <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
              </span>
            )}
            {e}
          </button>
        );
      })}
    </div>
  );
}
