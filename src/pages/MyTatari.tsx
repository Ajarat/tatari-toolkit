import { Button, Card, Label, SearchField, ToggleButton, ToggleButtonGroup } from '@heroui/react';
import { SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ReadyChip, StarsChip } from '../components/bits';
import { ElementFilter, ElementIcon } from '../components/ElementFilter';
import { FeedingControl } from '../components/Feeding';
import { StarControl } from '../components/Stars';
import { tatariArt } from '../data/art';
import { GRADE_STYLE } from '../data/feeding';
import { ELEMENT_STYLE, formName, game } from '../data/game';
import type { Element, Line } from '../data/types';
import { starFloor } from '../logic/labels';
import { rating, readiness, type OwnedTatari } from '../logic/plan';
import { blankTatari, useStore } from '../state/store';
import { useEditTatari } from '../state/useEditTatari';

/**
 * Every Tatari line (everyone has them all) as cards, like the in-game collection. Form and stars
 * can be set right on the card; the details drawer has the trial checklist.
 */
export default function MyTatari() {
  const owned = useStore((s) => s.owned);
  const [q, setQ] = useState('');
  const [element, setElement] = useState<Element | 'all'>('all');
  const [show, setShow] = useState<'all' | 'setup'>('all');
  const byLine = useMemo(() => new Map(owned.map((t) => [t.lineId, t])), [owned]);

  // Alphabetical by first form so cards don't jump around while you edit them.
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return game.lines
      .filter((l) => (element === 'all' || l.element === element) && (!needle || l.forms.some((f) => f.toLowerCase().includes(needle))))
      .filter((l) => show === 'all' || byLine.has(l.id))
      .sort((a, b) => a.forms[0].localeCompare(b.forms[0]));
  }, [q, element, show, byLine]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold">My Tatari</h1>
        <p className="text-sm text-muted">Set each one's form and stars as they are in game. The calendar plans around the ones you've set up.</p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField aria-label="Search Tatari" value={q} onChange={setQ} className="min-w-48 flex-1">
            <Label className="sr-only">Search</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search any form" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ToggleButtonGroup
            aria-label="Show"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[show]}
            onSelectionChange={(keys) => setShow(([...keys][0] ?? 'all') as 'all' | 'setup')}
            size="sm"
          >
            <ToggleButton id="all">All {game.lines.length}</ToggleButton>
            <ToggleButton id="setup">
              <ToggleButtonGroup.Separator />
              Set up {owned.length}
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
        <ElementFilter value={element} onChange={setElement} />
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{show === 'setup' && !owned.length ? "You haven't set up any Tatari yet." : 'No Tatari match.'}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((l) => (
            <TatariCard key={l.id} line={l} t={byLine.get(l.id) ?? blankTatari(l.id)} isSetUp={byLine.has(l.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TatariCard({ line, t, isSetUp }: { line: Line; t: OwnedTatari; isSetUp: boolean }) {
  const update = useStore((s) => s.update);
  const setTier = useStore((s) => s.setTier);
  const edit = useEditTatari();
  const r = readiness(t, line);
  const name = formName(line, t.tier);
  const grade = rating(t);
  const art = tatariArt(line.id, t.tier);

  return (
    <Card className={`flex flex-col gap-0 overflow-hidden p-0 ${isSetUp ? '' : 'opacity-80 hover:opacity-100'}`}>
      {/* Art area: the official picture on the element's colours, or initials when the pack has none. */}
      <button
        type="button"
        onClick={() => edit(line.id)}
        aria-label={`${name} details`}
        className={`relative grid aspect-[4/3] place-items-center bg-linear-to-br ${ELEMENT_STYLE[line.element].art}`}
      >
        {art ? (
          <img src={art} alt="" loading="lazy" draggable={false} className="absolute inset-0 size-full object-contain p-3 drop-shadow-lg" />
        ) : (
          <span className="text-4xl font-black tracking-tight text-white/90 drop-shadow-md">{name.slice(0, 2)}</span>
        )}
        <span className="absolute top-2 left-2">
          <ElementIcon element={line.element} />
        </span>
        {grade && (
          <span className={`absolute bottom-2 left-2 grid size-7 place-items-center rounded-md text-sm font-black shadow ${GRADE_STYLE[grade]}`} aria-label={`Rating ${grade}`}>
            {grade}
          </span>
        )}
        <span className="absolute top-2 right-2 rounded-md bg-black/45 px-1.5 py-0.5 text-xs font-bold text-white">T{t.tier}</span>
      </button>

      <div className="flex flex-1 flex-col gap-2.5 p-2.5">
        <div className="min-w-0 text-center">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-xs text-muted">{r ? `→ ${r.step.to}` : 'Fully evolved'}</p>
        </div>

        <div className="flex justify-center gap-1" role="group" aria-label="Current form">
          {line.forms.map((f, i) => (
            <button
              key={f}
              type="button"
              title={f}
              aria-pressed={t.tier === i + 1}
              onClick={() => setTier(line.id, i + 1)}
              className={`rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${
                t.tier === i + 1 ? 'bg-accent text-accent-foreground' : 'bg-surface-secondary text-muted hover:text-foreground'
              }`}
            >
              T{i + 1}
            </button>
          ))}
        </div>

        <StarControl value={t.stars} onChange={(stars) => update(line.id, { stars })} {...starFloor(line, t, name)} />

        <FeedingControl line={line} t={t} onChange={(patch) => update(line.id, patch)} />

        <div className="mt-auto flex min-h-6 flex-wrap items-center justify-center gap-1.5">
          {r && (r.unknown ? <span className="text-xs text-muted">Trial not known yet</span> : r.ready ? <ReadyChip /> : r.starsMissing > 0 ? <StarsChip missing={r.starsMissing} /> : null)}
          <span className="text-xs tabular-nums text-muted">{t.stars}★</span>
        </div>

        <Button size="sm" variant="ghost" className="w-full text-muted" onPress={() => edit(line.id)}>
          <SlidersHorizontal size={14} /> Trial details
        </Button>
      </div>
    </Card>
  );
}
