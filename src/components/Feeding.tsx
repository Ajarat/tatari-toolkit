import { Heart, Shield, Sword, type LucideIcon } from 'lucide-react';
import {
  BLUE_MAX_FEED_STAGE,
  FEED_STAGES,
  GRADE_STYLE,
  GRADES,
  maxFeedStage,
  STAT_NAME,
  STATS,
  stageFromGrades,
  starsForFeedStage,
  type Grade,
  type Stat,
  type StatGrades,
} from '../data/feeding';
import type { Line } from '../data/types';
import { feedStage, rating, type OwnedTatari } from '../logic/plan';

type Props = { line: Line; t: OwnedTatari; onChange: (patch: Pick<OwnedTatari, 'grades'>) => void };

const STAT_ICON: Record<Stat, LucideIcon> = { atk: Sword, hp: Heart, def: Shield };

/** Before the player enters anything, every stat starts at the bottom grade. */
const BLANK_GRADES: StatGrades = { atk: 'E', hp: 'E', def: 'E' };

/**
 * Whether a stat can be set to `g`: the grades imply a feeding stage, and stages are capped by stars
 * (and at 10 for blue Tatari).
 */
function allowed(line: Line, t: OwnedTatari, stat: Stat, g: Grade) {
  return stageFromGrades({ ...(t.grades ?? BLANK_GRADES), [stat]: g }) <= maxFeedStage(line, t.stars);
}

/** Why higher grades are locked, for the tooltip on a disabled letter. */
function capReason(line: Line, t: OwnedTatari) {
  const max = maxFeedStage(line, t.stars);
  return line.forms.length === 2 && max === BLUE_MAX_FEED_STAGE
    ? 'Blue Tatari can’t be fed past stage 10.'
    : `Higher would mean feeding stage ${max + 1}, which needs ${starsForFeedStage(max + 1)} stars.`;
}

/** "Stage 6 · /640", so the result can be checked against the bar in game. */
function StageReadout({ t, className }: { t: OwnedTatari; className?: string }) {
  if (!t.grades) return <span className={`text-muted ${className}`}>Set grades for feeding stage</span>;
  const stage = feedStage(t);
  return (
    <span className={`tabular-nums ${className}`}>
      <span className="font-semibold">Stage {stage}</span> <span className="text-muted">· /{FEED_STAGES[stage].bar}</span>
    </span>
  );
}

/**
 * The three stat grades as small badges. Tapping one moves it up a grade, wrapping back to E after
 * the highest grade its stars allow, so a card can be matched to the game without opening anything.
 */
function StatChips({ line, t, onChange }: Props) {
  const grades = t.grades ?? BLANK_GRADES;
  return (
    <div className="flex gap-1" role="group" aria-label="Stat grades">
      {STATS.map((s) => {
        const Icon = STAT_ICON[s];
        const g = grades[s];
        const up = GRADES[GRADES.indexOf(g) + 1];
        const next = up && allowed(line, t, s, up) ? up : 'E';
        return (
          <button
            key={s}
            type="button"
            title={`${STAT_NAME[s]}: ${t.grades ? g : 'not set'}. Tap to change.`}
            aria-label={`${STAT_NAME[s]} grade ${t.grades ? g : 'not set'}`}
            onClick={() => onChange({ grades: { ...grades, [s]: t.grades ? next : g } })}
            className={`flex items-center gap-0.5 rounded-md py-0.5 pr-1.5 pl-1 text-[11px] font-black transition-all ${
              t.grades ? GRADE_STYLE[g] : 'bg-surface-secondary text-muted'
            }`}
          >
            <Icon size={11} strokeWidth={3} aria-hidden />
            {t.grades ? g : '–'}
          </button>
        );
      })}
    </div>
  );
}

/** Stat grades with the feeding stage they imply, compact enough for a card. */
export function FeedingControl(props: Props) {
  return (
    <div className="flex flex-col items-center gap-1">
      <StatChips {...props} />
      <StageReadout t={props.t} className="text-xs" />
    </div>
  );
}

/** Each stat's grade, the Rating and the feeding stage they add up to, for the details drawer. */
export function FeedingEditor({ line, t, onChange }: Props) {
  const grades = t.grades ?? BLANK_GRADES;
  const r = rating(t);
  const reason = capReason(line, t);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-2">
          <span className="text-muted">Rating</span>
          {r ? <span className={`grid size-6 place-items-center rounded-md text-xs font-black ${GRADE_STYLE[r]}`}>{r}</span> : <span className="text-muted">not set</span>}
        </span>
        <span>
          <span className="text-muted">Feeding </span>
          <StageReadout t={t} />
        </span>
      </div>
      {STATS.map((s) => {
        const Icon = STAT_ICON[s];
        return (
          <div key={s} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex w-20 items-center gap-1.5 text-sm">
              <Icon size={14} aria-hidden /> {STAT_NAME[s]}
            </span>
            <div className="flex gap-1" role="radiogroup" aria-label={`${STAT_NAME[s]} grade`}>
              {GRADES.map((g) => {
                const selected = !!t.grades && grades[s] === g;
                const ok = allowed(line, t, s, g);
                return (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!ok}
                    title={ok ? undefined : reason}
                    onClick={() => onChange({ grades: { ...grades, [s]: g } })}
                    className={`grid size-7 place-items-center rounded-md text-xs font-black transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
                      selected ? `${GRADE_STYLE[g]} ring-2 ring-white/70` : 'bg-surface-secondary text-muted enabled:hover:text-foreground'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted">
        Copy the three letters from the game. Each feeding upgrade raises one stat a grade, so the feeding stage follows from them; check it against the bar's total
        in game.
      </p>
    </div>
  );
}
