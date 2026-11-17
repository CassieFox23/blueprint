#!/usr/bin/env node
// Turn one or more scene files into a standalone HTML page with the runtime
// inlined, ready to open, host or attach.
//
//   node scripts/build.mjs examples/small/cache.js --out cache.html
//   node scripts/build.mjs a.js b.js --out explainers.html --title "How our API works" --play view --paper linen
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), files = [], opt = {};
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[++i]; else files.push(argv[i]); }
if (!files.length) { console.error('usage: build.mjs scene.js [more.js] [--out page.html] [--title "…"] [--play loop|view|click|still] [--paper blue|linen]'); process.exit(2); }

const runtime = readFileSync(resolve(here, '../runtime/blueprint.js'), 'utf8');
const scenes = files.map(f => {
  const code = readFileSync(resolve(f), 'utf8'), ids = [];
  vm.runInNewContext(code, { BLUEPRINT: { scene: (id, spec) => ids.push([id, spec]) } });
  return { code, ids };
});
const all = scenes.flatMap(s => s.ids);
const title = opt.title || (all.length === 1 ? all[0][1].title : 'Blueprints');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const play = opt.play || 'loop', paper = opt.paper ? ` paper="${esc(opt.paper)}"` : '';

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--bg:#eef1f5;--fg:#1c2433;--muted:#5d6676}
@media (prefers-color-scheme:dark){:root{--bg:#0e1622;--fg:#e4ebf5;--muted:#9aa6b8}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 'IBM Plex Mono',ui-monospace,Menlo,monospace}
main{max-width:980px;margin:0 auto;padding:40px max(16px,env(safe-area-inset-right)) 64px max(16px,env(safe-area-inset-left));display:grid;gap:56px}
h1{font-size:20px;letter-spacing:.06em;text-transform:uppercase;margin:0}
h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 10px;font-weight:500}
</style></head><body><main>
${all.length > 1 ? `<h1>${esc(title)}</h1>` : ''}
${all.map(([id, s]) => `<section>${all.length > 1 ? `<h2>${esc(s.title || id)}</h2>` : ''}<blueprint-scene scene="${esc(id)}" play="${esc(play)}"${paper} key></blueprint-scene></section>`).join('\n')}
</main>
<script>${runtime}</script>
${scenes.map(s => `<script>${s.code}</script>`).join('\n')}
</body></html>`;

const out = resolve(opt.out || (all.length === 1 ? `${all[0][0]}.html` : 'blueprints.html'));
writeFileSync(out, html);
console.log(`wrote ${out} (${all.length} scene${all.length > 1 ? 's' : ''}, ${(html.length / 1024).toFixed(0)} KB)`);
