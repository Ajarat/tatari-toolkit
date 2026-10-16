import { Button, Chip, Drawer, ToggleButton, ToggleButtonGroup } from '@heroui/react';
import { ArrowUpCircle, Circle, CircleCheck, RotateCcw } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { formName, lines, maxTier } from '../data/game';
import { copiesBetween, describeStars } from '../data/stars';
import { eventName, feedProgress, starFloor, taskLabel } from '../logic/labels';
import { checkKey, feedTaskMet, isPrepTask, opportunities, readiness } from '../logic/plan';
import { DAY, scheduleWindows } from '../logic/schedule';
import { fmtDate, useNow } from '../logic/time';
import { blankTatari, useStore } from '../state/store';
import { useEditTatari } from '../state/useEditTatari';
import { CheckRow, ElementChip, ReadyChip, SectionTitle, StarsChip, TatariAvatar } from './bits';
import { FeedingEditor } from './Feeding';
import { StarPicker } from './Stars';

export function TatariEditor() {
  const [params] = useSearchParams();
  const edit = useEditTatari();
  const lineId = params.get('edit');
  const line = lineId ? lines.get(lineId) : undefined;

  return (
    <Drawer.Backdrop isOpen={!!line} onOpenChange={(open) => !open && edit(null)}>
      <Drawer.Content placement="bottom">
        <Drawer.Dialog className="mx-auto max-h-[92dvh] w-full max-w-3xl">
          <Drawer.Handle />
          <Drawer.CloseTrigger />
          {line && <EditorBody lineId={line.id} />}
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}

function EditorBody({ lineId }: { lineId: string }) {
  const now = useNow();
  const { owned, update, setTier, toggleCheck, evolve, remove, rotation, goldRush } = useStore();
  const line = lines.get(lineId)!;
  const t = owned.find((o) => o.lineId === lineId) ?? blankTatari(lineId);
  const isSetUp = owned.some((o) => o.lineId === lineId);
  const name = formName(line, t.tier);
  const r = readiness(t, line);
  const next = r ? opportunities(t, line, scheduleWindows({ rotation, goldRush }, now, now + 45 * DAY)) : [];
  const usesGoldRush = r?.step.tasks.some((x) => x.kind === 'event' && x.options.some((o) => o.slot === 'gold_rush'));

  return (
    <>
      <Drawer.Header className="flex flex-row items-center gap-3">
        <TatariAvatar name={name} element={line.element} />
        <div className="min-w-0">
          <Drawer.Heading className="truncate">{name}</Drawer.Heading>
          <p className="flex items-center gap-2 text-sm text-muted">
            <ElementChip element={line.element} /> {line.forms.length === 2 ? 'Blue · 2 tiers' : `${line.forms.length} tiers`}
          </p>
        </div>
      </Drawer.Header>
      <Drawer.Body className="flex flex-col gap-6 pb-8">
        <section>
          <SectionTitle>Current form</SectionTitle>
          <ToggleButtonGroup
            aria-label="Current form"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[String(t.tier)]}
            onSelectionChange={(keys) => setTier(lineId, Number([...keys][0] ?? 1))}
            size="sm"
            className="flex-wrap"
          >
            {line.forms.map((f, i) => (
              <ToggleButton key={f} id={String(i + 1)}>
                {i > 0 && <ToggleButtonGroup.Separator />}
                <span className="text-muted">T{i + 1}</span> {f}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </section>

        <section>
          <SectionTitle>Stars</SectionTitle>
          <StarPicker value={t.stars} onChange={(stars) => update(lineId, { stars })} {...starFloor(line, t, name)} />
        </section>

        <section>
          <SectionTitle>Feeding</SectionTitle>
          <FeedingEditor line={line} t={t} onChange={(patch) => update(lineId, patch)} />
        </section>

        {r ? (
          <section className="flex flex-col gap-3">
            <SectionTitle>
              Next: {r.step.to} (T{r.step.toTier})
            </SectionTitle>
            {r.unknown && (
              <p className="text-sm text-muted">
                {r.step.to} is in the game, but its star requirement and trial haven't been found yet. If you know them, they can be added.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              {r.ready ? <ReadyChip /> : r.starsMissing > 0 && <StarsChip missing={r.starsMissing} />}
              {!r.unknown && r.step.confidence !== 'Verified' && (
                <Chip size="sm" variant="soft">
                  <Chip.Label>Trial data: {r.step.confidence.toLowerCase() || 'unverified'}</Chip.Label>
                </Chip>
              )}
            </div>
            {r.step.stars != null && (
              <p className="text-sm text-muted">
                Needs {r.step.stars}★ ({describeStars(r.step.stars)}).
                {r.starsMissing > 0 && ` That's about ${copiesBetween(t.stars, r.step.stars).toLocaleString()} more copies.`}
              </p>
            )}
            <div className="flex flex-col">
              {r.step.tasks.map((task, i) =>
                task.kind === 'feed' ? (
                  <p key={i} className="flex items-start gap-2.5 py-1 text-sm">
                    {feedTaskMet(t, task) ? <CircleCheck size={16} className="mt-0.5 shrink-0 text-success" /> : <Circle size={16} className="mt-0.5 shrink-0 text-muted" />}
                    <span>
                      {taskLabel(task)} <span className="text-muted">· {feedProgress(t, task)}</span>
                    </span>
                  </p>
                ) : isPrepTask(task) ? (
                  <CheckRow key={i} checked={!!t.checks[checkKey(r.step, i)]} onChange={(v) => toggleCheck(lineId, checkKey(r.step, i), v)}>
                    {taskLabel(task)}
                  </CheckRow>
                ) : (
                  <p key={i} className="py-1 pl-7.5 text-sm text-muted">
                    In trial: {taskLabel(task)}
                  </p>
                ),
              )}
            </div>
            {!r.unknown && (
              <p className="text-sm text-muted">
                {next.length
                  ? `Next chances: ${next.map((w) => `${eventName(w.slot)} ${fmtDate(w.start)}`).join(' · ')}`
                  : usesGoldRush
                    ? 'Needs Gold Rush. Set its schedule in Settings to see dates.'
                    : 'Can be done any time.'}
              </p>
            )}
          </section>
        ) : (
          <p className="text-sm text-muted">Fully evolved.</p>
        )}

        <div className="flex flex-wrap gap-2">
          {t.tier < maxTier(line) && (
            <Button size="sm" variant="secondary" onPress={() => evolve(lineId)}>
              <ArrowUpCircle size={14} /> Evolved to {formName(line, t.tier + 1)}
            </Button>
          )}
          {isSetUp && (
            <Button size="sm" variant="ghost" className="text-muted" onPress={() => remove(lineId)}>
              <RotateCcw size={14} /> Clear
            </Button>
          )}
        </div>
      </Drawer.Body>
    </>
  );
}
