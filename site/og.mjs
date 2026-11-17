#!/usr/bin/env node
// Render the site's share card (Open Graph / Twitter / Discord / Slack): site/og.png, 1200×630.
//   NODE_PATH=<playwright>/node_modules node site/og.mjs
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..');
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('playwright-core'); }

const html = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
*{box-sizing:border-box}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{position:relative;background-color:#1d4b8a;color:#fff;font-family:'Instrument Sans',sans-serif;
  background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:24px 24px}
.copy{position:absolute;left:72px;top:64px;bottom:60px;width:520px;display:flex;flex-direction:column}
.mark{display:flex;align-items:center;gap:14px}
.mark svg{width:46px;height:46px}
.mark b{font:italic 400 40px/1 'Instrument Serif',serif;letter-spacing:-.01em}
h1{margin:auto 0 0;font:400 84px/.94 'Instrument Serif',serif;letter-spacing:-.025em}
h1 em{display:block;color:#ffcf4a}
p{margin:26px 0 0;font:400 22px/1.4 'Instrument Sans',sans-serif;color:#d6e3f7;max-width:25em}
.url{margin-top:30px;font:500 17px/1 'IBM Plex Mono',monospace;letter-spacing:.06em;color:#a9c3ea}
.sheet{position:absolute;left:640px;top:96px;width:720px;filter:drop-shadow(0 34px 50px rgba(5,15,35,.55))}
.sheet .bp-svg{border-radius:8px}
</style>
<div class="copy">
  <div class="mark"><svg viewBox="0 0 32 32"><rect width="32" height="32" rx="7.5" fill="#fff"/><path d="M15.9 5.6 L10.6 26" fill="none" stroke="#1d4b8a" stroke-width="2.8" stroke-linecap="round"/><circle cx="18.6" cy="19.6" r="5.55" fill="none" stroke="#1d4b8a" stroke-width="2.8"/><circle cx="18.6" cy="19.6" r="1.9" fill="#ffcf4a"/></svg><b>/blueprint</b></div>
  <h1>Ask how it works.<em>Get the drawing.</em></h1>
  <p>A Claude Code skill that draws animated explainers like patent sheets, one part at a time.</p>
  <div class="url">BLUEPRINT.INTINCRAB.COM</div>
</div>
<div class="sheet" id="sheet"></div>
<script src="${pathToFileURL(join(root, 'runtime/blueprint.js'))}"></script>
<script src="${pathToFileURL(join(root, 'examples/small/cache.js'))}"></script>
<script>
window.ready = document.fonts.ready
  .then(() => Promise.all(['italic 400 40px "Instrument Serif"', '400 84px "Instrument Serif"', '400 22px "Instrument Sans"', '500 17px "IBM Plex Mono"', '500 12px "IBM Plex Mono"'].map(f => document.fonts.load(f))))
  .then(() => { const c = BLUEPRINT.mount(document.getElementById('sheet'), BLUEPRINT.scenes.cache, { play: 'still', controls: false, font: false }); c.seek(c.timeline.total); return true; });
</script>`;

const work = mkdtempSync(join(tmpdir(), 'bp-og-'));
writeFileSync(join(work, 'og.html'), html);
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(work, 'og.html')).href);
await page.evaluate(() => window.ready);
await page.waitForTimeout(200);
await page.screenshot({ path: join(here, 'og.png'), type: 'png' });
await browser.close();
rmSync(work, { recursive: true, force: true });
console.log('wrote ' + join(here, 'og.png'));
