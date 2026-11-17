#!/usr/bin/env node
// Build the showcase: every scene in examples/small and examples/complex on one
// self-contained page (runtime and scenes inlined).
//
//   node gallery/build.mjs                      -> gallery/index.html
//   node gallery/build.mjs --fragment out.html  -> body-only page (for hosts that add their own <head>)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..');
const require = createRequire(import.meta.url);
const BP = require(join(root, 'runtime/blueprint.js'));
const args = process.argv.slice(2), fragOut = args[args.indexOf('--fragment') + 1];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ORDER = {
  small: ['cache', 'debounce', 'rate-limit', 'queue', 'call-stack', 'hash-map', 'retry-backoff', 'load-balancer', 'db-index', 'mutex'],
  complex: ['url', 'git-merge', 'oauth', 'transaction-log', 'cdn', 'event-loop', 'kafka', 'circuit-breaker', 'compiler', 'llm', 'emudhra']
};
function load(group) {
  const dir = join(root, 'examples', group);
  const files = readdirSync(dir).filter(f => f.endsWith('.js'));
  const rank = n => { const i = ORDER[group].indexOf(n); return i < 0 ? 99 : i; };
  return files.sort((a, b) => rank(a.slice(0, -3)) - rank(b.slice(0, -3)) || a.localeCompare(b)).map(f => {
    const code = readFileSync(join(dir, f), 'utf8'), got = [];
    vm.runInNewContext(code, { BLUEPRINT: { scene: (id, spec) => got.push([id, spec]) } });
    const [id, spec] = got[0], tl = BP.compile(spec);
    return { id, spec, code, file: relative(root, join(dir, f)), steps: tl.steps.length, secs: Math.round(tl.total), first: tl.steps[0] ? tl.steps[0].say : '' };
  });
}
const small = load('small'), complex = load('complex');
const runtime = readFileSync(join(root, 'runtime/blueprint.js'), 'utf8');

const card = (s, i, group) => `
      <article class="card" id="${esc(s.id)}">
        <header class="card-h">
          <span class="fig">FIG. ${i + 1}</span>
          <h3>${esc(s.spec.title)}</h3>
          <span class="meta">${s.steps} steps · ${s.secs} s</span>
        </header>
        <blueprint-scene scene="${esc(s.id)}" play="view"></blueprint-scene>
        <p class="file"><code>${esc(s.file)}</code>${s.spec.sources ? ` · Sources: ${s.spec.sources.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`).join(', ')}` : ''}</p>
      </article>`;

const body = `<title>Blueprint Scenes</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@400;500&display=swap">
<style>
/* Layout: drawing-office catalogue. Masthead with install line, then two drawers of sheets:
   small scenes two to a row, complex scenes one to a row at full width. */
