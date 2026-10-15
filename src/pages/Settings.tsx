import { Button, Card, Label, ListBox, NumberField, Select } from '@heroui/react';
import { RotateCcw } from 'lucide-react';
import { CloudSave } from '../components/CloudSave';
import { SectionTitle } from '../components/bits';
import { DEFAULT_GOLD_RUSH, DEFAULT_ROTATION, EVENTS } from '../data/events';
import { game } from '../data/game';
import type { RotatingSlot } from '../data/types';
import { anchorFromCurrent, DAY, goldRushWindows, rotationWindows } from '../logic/schedule';
import { fmtDateTime, resets, useNow } from '../logic/time';
import { useStore } from '../state/store';

export default function Settings() {
  const now = useNow();
  const { rotation, goldRush, goal, setSchedule, reset } = useStore();
  const current = rotationWindows(rotation, now, now + 1)[0];
  const endOptions = resets(now, rotation.daysEach);
  const goldRushNow = goldRushWindows(goldRush, now, now + 8 * DAY)[0];
  // Gold Rush start choices: any reset from six days ago to a week ahead.
  const goldRushOptions = resets(now, 14, -7);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section>
        <SectionTitle>Event rotation</SectionTitle>
        <Card className="flex flex-col gap-4 p-4">
          <p className="text-sm text-muted">
            Events rotate {rotation.order.map((s) => EVENTS[s].name).join(' → ')}, {rotation.daysEach} days each, changing at the daily reset. Servers can be on
            different rotations, so set this from what you see in game.
          </p>
          <div className="flex flex-wrap gap-3">
            <Select
              selectedKey={current.slot}
              onSelectionChange={(k) => k && setSchedule({ rotation: anchorFromCurrent(rotation, k as RotatingSlot, current.end) })}
              className="min-w-48 flex-1"
            >
              <Label>Event on right now</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {rotation.order.map((s) => (
                    <ListBox.Item key={s} id={s} textValue={EVENTS[s].name}>
                      {EVENTS[s].name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              selectedKey={String(current.end)}
              onSelectionChange={(k) => k && setSchedule({ rotation: anchorFromCurrent(rotation, current.slot as RotatingSlot, Number(k)) })}
              className="min-w-48 flex-1"
            >
              <Label>It ends</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {endOptions.map((t) => (
                    <ListBox.Item key={t} id={String(t)} textValue={fmtDateTime(t)}>
                      {fmtDateTime(t)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          <Button size="sm" variant="ghost" className="w-fit text-muted" onPress={() => setSchedule({ rotation: DEFAULT_ROTATION })}>
            <RotateCcw size={14} /> Use the default schedule
          </Button>
        </Card>
      </section>

      <section>
        <SectionTitle>Gold Rush</SectionTitle>
        <Card className="flex flex-col gap-4 p-4">
          <p className="text-sm text-muted">
            Rounds last {goldRush.roundDays} days with {goldRush.gapDays} day off between them, alongside the other events.
            {goldRushNow && ` ${goldRushNow.start <= now ? 'Current' : 'Next'} round: ${fmtDateTime(goldRushNow.start)} – ${fmtDateTime(goldRushNow.end)}.`}
          </p>
          <Select
            selectedKey={goldRush.anchor ? String(Date.parse(goldRush.anchor)) : 'none'}
            onSelectionChange={(k) =>
              setSchedule({ goldRush: { ...goldRush, anchor: !k || k === 'none' ? null : new Date(Number(k)).toISOString() } })
            }
            className="max-w-sm"
          >
            <Label>A round starts (or started)</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="none" textValue="Not set">
                  Not set
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {/* Keep a saved start selectable even when it's outside the two-week list. */}
                {[...new Set([...(goldRush.anchor ? [Date.parse(goldRush.anchor)] : []), ...goldRushOptions])].map((t) => (
                  <ListBox.Item key={t} id={String(t)} textValue={fmtDateTime(t)}>
                    {fmtDateTime(t)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          {goldRush.anchor !== DEFAULT_GOLD_RUSH.anchor && (
            <Button size="sm" variant="ghost" className="w-fit text-muted" onPress={() => setSchedule({ goldRush: DEFAULT_GOLD_RUSH })}>
              <RotateCcw size={14} /> Use the default schedule
            </Button>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Planning</SectionTitle>
        <Card className="flex flex-col gap-3 p-4">
          <NumberField value={goal} minValue={1} maxValue={6} onChange={(v) => Number.isFinite(v) && setSchedule({ goal: v })} variant="secondary" className="w-40">
            <Label>Evolutions per event</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input className="min-w-8 px-1 text-center tabular-nums" />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>
          <p className="text-sm text-muted">Most players manage about 2 T3s per event. Suggestions fill up to this many.</p>
        </Card>
      </section>

      <section>
        <SectionTitle>Account</SectionTitle>
        <CloudSave />
      </section>

      <section>
        <SectionTitle>Data</SectionTitle>
        <Card className="flex flex-col items-start gap-3 p-4 text-sm text-muted">
          <p>
            Trial requirements from{' '}
            <a href={game.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
              {game.source.name}
            </a>{' '}
            (fetched {game.source.fetchedAt}). Some steps are community-reported rather than verified.
          </p>
          <Button
            size="sm"
            variant="danger-soft"
            onPress={() => {
              if (confirm('Remove all your Tatari and reset the schedule on this device?')) reset();
            }}
          >
            Reset everything
          </Button>
        </Card>
      </section>
    </div>
  );
}
