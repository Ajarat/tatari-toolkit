/**
 * Imports official art from the Clash of Critters creator art pack ("CC Art Assets", shared with
 * creators in the official Discord) into public/art, and writes src/data/art.json listing what exists.
 *
 *   npm run fetch:art
 *
 * The Drive folder is shared by link only, so it's listed through Drive's public embedded folder
 * view and files are fetched with the public download link. Raw files are cached in .cache/art;
 * delete that folder to fetch fresh copies.
 *
 * Tatari art is keyed by line and tier, not by name: the pack's folder names don't always match the
 * game (its "Rockong-3" is the form the game calls Rockwu), but its tier numbers do.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { GameData } from '../src/data/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(ROOT, '.cache/art');
const OUT = path.join(ROOT, 'public/art');
const MANIFEST = path.join(ROOT, 'src/data/art.json');

const FOLDERS = {
  critters: '1iY9zJZmji9XA9eknX-Iv9OwEj6oc0m25', // Critters-NEW/<Line>/<Form>-<tier>/<Form>-<tier>.png
  stars: '18x1OFpk2rNFASHPL4mNK51QhftVt3YEs', // Icons/stars
  elements: '14xa8r2WmPhW7UOTtqGv7GQIXHYLnZ5Tr', // Icons/gallery
};

type Entry = { name: string; kind: 'dir' | 'file'; id: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();

async function ls(folderId: string): Promise<Entry[]> {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  await sleep(250);
  return [...html.matchAll(/<a href="([^"]+)"[^>]*>[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div>/g)].flatMap((m): Entry[] => {
    const dir = /\/folders\/([\w-]+)/.exec(m[1]);
    const file = /\/file\/d\/([\w-]+)/.exec(m[1]);
    return dir ? [{ name: decode(m[2]), kind: 'dir', id: dir[1] }] : file ? [{ name: decode(m[2]), kind: 'file', id: file[1] }] : [];
  });
}

/** Downloads a Drive file once, then reads it from the cache. */
async function download(id: string, cacheName: string): Promise<Buffer> {
  const cached = path.join(CACHE, cacheName);
  try {
    return await readFile(cached);
  } catch {
    const res = await fetch(`https://drive.google.com/uc?export=download&id=${id}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const buf = Buffer.from(await res.arrayBuffer());
    if (!res.ok || buf.subarray(1, 4).toString() !== 'PNG') throw new Error(`Not a PNG: ${cacheName}`);
    await mkdir(path.dirname(cached), { recursive: true });
    await writeFile(cached, buf);
    return buf;
  }
}

/** Squash names for matching: "Lullely" ≈ "Lullelly", "Souphog v2" ≈ "Souphog". */
const key = (s: string) =>
  s
    .toLowerCase()
    .replace(/\bv\d+\b/, '')
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1');

const webp = (buf: Buffer, size: number) => sharp(buf).resize(size, size, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();

async function save(rel: string, buf: Buffer) {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buf);
  return `art/${rel}`;
}

const game = JSON.parse(await readFile(path.join(ROOT, 'src/data/lines.json'), 'utf8')) as GameData;
const byKey = new Map(game.lines.map((l) => [key(l.forms[0]), l]));

// ---- Tatari: one picture per line and tier ----
const tatari: Record<string, string> = {};
const unmatched: string[] = [];
const lineFolders = (await ls(FOLDERS.critters)).filter((e) => e.kind === 'dir');
// A "v2" folder replaces the original, so handle it last.
lineFolders.sort((a, b) => Number(/\bv\d+\b/.test(a.name)) - Number(/\bv\d+\b/.test(b.name)));

for (const folder of lineFolders) {
  const line = byKey.get(key(folder.name));
  if (!line) {
    unmatched.push(folder.name);
    continue;
  }
  // Usually one subfolder per form ("Rockfu-2/Rockfu-2.png"); some lines keep the pictures loose in
  // the line folder instead ("Snowcub/Polarpaw-2.png").
  const entries = await ls(folder.id);
  const pictures: { tier: number; pngs: Entry[]; base: string }[] = [];
  for (const formDir of entries.filter((e) => e.kind === 'dir')) {
    const tier = Number(/-(\d)\s*$/.exec(formDir.name)?.[1]);
    if (tier) pictures.push({ tier, base: formDir.name.trim(), pngs: (await ls(formDir.id)).filter((e) => e.kind === 'file' && /\.png$/i.test(e.name)) });
  }
  for (const f of entries.filter((e) => e.kind === 'file' && /-(\d)\.png$/i.test(e.name))) {
    const tier = Number(/-(\d)\.png$/i.exec(f.name)![1]);
    if (!pictures.some((p) => p.tier === tier)) pictures.push({ tier, base: f.name.replace(/\.png$/i, ''), pngs: [f] });
  }
  for (const { tier, base, pngs } of pictures) {
    if (tier > line.forms.length) continue;
    // The main picture is "<Form>-<tier>.png". Glitter ("glitch") recolours are only a fallback, and
    // animation stills are skipped.
    const main =
      pngs.find((p) => p.name.replace(/\.png$/i, '') === base) ?? pngs.find((p) => !/glitch|spine/i.test(p.name)) ?? pngs.find((p) => /glitch/i.test(p.name));
    if (!main) continue;
    const raw = await download(main.id, `tatari/${line.id}-${tier}.png`);
    tatari[`${line.id}-${tier}`] = await save(`tatari/${line.id}-${tier}.webp`, await webp(raw, 320));
    process.stdout.write('.');
  }
}
console.log();

// ---- Star level icons ----
const STAR_FILES: Record<string, string> = {
  '星星01.png': 'star-bronze',
  '星星02.png': 'star-silver',
  '星星03.png': 'star-gold',
  '月亮01.png': 'moon-silver',
  '月亮02.png': 'moon-gold',
  '月亮03.png': 'moon-iridescent',
  '太阳01.png': 'sun-gold',
  '太阳02.png': 'sun-iridescent',
  '太阳03.png': 'sun-red',
  '皇冠01.png': 'crown-blue',
  '皇冠02.png': 'crown-gold',
  '皇冠03.png': 'crown-iridescent',
  '特殊.png': 'emblem-iridescent',
  '特殊星星.png': 'emblem-iridescent-gem',
};
const stars: Record<string, string> = {};
for (const f of await ls(FOLDERS.stars)) {
  const name = STAR_FILES[f.name];
  if (!name) continue;
  const raw = await download(f.id, `stars/${name}.png`);
  stars[name] = await save(`stars/${name}.webp`, await webp(raw, 160));
}

// ---- Element badges ----
const ELEMENT_FILES: Record<string, string> = { 'fire.png': 'Fire', 'grass.png': 'Grass', 'light icon.png': 'Lightning', 'rock.png': 'Rock', 'water.png': 'Water' };
const elements: Record<string, string> = {};
for (const f of await ls(FOLDERS.elements)) {
  const name = ELEMENT_FILES[f.name];
  if (!name) continue;
  const raw = await download(f.id, `elements/${name}.png`);
  elements[name] = await save(`elements/${name.toLowerCase()}.webp`, await webp(raw, 96));
}

await writeFile(MANIFEST, JSON.stringify({ tatari, stars, elements }, null, 1) + '\n');

const missing = game.lines.flatMap((l) => l.forms.map((f, i) => (tatari[`${l.id}-${i + 1}`] ? null : `${f} (${l.id} T${i + 1})`))).filter(Boolean);
console.log(`Tatari art: ${Object.keys(tatari).length} forms. Stars: ${Object.keys(stars).length}. Elements: ${Object.keys(elements).length}.`);
console.log('Art pack folders with no matching line:', unmatched.join(', ') || 'none');
console.log('Forms without art:', missing.join(', ') || 'none');
