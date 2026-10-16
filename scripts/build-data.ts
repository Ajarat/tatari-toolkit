/**
 * Builds src/data/lines.json from TataDex's evolution route pages.
 *
 *   npm run build:data            parse the cached pages in .cache/tatadex
 *   npm run build:data -- --fetch download fresh copies first (politely, one at a time)
 *
 * Every trial keeps its original wording; the parser only adds structure (star level, which events
 * a task can be done in, whether it counts retroactively) so the planner can reason about it.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Element, EventOption, EventSlot, GameData, Line, Step, Task } from '../src/data/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(ROOT, '.cache/tatadex');
const OUT = path.join(ROOT, 'src/data/lines.json');
const BASE = 'https://tatadex.org';

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;|&rsquo;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function fetchPages() {
  await mkdir(path.join(CACHE, 'routes'), { recursive: true });
  const index = await (await fetch(`${BASE}/evolutions/`)).text();
  await writeFile(path.join(CACHE, 'index.html'), index);
  const slugs = [...new Set([...index.matchAll(/href="\/evolutions\/([a-z0-9-]+)\/"/g)].map((m) => m[1]))];
  for (const slug of slugs) {
    const html = await (await fetch(`${BASE}/evolutions/${slug}/`)).text();
    await writeFile(path.join(CACHE, 'routes', `${slug}.html`), html);
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`Fetched ${slugs.length} route pages`);
}

/** Star tiers come in sixes: "6 silver stars" is star level 12, "6 silver moons" is 24. */
const STAR_TIERS: [RegExp, number][] = [
  [/bronze stars?/, 0],
  [/silver stars?/, 6],
  [/gold stars?/, 12],
  [/silver (?:crescent )?moons?/, 18],
  [/gold (?:crescent )?moons?/, 24],
  [/iridescent (?:crescent )?moons?/, 30],
  [/gold suns?/, 36],
];

function parseStars(text: string): number | null {
  const t = text.toLowerCase();
  const n = Number(/reach (\d+)/.exec(t)?.[1]);
  if (!n) return null;
  for (const [re, offset] of STAR_TIERS) if (re.test(t)) return offset + n;
  return /\d+ stars?/.test(t) ? n : null;
}

/** Event currency → the event it's earned and spent in. */
const UNITS: [RegExp, EventSlot, string][] = [
  [/fishing rods?|\brods?\b/, 'fishing', 'rods'],
  [/skateboards?|snowboards?|\bboards?\b/, 'marathon', 'boards'],
  [/fertili[sz]er/, 'cozy_farm', 'fertilizer'],
  [/treasures?/, 'treasure_hunt', 'treasure'],
  [/energy (?:drinks?|cans?)/, 'gold_rush', 'energy drinks'],
  [/gold hunt coins?/, 'zobo_shooter', 'Gold Hunt Coins'],
  [/pinballs?/, 'pinball', 'pinballs'],
];
const NUM = String.raw`(\d[\d,]*(?:\.\d+)?k?)`;

const toNumber = (s: string) => {
  const k = s.toLowerCase().endsWith('k');
  const n = Number(s.replace(/[,k]/gi, ''));
  return k ? n * 1000 : n;
};

/** "use x2000 boards", "Use 6,000 fishing rods", "6k rods", "Energy Drink x20,000". */
function eventOptions(text: string): EventOption[] {
  const t = text.toLowerCase();
  const found: EventOption[] = [];
  for (const [re, slot, unit] of UNITS) {
    const before = new RegExp(String.raw`x?\s*${NUM}\s*x?\s*(?:\w+\s){0,1}(?:${re.source})`).exec(t);
    const after = new RegExp(String.raw`(?:${re.source})\s*x\s*${NUM}`).exec(t);
    const amount = before?.[1] ?? after?.[1];
    if (amount && !found.some((o) => o.slot === slot)) found.push({ slot, amount: toNumber(amount), unit });
  }
  return found;
}