:root{
  --bg:#e9edf2; --surface:#f6f8fb; --fg:#162133; --muted:#5a6578; --line:#cdd5df; --accent:#9a6a00; --sheet:#1d4b8a;
  --display:'IBM Plex Sans Condensed','Arial Narrow',Arial,sans-serif;
  --body:'IBM Plex Sans','Helvetica Neue',Arial,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0c1420;--surface:#121c2b;--fg:#e3eaf4;--muted:#93a1b5;--line:#243247;--accent:#ffcf4a;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0c1420;--surface:#121c2b;--fg:#e3eaf4;--muted:#93a1b5;--line:#243247;--accent:#ffcf4a;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--fg);font:15px/1.55 var(--body)}
.wrap{max-width:1240px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:40px 80px}
.mast{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:28px 48px;align-items:end;padding-bottom:28px;border-bottom:1.5px solid var(--fg)}
.eyebrow{font:500 12px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 0 14px}
h1{font:700 clamp(44px,7vw,84px)/.92 var(--display);letter-spacing:-.01em;margin:0}
.lede{margin:16px 0 0;max-width:56ch;font-size:16px;color:var(--muted)}
.lede b{color:var(--fg);font-weight:500}
.use{font:400 13px/1.7 var(--mono);background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:14px 16px;margin:0;overflow-x:auto;white-space:pre}
.use .c{color:var(--muted)}
.use .k{color:var(--accent)}
nav.jump{display:flex;gap:18px;margin:22px 0 0;font:500 12px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase}
nav.jump a{color:var(--fg);text-decoration:none;border-bottom:1px solid var(--line);padding-bottom:4px}
nav.jump a:hover{border-color:var(--accent)}
section{margin-top:52px}
.sec-h{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin:0 0 22px}
.sec-h h2{font:700 30px/1 var(--display);margin:0}
.sec-h p{margin:0;color:var(--muted);font-size:14px}
.grid{display:grid;gap:40px 32px}
.grid.small{grid-template-columns:repeat(2,minmax(0,1fr))}
.grid.complex{grid-template-columns:minmax(0,1fr);max-width:1000px}
.card{min-width:0;display:flex;flex-direction:column;gap:10px}
.card-h{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.fig{font:500 11px/1 var(--mono);letter-spacing:.12em;color:var(--accent)}
.card-h h3{font:600 20px/1.2 var(--display);margin:0}
.meta{margin-left:auto;font:400 12px/1 var(--mono);color:var(--muted)}
.file{margin:0;font:400 12px/1.6 var(--mono);color:var(--muted)}
.file code{font:inherit}
.file a{color:var(--muted);text-underline-offset:3px}
.file a:hover{color:var(--fg)}
blueprint-scene{color:var(--fg)}
footer{margin-top:64px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:13px;max-width:80ch}
@media (max-width:860px){.mast{grid-template-columns:minmax(0,1fr)}.grid.small{grid-template-columns:minmax(0,1fr)}}
</style>
<div class="wrap">
  <header class="mast">
    <div>
      <p class="eyebrow">A Claude Code skill · 20 example sheets</p>
      <h1>/blueprint</h1>
      <p class="lede">Animated explainers drawn like a patent sheet. The drawing starts empty and <b>each part is drawn in because the last one fell short</b>. Parts are numbered with leader lines, things travel along the lines, and one plain caption tells the story.</p>
      <nav class="jump" aria-label="Sections"><a href="#small">Small · ${small.length}</a><a href="#complex">Complex · ${complex.length}</a></nav>
    </div>
    <pre class="use"><span class="c"># ask your agent</span>
<span class="k">/blueprint</span> how a cache works
<span class="k">/blueprint</span> our signup flow, for the docs
<span class="k">/blueprint</span> why the retry storm took us down

<span class="c"># check it, then ship it</span>
node scripts/check.mjs scene.js
node scripts/build.mjs scene.js --out scene.html</pre>
  </header>

  <section id="small" aria-labelledby="small-h">
    <div class="sec-h"><h2 id="small-h">Small</h2><p>One mechanism, one sheet, three to six steps.</p></div>
    <div class="grid small">${small.map((s, i) => card(s, i, 'small')).join('')}
    </div>
  </section>

  <section id="complex" aria-labelledby="complex-h">
    <div class="sec-h"><h2 id="complex-h">Complex</h2><p>Seven to ten steps. The camera follows the action and pulls back for the summary.</p></div>
    <div class="grid complex">${complex.map((s, i) => card(s, i + small.length, 'complex')).join('')}
    </div>
  </section>

  <footer>Each sheet plays once when it scrolls into view and then holds the finished drawing. Click a sheet to pause, use the arrows to step through, or the bar of dots to jump to a step. With reduced motion turned on you see the finished sheets.</footer>
</div>
<script>${runtime}</script>
${[...small, ...complex].map(s => `<script>${s.code}</script>`).join('\n')}
`;

writeFileSync(join(here, 'index.html'), `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head><body>\n${body}\n</body></html>\n`);
if (fragOut) writeFileSync(resolve(fragOut), body);
console.log(`gallery: ${small.length} small, ${complex.length} complex -> ${join(here, 'index.html')}${fragOut ? ' and ' + resolve(fragOut) : ''}`);
