# Tatari Toolkit

Community tools for Clash of Critters. First tool: the **evolution calendar**, which lines up your Tatari's
T3/T4 trials with the events they need, so you always have a couple ready when the right event starts.

## Run it

```bash
npm install
npm run dev
```

Works fully in the browser with no backend. To turn on accounts and cloud save, copy `.env.example`
to `.env`, fill in your Supabase URL and publishable key, and run `supabase/migrations/0001_saves.sql`
once in the Supabase SQL editor.

## Data

- `src/data/lines.json` is generated from [TataDex](https://tatadex.org/evolutions/) by `npm run build:data`
  (add `-- --fetch` to download fresh pages into `.cache/`). Trial text is kept as written; the parser adds
  star levels, which events a task can be done in, and whether it counts retroactively.
- `src/data/events.ts` holds event names, the rotation order and the default schedule anchor.

## Scripts

`npm test` runs the schedule/planner tests, `npm run typecheck` and `npm run lint` check the rest.