/** Known typos in the source text, keyed by line id. */
const FIXES: Record<string, [string, string][]> = {
  // "Fishing Contest (use x2000 fertilizer)" means rods.
  skinklet: [['Fishing Contest (use x2000 fertilizer)', 'Fishing Contest (use x2000 fishing rods)']],
};

/**
 * Form names that differ in game from the source, keyed by line id, tier 1 first. The in-game name
 * wins: players match these against their screen.
 */
const FORM_NAMES: Record<string, string[]> = {
  // TataDex (and the official art pack folders) have T3/T4 swapped; in game the T3 is Rockwu.
  punchimp: ['Punchimp', 'Rockfu', 'Rockwu', 'Rockong'],
};

/**
 * T4 forms the source is missing (every line has 2 or 4 forms; TataDex has no page for these
 * T4s yet). Names come from players and the official art pack; null where the name isn't known yet
 * (TataDex lists them as e.g. "pet-43-4").
 */
const MISSING_T4: Record<string, string | null> = {
  taptail: 'Dharmadder',
  fumekit: 'Blastniff',
  dumbopus: 'Lordopus',
  sparkeet: 'Technocan',
  lollama: 'Blechlama',
  dewgrub: 'Morphanessa',
  cactobud: null,
  drilleroo: null,
  flameow: null,
  kittazap: null,
};

/** Whole lines TataDex has Tatari pages for but no evolution page (so no trial data yet). */
const MISSING_LINES: { id: string; element: Element; forms: string[] }[] = [
  { id: 'cavyzap', element: 'Lightning', forms: ['Cavyzap', 'Hippiehog', 'Wheekroller', 'Gigagnash'] },
  { id: 'snowcub', element: 'Water', forms: ['Snowcub', 'Polarpaw', 'Blizzgrizz', 'Anglerbear'] },
  { id: 'dolphie', element: 'Water', forms: ['Dolphie', 'Blubbles', 'Aquariel', 'Irisia'] },
  { id: 'ringtail', element: 'Rock', forms: ['Ringtail', 'Rizzler', 'Zorrock', 'Phantothief'] },
];

const UNKNOWN_NAME = 'Unknown T4';

/** A step whose form is known but whose star requirement and trials aren't. */
const unknownStep = (toTier: number, from: string, to: string): Step => ({
  toTier,
  from,
  to,
  stars: null,
  starsText: 'Star requirement not known yet',
  tasks: [],
  confidence: 'Unknown',
  unknown: true,
});

function classify(raw: string): Task {
  const text = raw.replace(/\s*\/\s*$/, '');
  const t = text.toLowerCase();
  if (/b quality/.test(t)) return { kind: 'feed', text, grade: 'B' };
  if (/(?:increase|raise) (?:its )?stats 3 times/.test(t)) return { kind: 'feed', text, grade: 'stats3' };
  if (/^reach \d+ stars?\.?$/.test(t)) return { kind: 'state', text };

  const options = eventOptions(text);
  if (options.length) return { kind: 'event', text, options };
  if (/gold ?rush/.test(t)) return { kind: 'event', text, options: [{ slot: 'gold_rush' }] };
  if (/horde/.test(t)) return { kind: 'event', text, options: [{ slot: 'horde' }] };

  // Things you either have or don't count no matter when they happened.
  if (/^(own|have)\b|clear chapter|reach difficulty/.test(t)) return { kind: 'state', text };
  return { kind: 'progress', text };
}

