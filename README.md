# Stratari

> **Unofficial Fan-Created Work.** Not made, endorsed or authorized by Farlight Games. Clash of Critters and its characters, artwork and other materials belong to Farlight Games. Free and non-commercial.
>
> Made by **Zaoirse** (Clash of Critters UID 32732396).

Community tools for Clash of Critters, coming to [stratari.gg](https://stratari.gg). First tool: the **evolution calendar**, which lines up your Tatari's
T3/T4 trials with the events they need, so you always have a couple ready when the right event starts.

## Run it

```bash
npm install
npm run dev
```

Works fully in the browser with no backend. To turn on accounts and cloud save, copy `.env.example`
to `.env`, fill in your Supabase URL and publishable key, and run `supabase/migrations/0001_saves.sql`
once in the Supabase SQL editor.

## Deploy

Hosted on Cloudflare (Workers static assets, config in `wrangler.jsonc`). With the GitHub repo
connected in the Cloudflare dashboard, every push to `main` deploys and pull requests get preview
links. To deploy by hand: `npm run deploy`.

## Data

- `src/data/lines.json` is generated from [TataDex](https://tatadex.org/evolutions/) by `npm run build:data`
  (add `-- --fetch` to download fresh pages into `.cache/`). Trial text is kept as written; the parser adds
  star levels, which events a task can be done in, and whether it counts retroactively.
- `src/data/events.ts` holds event names, the rotation order and the default schedule anchor.

## Scripts

`npm test` runs the schedule/planner tests, `npm run typecheck` and `npm run lint` check the rest.
