#!/usr/bin/env node
// Render a scene frozen at chosen moments into one contact sheet PNG, and
// report runtime errors. Needs Playwright:  npm i playwright@1.56.1  (in a
// scratch dir) and NODE_PATH pointing at its node_modules.
//
//   node scripts/frames.mjs --src examples/small/cache.js --out /tmp/cache.png
//   node scripts/frames.mjs --src scene.js --frames "s1:end,s2:0.5,s3:end,end" --paper linen
//
// Frames: "sN:end" = end of step N, "sN:0.5" = halfway through step N,
// "t:4.2" = 4.2 s in, "end" = the finished drawing. Default: the middle and
// end of every step.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? a.concat([[v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]]) : a), []));
if (!args.src) { console.error('usage: frames.mjs --src scene.js [--out sheet.png] [--frames "s1:end,s2:0.5,end"] [--paper blue|linen] [--cols 2] [--width 520]'); process.exit(2); }

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { try { playwright = require('playwright-core'); } catch { console.error('Playwright not found. In a scratch dir: npm i playwright@1.56.1, then NODE_PATH=<scratch>/node_modules node frames.mjs ...'); process.exit(2); } }

const runtime = resolve(here, '../runtime/blueprint.js');
const src = resolve(args.src);
const out = resolve(args.out || src.replace(/\.js$/, '') + '.frames.png');
const cols = +(args.cols || 2), width = +(args.width || 520);

const page = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:16px;background:#d9dde3;font:12px ui-monospace,Menlo,monospace;color:#111}
#g{display:grid;grid-template-columns:repeat(${cols},${width}px);gap:14px}
.f b{display:block;margin:0 0 4px;font-weight:600}
</style><div id="g"></div>
<script src="${pathToFileURL(runtime)}"></script><script src="${pathToFileURL(src)}"></script>
<script>
window.__errors=[];window.addEventListener('error',e=>__errors.push(String(e.message)));
const ids=Object.keys(BLUEPRINT.scenes);const spec=BLUEPRINT.scenes[ids[ids.length-1]];
const L=BLUEPRINT.layout(spec);const tl=BLUEPRINT.compile(spec,L);
window.__report={errors:L.errors,warnings:L.warnings,steps:tl.steps.length,total:tl.total};
const want=${JSON.stringify(args.frames || '')}||tl.steps.map((s,i)=>'s'+(i+1)+':0.5,s'+(i+1)+':end').join(',');
const g=document.getElementById('g');
want.split(',').map(x=>x.trim()).filter(Boolean).forEach(f=>{
  let t,lab=f;
  if(f==='end'){t=tl.total;}
  else if(f.startsWith('t:')){t=+f.slice(2);}
  else{const m=/^s(\\d+):(end|[\\d.]+)$/.exec(f);if(!m){__errors.push('bad frame '+f);return;}const s=tl.steps[+m[1]-1];if(!s){__errors.push('no step '+m[1]);return;}
    t=m[2]==='end'?s.b-0.05:s.a+(s.b-s.a)*(+m[2]);lab=f+'  '+s.say;}
  const d=document.createElement('div');d.className='f';d.innerHTML='<b>'+lab.replace(/</g,'&lt;')+'  (t='+t.toFixed(2)+')</b>';
  const h=document.createElement('div');d.appendChild(h);g.appendChild(d);
  const c=BLUEPRINT.mount(h,spec,{play:'still',controls:false,font:false,paper:${JSON.stringify(args.paper || '')}||undefined});
  c.seek(t);
});
</script>`;

const dir = mkdtempSync(join(tmpdir(), 'bp-frames-'));
const file = join(dir, 'sheet.html');
writeFileSync(file, page);
const browser = await playwright.chromium.launch();
const pg = await browser.newPage({ viewport: { width: cols * (width + 14) + 32, height: 800 }, deviceScaleFactor: 1 });
const consoleErrors = [];
pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push(m.text()); });
pg.on('pageerror', e => consoleErrors.push(String(e)));
await pg.goto(pathToFileURL(file).href);
await pg.waitForTimeout(300);
const report = await pg.evaluate(() => ({ ...window.__report, runtime: window.__errors }));
await pg.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`sheet: ${out}`);
console.log(`steps: ${report.steps}, length: ${report.total?.toFixed(1)} s`);
for (const e of [...(report.errors || []), ...(report.runtime || []), ...consoleErrors]) console.log('ERROR ' + e);
for (const w of report.warnings || []) console.log('warn  ' + w);
process.exit((report.errors || []).length || (report.runtime || []).length ? 1 : 0);
