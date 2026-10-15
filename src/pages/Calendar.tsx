import { Button, Card, Chip } from '@heroui/react';
import { CalendarPlus, PawPrint, Pin, PinOff, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { CheckRow, NeedsChip, ReadyChip, SectionTitle, StarsChip, TatariAvatar } from '../components/bits';
import { eventName, optionLabel } from '../logic/labels';
import { StarRow } from '../components/Stars';
import { useEditTatari } from '../state/useEditTatari';
import { EVENTS } from '../data/events';
import { formName, lines } from '../data/game';
import { anytimeCandidates, candidatesFor, checkKey, feedLabel, suggestPlan, type Candidate } from '../logic/plan';
import { DAY, scheduleWindows, windowKey, type EventWindow } from '../logic/schedule';
import { fmtDateTime, fmtDuration, useNow } from '../logic/time';
import { useStore } from '../state/store';

const HORIZON_DAYS = 30;
const SHOW_FIRST = 5;

export default function Calendar() {
  const now = useNow();
  const { owned, rotation, goldRush, goal } = useStore();
  const windows = useMemo(() => scheduleWindows({ rotation, goldRush }, now, now + HORIZON_DAYS * DAY), [now, rotation, goldRush]);
  const suggested = useMemo(() => suggestPlan(windows, owned, lines, goal), [windows, owned, goal]);
  const anytime = anytimeCandidates(owned, lines);
  const live = windows.filter((w) => w.start <= now);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Evolution calendar</h1>
        <p className="text-sm text-muted">
          {live.length ? (
            <>Live now: {live.map((w) => `${EVENTS[w.slot].name} (ends in ${fmtDuration(w.end - now)})`).join(' · ')}. </>
          ) : null}
          Tatari only earn trial credit for event spending while they're in trial, so have them fed and starred before their event starts.
        </p>
      </header>

      {owned.length === 0 && (
        <Card className="flex flex-col items-start gap-3 p-5">
          <p className="font-medium">Set up your Tatari to see who to evolve in each event.</p>
          <p className="text-sm text-muted">
            For the ones you're working on, set their current form and stars. The calendar works out which events each can evolve in and what it still needs.
          </p>
          <Link to="/tatari">
            <Button>
              <PawPrint size={16} /> Set up Tatari
            </Button>
          </Link>
        </Card>
      )}

      <section>
        <SectionTitle trailing={`Next ${HORIZON_DAYS} days · aiming for ${goal} per event`}>Upcoming events</SectionTitle>
        <div className="flex flex-col gap-4">
          {windows.map((w) => (
            <EventCard key={windowKey(w)} w={w} now={now} goal={goal} suggested={suggested.get(windowKey(w)) ?? []} />
          ))}
        </div>
        {!goldRush.anchor && (
          <p className="mt-3 px-1 text-xs text-muted">
            Gold Rush isn't on the calendar yet. <Link to="/settings" className="underline underline-offset-2">Set when a round starts</Link> to plan Rock and Fire trials.
          </p>
        )}
      </section>

      {anytime.length > 0 && (
        <section>
          <SectionTitle>Any time</SectionTitle>
          <Card className="flex flex-col gap-1 p-3">
            <p className="px-1 pb-2 text-sm text-muted">These trials use pinballs, Horde Invasion or nothing event-based, so they fit around everything else.</p>
            {anytime.map((c) => (
              <CandidateRow key={c.tatari.uid} c={c} />
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

function EventCard({ w, now, goal, suggested }: { w: EventWindow; now: number; goal: number; suggested: string[] }) {
  const owned = useStore((s) => s.owned);
  const key = windowKey(w);
  const candidates = candidatesFor(w, owned, lines);
  const planned = candidates.filter((c) => c.tatari.plannedFor === key);
  const isLive = w.start <= now;
  const info = EVENTS[w.slot];
  const [showAll, setShowAll] = useState(false);
  // Planned and suggested Tatari always show; the rest are folded away past the first few.
  const pinned = candidates.filter((c) => c.tatari.plannedFor === key || suggested.includes(c.tatari.uid));
  const others = candidates.filter((c) => !pinned.includes(c));
  const shown = showAll ? candidates : [...pinned, ...others.slice(0, Math.max(0, SHOW_FIRST - pinned.length))];

  return (
    <Card className={`flex flex-col gap-3 p-4 ${isLive ? 'ring-1 ring-accent' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 font-semibold">
            {info.name}
            {info.timing === 'parallel' && <span className="text-xs font-normal text-muted">runs alongside</span>}
          </h3>
          <p className="text-sm text-muted">
            {fmtDateTime(w.start)} – {fmtDateTime(w.end)}
          </p>
        </div>
        <Chip size="sm" variant={isLive ? 'primary' : 'soft'} color={isLive ? 'accent' : 'default'}>
          <Chip.Label>{isLive ? `Live · ends in ${fmtDuration(w.end - now)}` : `Starts in ${fmtDuration(w.start - now)}`}</Chip.Label>
        </Chip>
      </div>

      {candidates.length > 0 && (
        <p className="text-sm">
          <span className={planned.length >= goal ? 'text-success' : ''}>
            {planned.length} of {goal} planned
          </span>
          <span className="text-muted"> · {candidates.filter((c) => c.r.ready).length} ready · {candidates.length} could evolve here</span>
        </p>
      )}

      {candidates.length === 0 ? (
        <p className="text-sm text-muted">None of your Tatari's next evolutions use {info.name}.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {shown.map((c) => (
            <CandidateRow key={c.tatari.uid} c={c} w={w} suggested={suggested.includes(c.tatari.uid)} />
          ))}
          {shown.length < candidates.length && (
            <Button size="sm" variant="ghost" className="w-fit text-muted" onPress={() => setShowAll(true)}>
              Show {candidates.length - shown.length} more
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

/** One Tatari under an event: what it evolves into, what it still needs, and a button to plan it here. */
function CandidateRow({ c, w, suggested }: { c: Candidate; w?: EventWindow; suggested?: boolean }) {
  const { update, toggleCheck } = useStore();
  const edit = useEditTatari();
  const { tatari, line, r } = c;
  const key = w && windowKey(w);
  const isPlanned = !!key && tatari.plannedFor === key;
  const plannedElsewhere = !!tatari.plannedFor && !isPlanned;
  const eventTask = w ? r.step.tasks.find((t) => t.kind === 'event' && t.options.some((o) => o.slot === w.slot)) : undefined;
  const spend = eventTask?.kind === 'event' ? eventTask.options.find((o) => o.slot === w!.slot) : undefined;
  const during = r.step.tasks.filter((t) => t !== eventTask && (t.kind === 'progress' || t.kind === 'event'));

  return (
    <div className={`flex flex-col gap-2 rounded-lg p-2 ${isPlanned ? 'bg-accent/10' : ''}`}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => edit(line.id)} aria-label={`Edit ${formName(line, tatari.tier)}`} className="shrink-0 rounded-full">
          <TatariAvatar name={formName(line, tatari.tier)} element={line.element} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
            <button type="button" onClick={() => edit(line.id)} className="truncate text-left hover:underline">
              {formName(line, tatari.tier)} <span className="text-muted">→ {r.step.to}</span>
            </button>
            <StarRow level={tatari.stars} size={12} />
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {r.ready ? <ReadyChip /> : r.starsMissing > 0 && <StarsChip missing={r.starsMissing} />}
            {r.unmet.map(({ task, index }) => (
              <NeedsChip key={index}>{task.kind === 'feed' ? feedLabel(task) : task.text}</NeedsChip>
            ))}
            {suggested && !isPlanned && (
              <Chip size="sm" variant="soft" color="accent">
                <Sparkles size={12} />
                <Chip.Label>Suggested</Chip.Label>
              </Chip>
            )}
            {plannedElsewhere && <span className="text-xs text-muted">Planned for another event</span>}
          </div>
        </div>
        {key && (
          <Button
            size="sm"
            variant={isPlanned ? 'primary' : 'secondary'}
            aria-label={isPlanned ? `Unplan ${formName(line, tatari.tier)}` : `Plan ${formName(line, tatari.tier)} for ${eventName(w!.slot)}`}
            onPress={() => update(tatari.uid, { plannedFor: isPlanned ? undefined : key })}
          >
            {isPlanned ? <PinOff size={14} /> : <Pin size={14} />}
            <span className="hidden sm:inline">{isPlanned ? 'Planned' : 'Plan'}</span>
          </Button>
        )}
      </div>

      {(isPlanned || suggested) && (
        <div className="ml-13 flex flex-col gap-0.5 text-sm">
          {r.unmet.map(({ task, index }) => (
            <CheckRow key={index} checked={false} onChange={(v) => toggleCheck(tatari.uid, checkKey(r.step, index), v)}>
              Before it starts: {task.kind === 'feed' ? feedLabel(task) : task.text}
            </CheckRow>
          ))}
          {spend && (
            <p className="flex items-center gap-2 text-muted">
              <CalendarPlus size={14} className="shrink-0" /> In trial: spend {optionLabel(spend)}
            </p>
          )}
          {during.map((t, i) => (
            <p key={i} className="flex items-center gap-2 text-muted">
              <CalendarPlus size={14} className="shrink-0" /> In trial: {t.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
