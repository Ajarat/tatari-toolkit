import { Card, Label, SearchField } from '@heroui/react';
import { useMemo, useState } from 'react';
import { ElementChip, TatariAvatar } from '../components/bits';
import { ElementFilter } from '../components/ElementFilter';
import { taskLabel } from '../logic/labels';
import { game } from '../data/game';
import type { Element } from '../data/types';

/** Every evolution line with its star gates and trials, as listed on TataDex. */
export default function Evolutions() {
  const [q, setQ] = useState('');
  const [element, setElement] = useState<Element | 'all'>('all');
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return game.lines.filter(
      (l) => (element === 'all' || l.element === element) && (!needle || l.forms.some((f) => f.toLowerCase().includes(needle))),
    );
  }, [q, element]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Evolution trials</h1>
        <p className="text-sm text-muted">
          {game.lines.length} lines. Blue Tatari evolve twice (T2), purple ones up to T4.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <SearchField aria-label="Search lines" value={q} onChange={setQ}>
          <Label className="sr-only">Search</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search any form" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <ElementFilter value={element} onChange={setElement} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {list.length === 0 && <p className="py-6 text-center text-sm text-muted">No lines match.</p>}
        {list.map((l) => (
          <Card key={l.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              <TatariAvatar name={l.forms[0]} element={l.element} />
              <div className="min-w-0">
                <p className="font-medium">{l.forms.join(' → ')}</p>
                <p className="flex items-center gap-2 text-sm text-muted">
                  <ElementChip element={l.element} /> {l.forms.length} tiers
                  {l.incomplete && <span className="text-warning">· source is missing a stage</span>}
                </p>
              </div>
            </div>
            <ol className="flex flex-col gap-3">
              {l.steps.map((s) => (
                <li key={s.toTier} className="rounded-lg bg-surface-secondary/60 p-3 text-sm">
                  <p className="font-medium">
                    T{s.toTier}: {s.to} <span className="font-normal text-muted">· {s.starsText}{s.stars ? ` (${s.stars}★)` : ''} · {s.confidence}</span>
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-muted">
                    {s.tasks.map((t, i) => (
                      <li key={i}>{taskLabel(t)}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </div>
  );
}
