#!/usr/bin/env node
// Render the README's media: an animated preview of one sheet (PNG frames for gif.swift) and finished-sheet stills.
//   NODE_PATH=<playwright>/node_modules node video/readme-media.mjs --out /tmp/readme [--scene cache] [--fps 12] [--speed 1.6] [--width 880]
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..');
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('playwright-core'); }
const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[++i];
const out = resolve(opt.out || join(here, 'readme')), scene = opt.scene || 'cache';
const fps = +(opt.fps || 12), speed = +(opt.speed || 1.6), width = +(opt.width || 880);
const stills = (opt.stills || 'emudhra,event-loop,llm').split(',');
mkdirSync(join(out, 'frames'), { recursive: true });

const page = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>body{margin:0;background:#1d4b8a}#h{width:${width}px}.bp-svg{border-radius:0!important}</style>
<div id="h"></div>
<script src="${pathToFileURL(join(root, 'runtime/blueprint.js'))}"></script>
${['small', 'complex'].map(g => `<script src="${pathToFileURL(join(root, 'examples', g))}/"></script>`).join('')}
`;
const file = join(out, 'page.html');
const { readdirSync } = await import('node:fs');
const scripts = ['small', 'complex'].flatMap(g => readdirSync(join(root, 'examples', g)).filter(f => f.endsWith('.js')).map(f => pathToFileURL(join(root, 'examples', g, f)).href));
writeFileSync(file, page.replace(/<script src="[^"]+examples[^"]*\/"><\/script>/g, '') + scripts.map(s => `<script src="${s}"></script>`).join('\n'));

const browser = await pw.chromium.launch();
const p = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(file).href);
await p.evaluate(() => document.fonts.ready.then(() => document.fonts.load('500 12px "IBM Plex Mono"')));
const mountAt = async id => p.evaluate(id => {
  const h = document.getElementById('h'); h.innerHTML = '';
  window.C = BLUEPRINT.mount(h, BLUEPRINT.scenes[id], { play: 'still', controls: false, font: false });
  return window.C.timeline.total;
}, id);
const box = async () => p.locator('#h .bp-svg').boundingBox();

// animated preview
const total = await mountAt(scene), hold = 1.6;
const n = Math.ceil((total / speed + hold) * fps);
const clip = await box();
for (let i = 0; i < n; i++) {
  const t = Math.min(total, (i / fps) * speed);
  await p.evaluate(t => window.C.seek(t), t);
  await p.screenshot({ path: join(out, 'frames', `f${String(i).padStart(4, '0')}.png`), clip });
}
// stills of finished sheets
for (const id of stills) {
  const T = await mountAt(id);
  await p.evaluate(t => window.C.seek(t), T);
  await p.screenshot({ path: join(out, `${id}.png`), clip: await box() });
}
await browser.close();
console.log(`${n} frames (${scene}, ${fps} fps, ${speed}x) and ${stills.length} stills -> ${out}`);
