import { useEffect, useState } from 'react';
import { DAY } from './schedule';

/** The daily server reset (and every event start/end) is midnight UTC: 8pm US Eastern in summer time. */
export const RESET_UTC_HOUR = 0;

/** The next `count` resets after `from` (optionally starting some days back). */
export function resets(from: number, count: number, startOffsetDays = 0): number[] {
  const d = new Date(from);
  let first = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), RESET_UTC_HOUR);
  if (first <= from) first += DAY;
  first += startOffsetDays * DAY;
  return Array.from({ length: count }, (_, i) => first + i * DAY);
}

const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const fmtDate = (ms: number) => dateFmt.format(ms);
export const fmtDateTime = (ms: number) => dateTimeFmt.format(ms);

/** "2d 5h", "5h 12m", "12m". */
export function fmtDuration(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

/** Current time, refreshed every minute so countdowns stay right. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
