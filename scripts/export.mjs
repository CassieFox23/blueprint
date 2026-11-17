#!/usr/bin/env node
// Export a scene for places where JavaScript doesn't run: READMEs, Slack, X, Notion, slides.
//
//   node scripts/export.mjs scene.js --format gif                 -> scene.gif
//   node scripts/export.mjs scene.js --format mp4 --audio music.mp3
//   node scripts/export.mjs scene.js --format png                 -> the finished sheet, 2x
//   node scripts/export.mjs scene.js --format png --steps         -> one PNG per step (for slides)
//   node scripts/export.mjs scene.js --format all
//
// Options: --out <file or folder> --width 1280 --fps (gif 15, mp4 30) --speed (gif 1.8, mp4 1.25)
//          --paper blue|linen --hold 1.5 --scale (png 2, else 1)
// Needs Playwright (as frames.mjs does). GIF and PNG need nothing else. MP4 uses ffmpeg when it
// is on PATH, otherwise AVFoundation on macOS; elsewhere, install ffmpeg.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { GifWriter } from './lib/gif.mjs';
import { decodePNG } from './lib/png.mjs';

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..');
const require = createRequire(import.meta.url);
const argv = process.argv.slice(2), opt = {}, files = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--steps') opt.steps = true;
  else if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[++i];
  else files.push(argv[i]);
}
if (!files.length) { console.error('usage: export.mjs scene.js --format gif|mp4|png|all [--out path] [--steps] [--paper blue|linen] [--audio track.mp3]'); process.exit(2); }
let pw; try { pw = require('playwright'); } catch { try { pw = require('playwright-core'); } catch { console.error('Playwright not found. In a scratch dir: npm i playwright@1.56.1 && npx playwright install chromium, then NODE_PATH=<scratch>/node_modules node export.mjs ...'); process.exit(2); } }

const src = resolve(files[0]), stem = basename(src).replace(/\.js$/, '');
const formats = (opt.format || 'gif') === 'all' ? ['png', 'gif', 'mp4'] : (opt.format || 'gif').split(',');
const width = +(opt.width || 1280), hold = +(opt.hold || 1.5);
const outFor = ext => {
  if (!opt.out) return resolve(dirname(src), `${stem}.${ext}`);
  const o = resolve(opt.out);
  return /\.[a-z0-9]+$/i.test(o) && formats.length === 1 && !opt.steps ? o : join(o, `${stem}.${ext}`);
};

