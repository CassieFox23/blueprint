#!/usr/bin/env node
// Render the README's media: an animated preview of one sheet (PNG frames for gif.swift) and finished-sheet stills.
//   NODE_PATH=<playwright>/node_modules node video/readme-media.mjs --out /tmp/readme [--scene cache] [--fps 20] [--speed 2.4] [--width 1280] [--scale 1]
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
const fps = +(opt.fps || 20), speed = +(opt.speed || 2.4), width = +(opt.width || 1280), scale = +(opt.scale || 1);
const stills = (opt.stills || 'emudhra,event-loop,llm').split(',');
mkdirSync(join(out, 'frames'), { recursive: true });

const page = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@500&display=swap">
<style>
body{margin:0;background:#1d4b8a}
#card{width:${width}px;padding:34px 44px 44px;box-sizing:border-box;background-color:#1d4b8a;
  background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:24px 24px}
#top{display:flex;align-items:center;gap:16px;margin-bottom:26px;color:#fff}
#top svg{width:46px;height:46px;flex:none}
#top b{font:italic 400 54px/1 'Instrument Serif',serif;letter-spacing:-.01em}
#top span{margin-left:auto;font:500 21px/1.2 'Instrument Sans',sans-serif;color:#d6e3f7;text-align:right}
#top span em{font:italic 400 27px/1 'Instrument Serif',serif;color:#ffcf4a}
#h .bp-svg{border-radius:8px!important;box-shadow:0 30px 60px -30px rgba(0,0,0,.6)}
#plain{width:${width}px}#plain .bp-svg{border-radius:0!important}
</style>
<div id="card"><div id="top"><svg viewBox="0 0 32 32"><rect width="32" height="32" rx="7.5" fill="#fff"/><path d="M15.9 5.6 L10.6 26" fill="none" stroke="#1d4b8a" stroke-width="2.8" stroke-linecap="round"/><circle cx="18.6" cy="19.6" r="5.55" fill="none" stroke="#1d4b8a" stroke-width="2.8"/><circle cx="18.6" cy="19.6" r="1.9" fill="#ffcf4a"/></svg><b>/blueprint</b><span>A skill for Claude Code<br><em>Ask how it works. Get the drawing.</em></span></div><div id="h"></div></div>
<div id="plain"></div>
<script src="${pathToFileURL(join(root, 'runtime/blueprint.js'))}"></script>
${['small', 'complex'].map(g => `<script src="${pathToFileURL(join(root, 'examples', g))}/"></script>`).join('')}
`;
const file = join(out, 'page.html');
const { readdirSync } = await import('node:fs');
const scripts = ['small', 'complex'].flatMap(g => readdirSync(join(root, 'examples', g)).filter(f => f.endsWith('.js')).map(f => pathToFileURL(join(root, 'examples', g, f)).href));
writeFileSync(file, page.replace(/<script src="[^"]+examples[^"]*\/"><\/script>/g, '') + scripts.map(s => `<script src="${s}"></script>`).join('\n'));

const browser = await pw.chromium.launch();
const p = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: scale });
await p.goto(pathToFileURL(file).href);
await p.evaluate(() => document.fonts.ready.then(() => Promise.all(['500 12px "IBM Plex Mono"', 'italic 400 54px "Instrument Serif"', '500 21px "Instrument Sans"'].map(f => document.fonts.load(f)))));
const mountAt = async (id, where = 'h') => p.evaluate(([id, where]) => {
  const h = document.getElementById(where); h.innerHTML = '';
  window.C = BLUEPRINT.mount(h, BLUEPRINT.scenes[id], { play: 'still', controls: false, font: false });
  return window.C.timeline.total;
}, [id, where]);
const box = async (sel = '#card') => p.locator(sel).boundingBox();

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
await p.evaluate(() => { document.getElementById('h').innerHTML = ''; document.getElementById('card').style.display = 'none'; });
for (const id of stills) {
  const T = await mountAt(id, 'plain');
  await p.evaluate(t => window.C.seek(t), T);
  await p.screenshot({ path: join(out, `${id}.png`), clip: await box('#plain .bp-svg') });
}
await browser.close();
console.log(`${n} frames (${scene}, ${fps} fps, ${speed}x) and ${stills.length} stills -> ${out}`);
