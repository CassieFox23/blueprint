#!/usr/bin/env node
// Render video/film.html frame by frame to lossless PNGs.
//   NODE_PATH=<playwright>/node_modules node video/render.mjs --out /tmp/frames [--fps 60] [--timing timing.json] [--only 2,8.5,15]
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('playwright-core'); }
const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[++i];
const out = resolve(opt.out || join(here, 'frames')), fps = +(opt.fps || 30);
mkdirSync(out, { recursive: true });
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGE ERROR', String(e)));
if (opt.timing) await page.addInitScript(`window.TIMING = ${readFileSync(resolve(opt.timing), 'utf8')}`);
await page.goto(pathToFileURL(join(here, 'film.html')).href);
await page.evaluate(() => window.ready);
const dur = await page.evaluate(() => window.DURATION);
const times = opt.only ? opt.only.split(',').map(Number) : Array.from({ length: Math.round(dur * fps) }, (_, i) => i / fps);
let n = 0;
for (const t of times) {
  await page.evaluate(t => window.setTime(t), t);
  const name = opt.only ? `t${String(t).replace('.', '_')}.jpg` : `f${String(n).padStart(5, '0')}.png`;
  await page.screenshot(opt.only ? { path: join(out, name), type: 'jpeg', quality: 80 } : { path: join(out, name), type: 'png' });   // lossless frames for the encode
  if (++n % 150 === 0) console.log(`${n} / ${times.length}`);
}
await browser.close();
console.log(`frames: ${n} -> ${out}`);