const page = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>html,body{margin:0;background:transparent}#h{width:${width}px}.bp-svg{border-radius:0!important}</style>
<div id="h"></div>
<script src="${pathToFileURL(join(root, 'runtime/blueprint.js'))}"></script>
<script src="${pathToFileURL(src)}"></script>`;
const work = mkdtempSync(join(tmpdir(), 'bp-export-'));
writeFileSync(join(work, 'page.html'), page);

const browser = await pw.chromium.launch();
async function open(scale) {
  const p = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: scale });
  p.on('pageerror', e => console.log('PAGE ERROR', String(e)));
  await p.goto(pathToFileURL(join(work, 'page.html')).href);
  await p.evaluate(() => document.fonts.ready.then(() => document.fonts.load('500 12px "IBM Plex Mono"')).catch(() => {}));
  const info = await p.evaluate(paper => {
    const ids = Object.keys(BLUEPRINT.scenes), id = ids[ids.length - 1];
    window.C = BLUEPRINT.mount(document.getElementById('h'), BLUEPRINT.scenes[id], { play: 'still', controls: false, font: false, paper: paper || undefined });
    return { id, total: window.C.timeline.total, steps: window.C.timeline.steps.map(s => ({ a: s.a, b: s.b, say: s.say })) };
  }, opt.paper);
  const clip = await p.locator('#h .bp-svg').boundingBox();
  const shot = async t => { await p.evaluate(t => window.C.seek(t), t); return p.screenshot({ clip, type: 'png', omitBackground: false }); };
  return { p, info, clip, shot };
}
const written = [];

if (formats.includes('png')) {
  const { info, shot } = await open(+(opt.scale || 2));
  if (opt.steps) {
    const dir = opt.out ? resolve(opt.out) : resolve(dirname(src), `${stem}-steps`);
    mkdirSync(dir, { recursive: true });
    for (let i = 0; i < info.steps.length; i++) {
      const f = join(dir, `${stem}-${String(i + 1).padStart(2, '0')}.png`);
      writeFileSync(f, await shot(info.steps[i].b - 0.05)); written.push(f);
    }
  } else {
    const f = outFor('png'); mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, await shot(info.total)); written.push(f);
  }
}

async function frames(fps, speed, scale) {
  const { info, shot, clip } = await open(scale);
  const n = Math.ceil((info.total / speed) * fps), list = [];
  for (let i = 0; i <= n; i++) list.push(Math.min(info.total, (i / fps) * speed));
  return { info, shot, clip, list };
}

if (formats.includes('gif')) {
  const fps = +(opt.fps || 15), speed = +(opt.speed || 1.8);
  const { shot, list } = await frames(fps, speed, +(opt.scale || 1));
  const pick = [list[Math.floor(list.length * 0.3)], list[Math.floor(list.length * 0.7)], list[list.length - 1]];
  const samples = [];
  for (const t of pick) samples.push(decodePNG(await shot(t)).data);
  const first = decodePNG(await shot(0));
  const gif = new GifWriter(first.width, first.height, samples);
  for (let i = 0; i < list.length; i++) {
    const img = i === 0 ? first : decodePNG(await shot(list[i]));
    gif.add(img.data, 1 / fps + (i === list.length - 1 ? hold : 0));
    if (i && i % 60 === 0) process.stdout.write(`  gif ${i}/${list.length}\r`);
  }
  const f = outFor('gif'); mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, gif.end()); written.push(f);
}

if (formats.includes('mp4')) {
  const fps = +(opt.fps || 30), speed = +(opt.speed || 1.25);
  const { shot, list } = await frames(fps, speed, +(opt.scale || 1));
  const dir = join(work, 'frames'); mkdirSync(dir);
  const all = [...list, ...Array(Math.round(hold * fps)).fill(list[list.length - 1])];
  for (let i = 0; i < all.length; i++) {
    writeFileSync(join(dir, `f${String(i).padStart(5, '0')}.png`), await shot(all[i]));
    if (i && i % 90 === 0) process.stdout.write(`  mp4 ${i}/${all.length}\r`);
  }
  const f = outFor('mp4'); mkdirSync(dirname(f), { recursive: true });
  const audio = opt.audio ? resolve(opt.audio) : null;
  const ff = spawnSync('ffmpeg', ['-version']);
  if (!ff.error && ff.status === 0) {
    const args = ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(dir, 'f%05d.png')];
    if (audio) args.push('-i', audio, '-shortest', '-c:a', 'aac', '-b:a', '192k');
    args.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', f);
    const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
    if (r.status !== 0) { console.error('ffmpeg failed'); process.exit(1); }
  } else if (process.platform === 'darwin') {
    let m4a = '-';
    if (audio) { m4a = join(work, 'audio.m4a'); spawnSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '192000', audio, m4a]); }
    const r = spawnSync('swift', [join(root, 'video/encode.swift'), dir, m4a, f, String(fps), '14000000'], { stdio: ['ignore', 'pipe', 'pipe'] });
    if (r.status !== 0 || !existsSync(f)) { console.error(String(r.stdout) + String(r.stderr)); process.exit(1); }
  } else {
    console.error('MP4 needs ffmpeg on PATH (apt install ffmpeg, winget install ffmpeg). GIF and PNG work without it.'); process.exit(1);
  }
  written.push(f);
}

await browser.close();
rmSync(work, { recursive: true, force: true });
for (const f of written) console.log('wrote ' + f);