function parseLine(id: string, html: string): Line {
  const element = /class="chip element-(\w+)"/.exec(html)?.[1] ?? '';
  const stageIds = JSON.parse(/evolutionStageIds = (\[[^\]]*\])/.exec(html)?.[1] ?? '[]') as string[];
  const fixes = FIXES[id] ?? [];

  const steps: Step[] = [];
  for (const m of html.matchAll(/<article id="[^"]+" class="trial-card">([\s\S]*?)<\/article>/g)) {
    const card = m[1];
    const [, , to] = /(\d)→(\d)/.exec(card) ?? [];
    const from = decode(/<small>([\s\S]*?) evolves into<\/small>/.exec(card)?.[1] ?? '');
    const toName = decode(/<h3>([\s\S]*?)<\/h3>/.exec(card)?.[1] ?? '');
    const confidence = decode(/class="status-badge[^"]*">([\s\S]*?)<\/span>/.exec(card)?.[1] ?? '');
    const starsText = decode(/class="trial-stars">([\s\S]*?)<\/p>/.exec(card)?.[1] ?? '').replace(/ to unlock$/, '');
    const tasks = [...card.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((li) => {
      let text = decode(li[1]);
      for (const [bad, good] of fixes) text = text.replace(bad, good);
      return classify(text);
    });
    steps.push({ toTier: Number(to), from, to: toName, stars: parseStars(starsText), starsText, tasks, confidence });
  }

  let forms = steps.length ? [steps[0].from, ...steps.map((s) => s.to)] : stageIds;
  const renamed = FORM_NAMES[id];
  if (renamed) {
    const rename = new Map(forms.map((f, i) => [f, renamed[i]]));
    forms = renamed;
    for (const st of steps) {
      st.from = rename.get(st.from) ?? st.from;
      st.to = rename.get(st.to) ?? st.to;
      for (const t of st.tasks) t.text = t.text.replace(/\b[A-Z][a-z]+\b/g, (w) => rename.get(w) ?? w);
    }
  }
  if (id in MISSING_T4 && forms.length === 3) {
    const t4 = MISSING_T4[id] ?? UNKNOWN_NAME;
    steps.push(unknownStep(4, forms[2], t4));
    forms = [...forms, t4];
  }
  return {
    id,
    element: (element.charAt(0).toUpperCase() + element.slice(1)) as Element,
    forms,
    steps,
    incomplete: forms.length !== 2 && forms.length !== 4,
  };
}

if (process.argv.includes('--fetch')) await fetchPages();

const files = (await readdir(path.join(CACHE, 'routes'))).filter((f) => f.endsWith('.html')).sort();
const lines: Line[] = [];
for (const f of files) lines.push(parseLine(f.replace(/\.html$/, ''), await readFile(path.join(CACHE, 'routes', f), 'utf8')));

for (const m of MISSING_LINES) {
  if (lines.some((l) => l.id === m.id)) continue;
  const steps = m.forms.slice(1).map((to, i) => unknownStep(i + 2, m.forms[i], to));
  lines.push({ ...m, steps, incomplete: false });
}
lines.sort((a, b) => a.id.localeCompare(b.id));

const data: GameData = {
  lines,
  source: { name: 'TataDex', url: `${BASE}/evolutions/`, fetchedAt: new Date().toISOString().slice(0, 10) },
};
await writeFile(OUT, JSON.stringify(data, null, 1) + '\n');

// A short report so odd parses are easy to spot.
const steps = lines.flatMap((l) => l.steps.map((s) => ({ line: l.id, ...s })));
console.log(`${lines.length} lines, ${steps.length} steps → ${path.relative(ROOT, OUT)}`);
console.log('Incomplete lines:', lines.filter((l) => l.incomplete).map((l) => `${l.id} (${l.forms.length})`).join(', ') || 'none');
console.log('Steps with unknown trials:', steps.filter((s) => s.unknown).length);
console.log('Unread star gates:', steps.filter((s) => s.stars == null && !s.unknown).map((s) => `${s.line} T${s.toTier} "${s.starsText}"`).join('; ') || 'none');
for (const s of steps.filter((s) => s.toTier >= 3 && !s.unknown)) {
  const ev = s.tasks.filter((t) => t.kind === 'event');
  if (!ev.length) console.log(`No event task: ${s.line} T${s.toTier}: ${s.tasks.map((t) => `[${t.kind}] ${t.text}`).join(' | ')}`);
}
