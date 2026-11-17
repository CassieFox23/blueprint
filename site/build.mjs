#!/usr/bin/env node
// Build the product site: one page, every example live.
//   node site/build.mjs [--repo owner/name]  ->  site/dist/index.html (+ site/dist/img)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..');
const require = createRequire(import.meta.url);
const BP = require(join(root, 'runtime/blueprint.js'));
const argv = process.argv.slice(2);
const REPO = argv.includes('--repo') ? argv[argv.indexOf('--repo') + 1] : 'intincrab/blueprint';
const GH = `https://github.com/${REPO}`;
const INSTALL = `npx skills add ${REPO}`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// order, the prompt that makes each sheet, and words a visitor might type for it
const META = {
  cache: ['how a cache works', 'cache caching memoize redis memcached fast slow lookup'],
  debounce: ['debouncing a search box', 'debounce typing search box keystroke input'],
  'rate-limit': ['a token bucket rate limiter', 'rate limit limiter throttle token bucket 429'],
  queue: ['how a job queue absorbs a burst', 'queue job worker burst background sqs'],
  'call-stack': ['the call stack', 'stack call function recursion frame'],
  'hash-map': ['how a hash map finds a key', 'hash map dictionary object bucket key'],
  'retry-backoff': ['retries with exponential backoff', 'retry retries backoff exponential storm'],
  'load-balancer': ['a round-robin load balancer', 'load balancer balancing round robin nginx scale'],
  'db-index': ['why a database index is fast', 'index database sql query scan'],
  mutex: ['a mutex and a lost update', 'mutex lock race condition thread concurrency'],
  emudhra: ['the eMudhra key compromise, for people who are not engineers', 'emudhra breach certificate tls ssl https key compromise security padlock'],
  url: ['what happens when you open a web page', 'url browser dns website web page https request'],
  'git-merge': ['branching and merging in git', 'git branch merge conflict commit'],
  oauth: ['“Sign in with Google”', 'oauth login sign google sso token auth'],
  'transaction-log': ['transactions and the write-ahead log', 'transaction wal write ahead log crash database commit'],
  cdn: ['a CDN, including purges', 'cdn edge cloudflare purge cache'],
  'event-loop': ['the JavaScript event loop', 'event loop javascript js async promise settimeout callback'],
  kafka: ['partitions and consumer groups in Kafka', 'kafka stream partition consumer offset event log'],
  'circuit-breaker': ['a circuit breaker between services', 'circuit breaker microservice timeout fail fast'],
  compiler: ['how a compiler works', 'compiler compile parser lexer ast code'],
  llm: ['how a language model writes, one token at a time', 'llm gpt ai language model token transformer attention chatgpt claude']
};
const ORDER = Object.keys(META);

const scenes = [];
for (const group of ['small', 'complex']) {
  for (const f of readdirSync(join(root, 'examples', group)).filter(f => f.endsWith('.js'))) {
    const code = readFileSync(join(root, 'examples', group, f), 'utf8'), got = [];
    vm.runInNewContext(code, { BLUEPRINT: { scene: (id, spec) => got.push([id, spec]) } });
    const [id, spec] = got[0], L = BP.layout(spec), tl = BP.compile(spec, L);
    const m = META[id] || [spec.title.toLowerCase(), ''];
    scenes.push({
      id, group, file: `examples/${group}/${f}`, code, title: spec.title, steps: tl.steps.map(s => s.say), secs: Math.round(tl.total),
      parts: L.order.length, lines: Object.keys(L.lines).length, paper: spec.paper || 'blue', sources: spec.sources || null,
      prompt: m[0], words: (m[1] + ' ' + spec.title).toLowerCase()
    });
  }
}
const rank = id => { const i = ORDER.indexOf(id); return i < 0 ? 99 : i; };
scenes.sort((a, b) => rank(a.id) - rank(b.id));
const small = scenes.filter(s => s.group === 'small'), complex = scenes.filter(s => s.group === 'complex');
const runtime = readFileSync(join(root, 'runtime/blueprint.js'), 'utf8');
const meta = scenes.map(({ code, ...m }) => m);
const sources = Object.fromEntries(scenes.map(s => [s.id, s.code]));
const chips = [['a cache', 'cache'], ['the eMudhra breach', 'emudhra'], ['the event loop', 'event-loop'], ['Sign in with Google', 'oauth'], ['how an LLM writes', 'llm'], ['git merge', 'git-merge']];

const card = s => `<a class="card${s.id === 'emudhra' ? ' feature' : ''}" href="#${esc(s.id)}" data-group="${s.group}" data-id="${esc(s.id)}" data-words="${esc(s.words)}">
        <div class="thumb"><span class="dur">▶ ${s.secs} s</span></div>
        <div class="card-t"><h3>${esc(s.title)}${s.sources ? '<span class="tag">News</span>' : ''}</h3><span class="m">${s.steps.length} steps</span></div>
${s.id === 'emudhra' ? `        <p class="card-l">In October 2026, eight signing keys at a certificate authority turned out to be tiny numbers. One of them was 4. Drawn from the coverage, for people who are not engineers.</p>\n` : ''}        <p class="card-p">/blueprint ${esc(s.prompt)}</p>
      </a>`;
const codeBox = (html, copy) => `<div class="code"><pre><code>${html}</code></pre>${copy ? `<button class="copy" type="button" data-copy="${esc(copy)}">Copy</button>` : ''}</div>`;

const body = `<title>Blueprint</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27%3E%3Crect width=%2716%27 height=%2716%27 rx=%274%27 fill=%27%231d4b8a%27/%3E%3Crect x=%274.5%27 y=%274.5%27 width=%277%27 height=%277%27 fill=%27none%27 stroke=%27%23eaf2ff%27 stroke-width=%271.3%27/%3E%3C/svg%3E">
<meta name="description" content="A skill for Claude Code that answers how-it-works questions with animated explainers drawn like patent sheets.">
<meta property="og:title" content="Blueprint · explainers drawn like a patent">
<meta property="og:description" content="Ask how something works. Claude draws the answer part by part on blueprint paper.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
/* Layout: one column, 1080 wide. Hero text, then a live sheet you can ask; three steps;
   a grid of every example (hover plays, click opens a viewer); install; one-line footer.
   The page is neutral so the blue sheets carry the colour. */
:root{
  --bg:#ffffff; --bg2:#f1f4f8; --fg:#0d1b2e; --muted:#51607a; --faint:#8492a8; --line:#e0e5ee; --line2:#c5cedb; color-scheme:light;
  --serif:'Instrument Serif','Iowan Old Style',Georgia,serif; --blue-ink:#eaf2ff; --blue-soft:#bdd0ee;
  --blue:#1d4b8a; --yel:#ffcf4a; --btn:#1d4b8a; --btn-ink:#ffffff;
  --sans:'Instrument Sans',system-ui,-apple-system,'Segoe UI',sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace;
  --ease:cubic-bezier(.2,.7,.2,1);
}
*{box-sizing:border-box}
[hidden]{display:none!important}
html{scroll-behavior:smooth;scroll-padding-top:84px}
body{margin:0;background:var(--bg);color:var(--fg);font:400 16px/1.6 var(--sans);-webkit-font-smoothing:antialiased}
a{color:inherit}
button{font:inherit;color:inherit;cursor:pointer}
h1,h2,h3,p{margin:0}
code,pre{font-family:var(--mono)}
:focus-visible{outline:2px solid var(--blue);outline-offset:3px;border-radius:6px}
.wrap{max-width:1120px;margin:0 auto;padding-inline:max(20px,env(safe-area-inset-left,0px)) max(20px,env(safe-area-inset-right,0px))}

.bar{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 86%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid transparent;transition:border-color .2s}
.bar.stuck{border-bottom-color:var(--line)}
.nav{display:flex;align-items:center;gap:24px;padding-block:14px}
.nav-cta{border:0;border-radius:9px;background:var(--btn);color:var(--btn-ink);font-weight:500;font-size:13.5px;line-height:1;padding:10px 13px;margin-left:6px;opacity:0;visibility:hidden;transform:translateY(4px);transition:opacity .2s,transform .2s var(--ease),visibility .2s}
.bar.past .nav-cta{opacity:1;visibility:visible;transform:none}
.nav .links a[aria-current=true]{color:var(--fg)}
.mark{display:flex;align-items:center;gap:9px;font-weight:600;font-size:17px;letter-spacing:-.02em;text-decoration:none}
.mark i{width:16px;height:16px;border-radius:4px;background:#1d4b8a;position:relative;display:block}
.mark i::after{content:"";position:absolute;inset:4px;border:1.3px solid #eaf2ff;border-radius:1px}
.nav .links{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:14.5px}
.nav .links a{text-decoration:none;color:var(--muted);padding:8px 10px;border-radius:8px;transition:color .15s,background-color .15s}
.nav .links a:hover{color:var(--fg);background:var(--bg2)}

.hero{padding-block:clamp(40px,7vw,88px) 0}
h1{font-weight:600;font-size:clamp(40px,6.2vw,76px);line-height:1;letter-spacing:-.04em;max-width:13ch;text-wrap:balance}
.sub{margin-top:22px;font-size:clamp(17px,1.5vw,19.5px);line-height:1.5;color:var(--muted);max-width:54ch}
.acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:30px}
.cmd{display:inline-flex;align-items:center;gap:14px;height:48px;padding:0 6px 0 16px;border:0;border-radius:11px;background:var(--btn);color:var(--btn-ink);font:400 14px/1 var(--mono);max-width:100%;min-width:0;transition:transform .15s var(--ease)}
.cmd:active{transform:scale(.985)}
.cmd span.t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.cmd span.t::before{content:"$ ";opacity:.5}
.cmd .k{font:500 12.5px/1 var(--sans);padding:10px 11px;border-radius:7px;background:color-mix(in srgb,var(--btn-ink) 16%,transparent);flex:none}
.ghost{display:inline-flex;align-items:center;height:48px;padding:0 18px;border:1px solid var(--line2);border-radius:11px;text-decoration:none;font-weight:500;font-size:15px;transition:border-color .15s,background-color .15s}
.ghost:hover{border-color:var(--fg)}
.after{margin-top:14px;font-size:14.5px;color:var(--muted);display:flex;gap:8px;align-items:center;animation:rise .3s var(--ease)}
.after::before{content:"";width:8px;height:8px;border-radius:50%;background:#2fa56a;flex:none}
.after code{font-size:13px;color:var(--fg)}
@keyframes rise{from{opacity:0;transform:translateY(6px)}}
.fig{font:500 12px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-bottom:16px}
.note{font-size:13.5px;color:var(--faint)}
.pwrap{position:relative}
.sug{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:5;margin:0;padding:6px;list-style:none;background:var(--bg);border:1px solid var(--line2);border-radius:12px;box-shadow:0 18px 40px -16px rgba(0,0,0,.35);animation:rise .16s var(--ease)}
.sug li{display:flex;justify-content:space-between;gap:12px;padding:9px 10px;border-radius:8px;font-size:15px;cursor:pointer}
.sug li span{color:var(--faint);font-size:13px;white-space:nowrap}
.sug li[aria-selected=true],.sug li:hover{background:var(--bg2)}
.sug li.none{cursor:default;color:var(--muted);display:block}
.sug li.none:hover{background:transparent}

.demo{margin-top:clamp(40px,6vw,64px);background:var(--bg2);border:1px solid var(--line);border-radius:18px;padding:clamp(12px,2vw,20px);display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
.prompt{display:flex;align-items:center;gap:10px;background:var(--bg);border:1px solid var(--line2);border-radius:12px;padding:5px 5px 5px 14px;transition:border-color .15s,box-shadow .15s}
.prompt:focus-within{border-color:var(--blue);box-shadow:0 0 0 3px color-mix(in srgb,var(--blue) 18%,transparent)}
.prompt label{font:500 14px/1 var(--mono);color:var(--blue);white-space:nowrap}
.prompt input{flex:1;min-width:0;border:0;background:transparent;color:var(--fg);font:400 16px/1.2 var(--sans);padding:10px 0;outline:none}
.prompt input::placeholder{color:var(--faint)}
.prompt button{border:0;border-radius:8px;background:var(--btn);color:var(--btn-ink);font-weight:500;font-size:14px;padding:10px 16px;transition:transform .12s}
.prompt button:active{transform:scale(.96)}
.chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.chips span{font-size:13.5px;color:var(--faint);margin-right:4px}
.chips button{border:1px solid var(--line);background:var(--bg);border-radius:999px;font-size:13.5px;line-height:1;padding:8px 12px;color:var(--muted);transition:color .15s,border-color .15s,background-color .15s}
.chips button:hover{color:var(--fg);border-color:var(--line2)}
.chips button[aria-pressed=true]{background:var(--fg);border-color:var(--fg);color:var(--bg)}
.miss{font-size:14px;color:var(--muted);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.miss code{background:var(--bg);border:1px solid var(--line);border-radius:7px;padding:5px 8px;font-size:13px;color:var(--fg)}
.miss button{border:0;background:transparent;color:var(--blue);font-weight:500;font-size:14px;padding:4px}
#hero-sheet{transition:opacity .2s;color:var(--muted);min-height:200px}
#hero-sheet.swap{opacity:0}
.bp-svg{border-radius:10px}
.bp-bar{font-family:var(--sans)!important;letter-spacing:0!important;font-size:13.5px!important;color:var(--muted)}
.bp-bar button{border-radius:8px!important;border-color:var(--line2)!important;transition:color .15s,border-color .15s}
.bp-bar button:hover{color:var(--fg);border-color:var(--fg)!important}
.bp-bar [data-a=play]{text-transform:lowercase;min-width:64px;text-align:center}
.bp-bar [data-a=play]::first-letter{text-transform:uppercase}
.bp-dots button{border:0!important}
.bp-key{font-family:var(--sans)!important;font-size:14px!important}

section{padding-top:clamp(72px,10vw,120px)}
h2{font-weight:600;font-size:clamp(28px,3.6vw,40px);line-height:1.08;letter-spacing:-.03em;text-wrap:balance}
.lede{margin-top:12px;color:var(--muted);max-width:58ch;font-size:17px}
.chain{list-style:none;margin:36px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.chain li{border-top:2px solid var(--line2);padding-top:14px;font-size:16px;line-height:1.4;min-width:0}
.chain li:first-child{border-top-color:var(--blue)}
.chain b{display:block;font:500 12.5px/1 var(--mono);color:var(--blue);margin-bottom:8px}
.how{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:28px}
.how>div{background:var(--bg2);border-radius:14px;padding:22px;min-width:0;display:flex;flex-direction:column;gap:8px}
.how h3{font-weight:600;font-size:18px;letter-spacing:-.015em}
.how p{color:var(--muted);font-size:15px;flex:1}
.how code{margin-top:8px;font-size:12.5px;color:var(--fg);background:var(--bg);border-radius:8px;padding:8px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.ex-h{display:flex;align-items:end;justify-content:space-between;gap:20px;flex-wrap:wrap}
.seg{display:inline-flex;background:var(--bg2);border-radius:11px;padding:4px}
.seg button{border:0;background:transparent;border-radius:8px;padding:9px 14px;font-weight:500;font-size:14px;line-height:1;color:var(--muted);display:flex;gap:7px;transition:color .15s,background-color .15s}
.seg button span{color:var(--faint);font-weight:400}
.seg button:hover{color:var(--fg)}
.seg button[aria-pressed=true]{background:var(--bg);color:var(--fg);box-shadow:0 1px 2px rgba(0,0,0,.1)}
.tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.find{height:42px;width:220px;max-width:100%;border:1px solid var(--line2);border-radius:11px;background:var(--bg);color:var(--fg);font:400 15px/1 var(--sans);padding:0 12px;outline:none;transition:border-color .15s,box-shadow .15s}
.find::placeholder{color:var(--faint)}
.find:focus{border-color:var(--blue);box-shadow:0 0 0 3px color-mix(in srgb,var(--blue) 18%,transparent)}
.none{margin-top:32px;background:var(--bg2);border-radius:14px;padding:28px;display:grid;gap:12px;justify-items:start}
.none p{color:var(--muted)}
.none .code{width:100%;max-width:520px}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:36px 20px;margin-top:32px}
.dur{position:absolute;z-index:2;right:8px;bottom:8px;background:rgba(8,12,20,.8);color:#fff;font-size:12px;line-height:1;padding:5px 7px;border-radius:6px;font-variant-numeric:tabular-nums;pointer-events:none;transition:opacity .2s}
.card:hover .dur{opacity:0}
.card{display:flex;flex-direction:column;gap:11px;text-decoration:none;min-width:0}
.card[hidden]{display:none}
.thumb{position:relative;border-radius:12px;overflow:hidden;aspect-ratio:672/416;background:#1d4b8a;transition:transform .25s var(--ease),box-shadow .25s var(--ease)}
.thumb .bp-svg{border-radius:0;cursor:pointer}
.card:hover .thumb,.card:focus-visible .thumb{transform:translateY(-3px);box-shadow:0 14px 30px -12px rgba(13,30,60,.45)}
.card-t{display:flex;align-items:baseline;gap:12px}
.card-t h3{font-weight:500;font-size:16px;line-height:1.35;letter-spacing:-.01em;min-width:0}
.card-t .m{margin-left:auto;font-size:13px;color:var(--faint);white-space:nowrap;font-variant-numeric:tabular-nums}
.card-p{margin-top:-7px;font:400 12.5px/1.5 var(--mono);color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tag{display:inline-block;margin-left:8px;font-size:11px;font-weight:600;line-height:1;padding:4px 6px;border-radius:5px;background:var(--yel);color:#231a00;vertical-align:2px}

.inst{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:36px}
.box{background:var(--bg2);border-radius:14px;padding:22px;min-width:0}
.box h3{font-weight:600;font-size:17px;letter-spacing:-.015em}
.box p{color:var(--muted);font-size:15px;margin:4px 0 14px}
.code{position:relative}
.code pre{margin:0;background:var(--bg);border-radius:10px;padding:14px 16px;font-size:13px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere}
.code .c{color:var(--faint)}.code .k{color:var(--blue)}
.copy{position:absolute;top:8px;right:8px;border:1px solid var(--line);background:var(--bg2);border-radius:7px;font-size:12.5px;font-weight:500;line-height:1;padding:8px 10px;color:var(--muted);transition:color .15s,border-color .15s}
.copy:hover{color:var(--fg);border-color:var(--line2)}
.code:has(.copy) pre{padding-right:76px}

footer{margin-top:clamp(72px,10vw,120px);border-top:1px solid var(--line);padding-block:26px 44px;display:flex;gap:12px 32px;flex-wrap:wrap;justify-content:space-between;color:var(--muted);font-size:14px}
footer p{max-width:70ch}
footer a{color:var(--fg);text-decoration:none}
footer a:hover{text-decoration:underline;text-underline-offset:3px}

dialog{border:0;padding:0;width:min(1200px,calc(100vw - 32px));max-width:none;max-height:calc(100dvh - 32px);border-radius:18px;background:var(--bg);color:var(--fg);box-shadow:0 30px 90px rgba(0,0,0,.4);overflow:hidden}
dialog::backdrop{background:rgba(6,9,14,.6)}
dialog[open]{animation:pop .25s var(--ease)}
@keyframes pop{from{opacity:0;transform:translateY(10px) scale(.985)}}
.vw{display:grid;grid-template-columns:minmax(0,1fr) 350px;max-height:calc(100dvh - 32px)}
.vw-scene{padding:20px;background:var(--bg2);min-width:0;overflow:auto;color:var(--muted)}
.vw-side{padding:20px 20px 24px;display:flex;flex-direction:column;gap:18px;overflow:auto;min-width:0}
.vw-top{display:flex;gap:8px;align-items:start}
.vw-top h2{font-size:24px;line-height:1.15}
.vw-top p{font-size:13.5px;color:var(--muted);margin-top:6px}
.vw-top .sp{margin-left:auto}
.ib{flex:none;width:36px;height:36px;border:1px solid var(--line);background:var(--bg);border-radius:9px;color:var(--muted);font-size:16px;line-height:1;transition:color .15s,border-color .15s}
.ib:hover{color:var(--fg);border-color:var(--line2)}
.vw-ask{position:relative}
.vw-ask pre{margin:0;background:var(--bg2);border-radius:10px;padding:12px 76px 12px 14px;font-size:13px;line-height:1.5;white-space:pre-wrap}
.vw-steps{margin:0;padding:0;list-style:none;display:grid;gap:2px;counter-reset:s}
.vw-steps button{all:unset;box-sizing:border-box;display:grid;grid-template-columns:22px 1fr;width:100%;padding:8px 10px;border-radius:9px;font-size:14.5px;line-height:1.45;color:var(--muted);cursor:pointer;transition:background-color .12s,color .12s}
.vw-steps button::before{counter-increment:s;content:counter(s);font-size:12.5px;line-height:1.7;color:var(--faint);font-variant-numeric:tabular-nums}
.vw-steps button:hover,.vw-steps button[aria-current=step]{background:var(--bg2);color:var(--fg)}
.vw-steps button:focus-visible{outline:2px solid var(--blue);outline-offset:-2px}
.vw-acts{display:flex;gap:8px;flex-wrap:wrap}
.vw-acts button,.vw-acts a{border:1px solid var(--line2);background:var(--bg);border-radius:9px;font-size:13.5px;font-weight:500;line-height:1;padding:11px 13px;text-decoration:none;transition:border-color .15s}
.vw-acts button:hover,.vw-acts a:hover{border-color:var(--fg)}
.vw-src,.vw-hint{font-size:13px;color:var(--faint)}
.vw-src a{color:var(--muted)}

@media (max-width:980px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.vw{display:flex;flex-direction:column;gap:16px;overflow:auto}.vw-side{display:contents}.vw-top{order:0;padding:16px 16px 0}.vw-scene{order:1;overflow:visible;flex:none}.vw-side>*:not(.vw-top){order:2;margin-inline:16px}.vw-acts{padding-bottom:20px}.vw-hint{display:none}}
@media (max-width:860px){.chain{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:720px){.how,.inst{grid-template-columns:minmax(0,1fr)}.tools{width:100%}.find{flex:1;width:auto}.nav .links a.hide-s{display:none}}
@media (max-width:560px){.grid{grid-template-columns:minmax(0,1fr)}.cmd,.ghost{width:100%}.ghost{justify-content:center}.cmd{justify-content:space-between}.chips span{display:none}.chain{grid-template-columns:minmax(0,1fr)}.nav-cta{display:none}dialog{width:100vw;max-height:100dvh;height:100dvh;border-radius:0}.vw{max-height:100dvh}.vw-scene{padding:10px}.vw-scene .bp-key{display:none}.prompt label{display:none}.prompt{padding-left:12px}}
@media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}*{transition:none!important;animation:none!important}.js [data-rise]{opacity:1;transform:none}}

/* ===== revamp: light paper, blueprint-blue fields, serif display ===== */
.grid-bg{}
.bar{background:var(--blue);color:#fff;-webkit-backdrop-filter:none;backdrop-filter:none;transition:background-color .25s,color .25s,border-color .25s}
.bar .links a{color:var(--blue-soft)}
.bar .links a:hover{color:#fff;background:rgba(255,255,255,.12)}
.bar .links a[aria-current=true]{color:#fff}
.mark i{background:#fff}.mark i::after{border-color:var(--blue)}
.bar.stuck{background:rgba(255,255,255,.9);color:var(--fg);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.bar.stuck .links a{color:var(--muted)}
.bar.stuck .links a:hover{color:var(--fg);background:var(--bg2)}
.bar.stuck .links a[aria-current=true]{color:var(--fg)}
.bar:not(.stuck) .nav-cta{background:var(--yel);color:#1a1300}
.bar.stuck .mark i{background:var(--blue)}.bar.stuck .mark i::after{border-color:#eaf2ff}

.hero{background-color:var(--blue);background-image:linear-gradient(rgba(255,255,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.055) 1px,transparent 1px);background-size:24px 24px;color:#fff;padding-block:clamp(36px,6vw,84px) clamp(48px,7vw,96px)}
.hero .fig{color:var(--blue-soft)}
h1{font-family:var(--serif);font-weight:400;font-size:clamp(54px,10.5vw,148px);line-height:.9;letter-spacing:-.025em;max-width:none}
h1 em{font-style:italic;color:var(--yel);display:block}
.hero .sub{color:#d9e5f8;max-width:52ch}
.hero .cmd{background:var(--yel);color:#1a1300}
.hero .cmd .k{background:rgba(26,19,0,.14)}
.hero .ghost{border-color:rgba(255,255,255,.45);color:#fff}
.hero .ghost:hover{border-color:#fff;background:rgba(255,255,255,.08)}
.hero .after{color:var(--blue-ink)}.hero .after code{color:#fff}
.hero .demo{background:transparent;border:0;border-radius:0;padding:0;margin-top:clamp(40px,6vw,72px)}
.hero .prompt{border-color:transparent;background:#fff;box-shadow:0 12px 30px -18px rgba(0,0,0,.6)}
.hero .prompt:focus-within{border-color:transparent;box-shadow:0 0 0 3px var(--yel)}
.hero .prompt button{background:var(--fg);color:#fff}
.hero .chips span,.hero .note{color:var(--blue-soft)}
.hero .chips button{background:transparent;border-color:rgba(255,255,255,.32);color:#e3ecfa}
.hero .chips button:hover{border-color:#fff;color:#fff}
.hero .chips button[aria-pressed=true]{background:#fff;border-color:#fff;color:var(--blue)}
.hero .miss{color:#fff}.hero .miss code{background:rgba(0,0,0,.25);border:0;color:#fff}.hero .miss button{color:var(--yel)}
#hero-sheet{color:var(--blue-ink)}
#hero-sheet .bp-svg{box-shadow:0 40px 80px -40px rgba(0,0,0,.65)}
.hero .bp-bar{color:var(--blue-ink)}
.hero .bp-bar button{border-color:rgba(255,255,255,.35)!important}
.hero .bp-bar button:hover{color:#fff;border-color:#fff!important}

h2{font-family:var(--serif);font-weight:400;font-size:clamp(40px,5.6vw,72px);line-height:.98;letter-spacing:-.02em}
.lede{font-size:18px}
.claim{margin-top:28px;font-family:var(--serif);font-size:clamp(28px,3.7vw,48px);line-height:1.14;letter-spacing:-.01em;max-width:24em;text-wrap:pretty}
.claim mark{background:var(--yel);color:#1a1300;font-style:italic;padding:0 .14em;border-radius:3px}
.how{margin-top:56px;gap:28px}
.how>div{background:transparent;border-radius:0;padding:18px 0 0;border-top:1.5px solid var(--fg)}
.num{font-family:var(--serif);font-size:44px;line-height:1;color:var(--blue);display:flex;align-items:center;gap:12px}
.num::after{content:"";flex:1;max-width:72px;height:1px;background:var(--line2)}
.how h3{font-size:20px;margin-top:6px}
.how code{background:var(--bg2)}

.card.feature{grid-column:span 2;grid-row:span 2}
.card.feature .card-t h3{font-family:var(--serif);font-weight:400;font-size:clamp(26px,2.8vw,36px);line-height:1.05;letter-spacing:-.01em}
.card-l{font-size:16.5px;line-height:1.5;color:var(--muted);max-width:56ch;margin-top:-4px}
.card.feature .card-p{margin-top:0}
.card-t h3{font-weight:600}
.seg{border:1px solid var(--line)}
.seg button[aria-pressed=true]{background:var(--fg);color:#fff;box-shadow:none}
.seg button[aria-pressed=true] span{color:#b9c4d6}

.tb{margin-top:40px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1.5px;background:var(--fg);border:2px solid var(--fg)}
.tb>div{background:#fff;padding:16px 18px;min-width:0;position:relative;display:grid;gap:8px;align-content:start}
.tb .lab{font:500 11.5px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
.tb code{font-size:13.5px;line-height:1.5;overflow-wrap:anywhere}
.tb b{font-weight:500;font-size:15.5px}
.tb-main{grid-column:1/-1;background:var(--yel)!important;padding:26px 24px!important;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:20px}
.tb-main .lab{grid-column:1/-1;color:#6b5200}
.tb-main code{font-size:clamp(17px,2.6vw,32px);font-weight:500;color:#1a1300;letter-spacing:-.01em}
.tb-copy{border:0;border-radius:10px;background:var(--fg);color:#fff;font-weight:500;font-size:15px;padding:14px 20px;transition:transform .12s}
.tb-copy:active{transform:scale(.96)}
.tb .w2{grid-column:span 2;padding-right:84px}
.tb .copy{top:12px;right:12px}

.foot{margin-top:clamp(80px,11vw,140px);background-color:var(--blue);background-image:linear-gradient(rgba(255,255,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.055) 1px,transparent 1px);background-size:24px 24px;color:#fff;padding-block:clamp(40px,6vw,72px) 36px;overflow:hidden;border:0;display:block}
.big{font-family:var(--serif);font-style:italic;font-size:clamp(84px,21vw,300px);line-height:.82;letter-spacing:-.03em;color:#fff;margin-left:-.04em;white-space:nowrap}
.foot-row{margin-top:clamp(28px,4vw,48px);display:flex;gap:14px 40px;flex-wrap:wrap;justify-content:space-between;font-size:14.5px;color:var(--blue-soft)}
.foot-row p{max-width:68ch}
.foot-row a{color:#fff;text-decoration:none}
.foot-row a:hover{text-decoration:underline;text-underline-offset:3px}
.vw-top h2{font-size:30px;line-height:1.05}
@media (max-width:980px){.card.feature{grid-row:auto}.tb{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.card.feature{grid-column:auto}.tb{grid-template-columns:minmax(0,1fr)}.tb .w2{grid-column:auto}.tb-main{grid-template-columns:minmax(0,1fr)}.tb-copy{justify-self:start}.how{gap:20px}}
</style>
<script>document.documentElement.classList.add('js')</script>

<div class="bar" id="bar"><div class="wrap">
  <nav class="nav" aria-label="Main">
    <a class="mark" href="#top"><i aria-hidden="true"></i>blueprint</a>
    <div class="links"><a href="#how" class="hide-s" data-nav="how">How it works</a><a href="#examples" data-nav="examples">Examples</a><a href="#install" data-nav="install">Install</a><a href="${GH}" target="_blank" rel="noopener" class="hide-s">GitHub ↗</a><button class="nav-cta" type="button" data-copy="${esc(INSTALL)}" data-install>Copy install</button></div>
  </nav>
</div></div>
<header class="hero" id="top"><div class="wrap">
    <p class="fig">A skill for Claude Code</p>
    <h1>Ask how it works. <em>Get the drawing.</em></h1>
    <p class="sub">Blueprint is a skill for Claude Code. It answers with an animated patent sheet: every part numbered, drawn in only when the last one falls short, and explained in one plain sentence.</p>
    <div class="acts">
      <button class="cmd" type="button" data-copy="${esc(INSTALL)}" data-install aria-label="Copy the install command"><span class="t">${esc(INSTALL)}</span><span class="k">Copy</span></button>
      <a class="ghost" href="${GH}" target="_blank" rel="noopener">View on GitHub</a>
    </div>

    <p class="after" id="after" role="status" hidden>Copied. Run it in a terminal, then type <code>/blueprint</code> and a question in Claude Code.</p>

    <div class="demo">
      <div class="pwrap">
        <form class="prompt" id="ask" autocomplete="off">
          <label for="q">/blueprint</label>
          <input id="q" name="q" type="text" value="how a cache works" placeholder="try: event loop, oauth, git…" role="combobox" aria-expanded="false" aria-controls="sug" aria-autocomplete="list" aria-label="Pick a topic from the examples">
          <button type="submit">Draw</button>
        </form>
        <ul class="sug" id="sug" role="listbox" hidden></ul>
      </div>
      <div class="chips" role="group" aria-label="Examples to try"><span>Try</span>${chips.map(([t, id]) => `<button type="button" data-chip="${id}" aria-pressed="${id === 'cache'}">${esc(t)}</button>`).join('')}</div>
      <div class="miss" id="miss" role="status" hidden></div>
      <div id="hero-sheet"></div>
      <p class="note">This page replays ${scenes.length} finished sheets. In Claude Code the same command draws any topic you give it.</p>
    </div>
  </div></header>

<div class="wrap">
  <section id="how" aria-labelledby="how-h" data-rise>
    <p class="fig">Fig. 1 · Method</p>
    <h2 id="how-h">Every part has to earn its place</h2>
    <p class="lede">A sheet starts with one real case and adds a part only when the last one falls short. The cache sheet above, as one sentence:</p>
    <p class="claim">The database is slow, <mark>so</mark> a drawer by the door keeps recent answers. <mark>But</mark> the first time it is empty, <mark>so</mark> it fetches once and keeps a copy.</p>
    <div class="how">
      <div><span class="num">1</span><h3>Ask</h3><p>Name a mechanism, an incident, or a flow in your own product.</p><code>/blueprint how a cache works</code></div>
      <div><span class="num">2</span><h3>Claude draws and checks</h3><p>It picks parts from a kit of 28, lays out the sheet, lints it, and looks at every frame before calling it done.</p><code>node scripts/check.mjs scene.js</code></div>
      <div><span class="num">3</span><h3>Ship it</h3><p>Put one element on a docs page, or export a single HTML file to send around.</p><code>&lt;blueprint-scene scene="cache"&gt;</code></div>
    </div>
  </section>

  <section id="examples" aria-labelledby="ex-h">
    <div class="ex-h">
      <div><p class="fig">Fig. 2 · Examples</p><h2 id="ex-h">${scenes.length} sheets made with it</h2><p class="lede">Open any sheet to play it step by step and copy its source.</p></div>
      <div class="tools"><input class="find" id="find" type="search" placeholder="Search sheets" aria-label="Search sheets">
      <div class="seg" role="group" aria-label="Filter examples">
        <button type="button" data-f="all" aria-pressed="true">All <span>${scenes.length}</span></button><button type="button" data-f="small" aria-pressed="false">Small <span>${small.length}</span></button><button type="button" data-f="complex" aria-pressed="false">Complex <span>${complex.length}</span></button>
      </div></div>
    </div>
    <div class="grid" id="grid">${[...scenes].sort((a, b) => (b.id === 'emudhra') - (a.id === 'emudhra')).map(card).join('')}</div>
    <div class="none" id="none" role="status" hidden><p id="none-p"></p><div class="code"><pre><code id="none-cmd"></code></pre><button class="copy" type="button" id="none-copy">Copy</button></div></div>
  </section>

  <section id="install" aria-labelledby="in-h" data-rise>
    <p class="fig">Fig. 3 · Install</p>
    <h2 id="in-h">Install it in one line</h2>
    <p class="lede">Blueprint is a folder with a SKILL.md. Claude Code picks it up from your skills directory.</p>
    <div class="tb">
      <div class="tb-main"><span class="lab">Install</span><code>${esc(INSTALL)}</code><button class="tb-copy" type="button" data-copy="${esc(INSTALL)}" data-install>Copy</button></div>
      <div class="tb-cell w2"><span class="lab">Or clone it</span><code>git clone ${GH}.git ~/.claude/skills/blueprint</code><button class="copy" type="button" data-copy="git clone ${GH}.git ~/.claude/skills/blueprint">Copy</button></div>
      <div class="tb-cell"><span class="lab">Then ask</span><code>/blueprint how a cache works</code></div>
      <div class="tb-cell"><span class="lab">Embed</span><code>&lt;blueprint-scene scene="cache"&gt;</code></div>
      <div class="tb-cell"><span class="lab">Drawn by</span><b>Claude Code</b></div>
      <div class="tb-cell"><span class="lab">Runtime</span><b>One file, no dependencies</b></div>
      <div class="tb-cell"><span class="lab">Needs</span><b>Node. Playwright optional</b></div>
      <div class="tb-cell"><span class="lab">Sheets</span><b>${scenes.length} examples</b></div>
    </div>
  </section>

</div>
<footer class="foot"><div class="wrap">
  <p class="big" aria-hidden="true">/blueprint</p>
  <div class="foot-row">
    <p>The look comes from Victorian patent drawings, the plain words from Thing Explainer, the part-by-part builds from Bartosz Ciechanowski, and the idea of a scene skill from Kamran Ahmed’s /stick-scene.</p>
    <a href="${GH}" target="_blank" rel="noopener">github.com/${esc(REPO)} ↗</a>
  </div>
</div></footer>

<dialog id="vw" aria-labelledby="vw-title">
  <div class="vw">
    <div class="vw-scene" id="vw-scene"></div>
    <div class="vw-side">
      <div class="vw-top"><div><h2 id="vw-title"></h2><p id="vw-meta"></p></div><span class="sp"></span><button class="ib" type="button" id="vw-prev" aria-label="Previous example">‹</button><button class="ib" type="button" id="vw-next" aria-label="Next example">›</button><button class="ib" type="button" id="vw-x" aria-label="Close">✕</button></div>
      <div class="vw-ask code"><pre><code id="vw-ask"></code></pre><button class="copy" type="button" id="vw-ask-copy">Copy</button></div>
      <ol class="vw-steps" id="vw-steps"></ol>
      <p class="vw-hint">← → move between steps · Space pauses · Esc closes</p>
      <div class="vw-acts"><button type="button" id="vw-link">Copy link</button><button type="button" id="vw-code">Copy scene file</button><a id="vw-gh" target="_blank" rel="noopener">Open on GitHub ↗</a></div>
      <p class="vw-src" id="vw-src" hidden></p>
    </div>
  </div>
</dialog>

<script>${runtime}</script>
${scenes.map(s => `<script>${s.code}</script>`).join('\n')}
<script>
(function(){
var META=${JSON.stringify(meta)};
var SRC=${JSON.stringify(sources)};
var GHB=${JSON.stringify(GH + '/blob/main/')};
var byId={};META.forEach(function(m){byId[m.id]=m;});
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var $=function(id){return document.getElementById(id);};

function copy(text,btn){
  var lab=btn.querySelector('.k')||btn,o=lab.dataset.o||(lab.dataset.o=lab.textContent);
  var done=function(){lab.textContent='Copied';setTimeout(function(){lab.textContent=o;},1400);};
  try{navigator.clipboard.writeText(text).then(done,fb);}catch(e){fb();}
  function fb(){var t=document.createElement('textarea');t.value=text;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');done();}catch(e){}t.remove();}
}
document.addEventListener('click',function(e){var b=e.target.closest('[data-copy]');if(!b)return;copy(b.getAttribute('data-copy'),b);if(b.hasAttribute('data-install'))$('after').hidden=false;});

/* entrances, sticky bar, current section */
var rio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');rio.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px'});
document.querySelectorAll('[data-rise]').forEach(function(el){rio.observe(el);});
new IntersectionObserver(function(es){$('bar').classList.toggle('past',!es[0].isIntersecting);},{rootMargin:'-60px 0px 0px 0px'}).observe(document.querySelector('.acts'));
var heroEl=$('top'),tick=0;
function barState(){tick=0;$('bar').classList.toggle('stuck',heroEl.getBoundingClientRect().bottom<56);}
window.addEventListener('scroll',function(){if(!tick)tick=requestAnimationFrame(barState);},{passive:true});barState();
var navs=[].slice.call(document.querySelectorAll('[data-nav]'));
var sio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)navs.forEach(function(a){a.setAttribute('aria-current',a.getAttribute('data-nav')===e.target.id);});});},{rootMargin:'-45% 0px -50% 0px'});
['how','examples','install'].forEach(function(id){sio.observe($(id));});

/* hero demo */
var heroHost=$('hero-sheet'),heroCtl=null,heroId=null,typing=null;
function showHero(id,replay){
  if(id===heroId){if(replay&&heroCtl){heroCtl.seek(0);heroCtl.play();}return;}
  heroId=id;
  document.querySelectorAll('[data-chip]').forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-chip')===id);});
  var first=!heroCtl;
  var swap=function(){if(heroCtl)heroCtl.destroy();heroHost.innerHTML='';heroCtl=BLUEPRINT.mount(heroHost,BLUEPRINT.scenes[id],{play:'loop'});if(first&&!reduce)heroCtl.seek(heroCtl.timeline.steps[1].a-0.2);heroHost.classList.remove('swap');};
  if(heroCtl){heroHost.classList.add('swap');setTimeout(swap,200);}else swap();
}
function typeInto(text,then){
  var q=$('q');clearInterval(typing);if(reduce){q.value=text;then();return;}
  q.value='';var i=0;typing=setInterval(function(){i+=2;q.value=text.slice(0,i);if(i>=text.length){clearInterval(typing);then();}},24);
}
var STOP=['how','the','does','what','work','works','why','and','for','with','into','explain','about','are','you'];
function terms(text){return text.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\\s+/).filter(function(w){return w.length>1&&STOP.indexOf(w)<0;});}
function hits(hay,ws){var s=0;ws.forEach(function(w){if((' '+hay+' ').indexOf(' '+w)>=0)s++;});return s;}
function ranked(text){var ws=terms(text);if(!ws.length)return [];
  return META.map(function(m){return {m:m,s:hits(m.words,ws)};}).filter(function(x){return x.s>0;}).sort(function(a,b){return b.s-a.s;}).map(function(x){return x.m;});}
function match(text){return ranked(text)[0]||null;}
/* suggestions */
var sug=$('sug'),qEl=$('q'),sel=-1,items=[];
function closeSug(){sug.hidden=true;qEl.setAttribute('aria-expanded','false');sel=-1;}
function pick(m){closeSug();$('miss').hidden=true;qEl.value=m.prompt.replace(/[“”]/g,'');showHero(m.id,true);}
function drawSug(){
  var text=qEl.value.trim();items=ranked(text).slice(0,5);sug.innerHTML='';sel=-1;
  if(!text){closeSug();return;}
  if(!items.length){var li=document.createElement('li');li.className='none';li.textContent='No finished sheet for that. Press Enter for the command to run in Claude Code.';sug.appendChild(li);}
  items.forEach(function(m,i){var li=document.createElement('li');li.setAttribute('role','option');li.id='sug-'+i;li.textContent=m.title;var sp=document.createElement('span');sp.textContent=m.steps.length+' steps';li.appendChild(sp);
    li.addEventListener('mousedown',function(e){e.preventDefault();pick(m);});sug.appendChild(li);});
  sug.hidden=false;qEl.setAttribute('aria-expanded','true');
}
qEl.addEventListener('input',drawSug);
qEl.addEventListener('focus',function(){qEl.select();});
qEl.addEventListener('blur',function(){setTimeout(closeSug,120);});
qEl.addEventListener('keydown',function(e){
  if(e.key==='Escape'){closeSug();return;}
  if(sug.hidden||!items.length||(e.key!=='ArrowDown'&&e.key!=='ArrowUp'))return;
  e.preventDefault();sel=(sel+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
  [].forEach.call(sug.children,function(li,i){li.setAttribute('aria-selected',i===sel);});qEl.setAttribute('aria-activedescendant','sug-'+sel);
});
document.querySelectorAll('[data-chip]').forEach(function(b){b.addEventListener('click',function(){
  $('miss').hidden=true;closeSug();var id=b.getAttribute('data-chip');typeInto(byId[id].prompt.replace(/[“”]/g,''),function(){showHero(id,true);});
});});
$('ask').addEventListener('submit',function(e){
  e.preventDefault();var text=$('q').value.trim();if(!text)return;var m=sel>=0?items[sel]:match(text),miss=$('miss');
  if(m){pick(m);return;}
  closeSug();
  miss.hidden=false;miss.innerHTML='';
  var s=document.createElement('span');s.textContent='No sheet for that here yet. In Claude Code, run';
  var c=document.createElement('code');c.textContent='/blueprint '+text;
  var bt=document.createElement('button');bt.type='button';bt.textContent='Copy';bt.addEventListener('click',function(){copy('/blueprint '+text,bt);});
  miss.appendChild(s);miss.appendChild(c);miss.appendChild(bt);
});
showHero('cache');

/* examples */
var cards=[].slice.call(document.querySelectorAll('.card')),tctl={};
var tio=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;var t=e.target,id=t.getAttribute('data-id');
  if(!tctl[id])tctl[id]=BLUEPRINT.mount(t.querySelector('.thumb'),BLUEPRINT.scenes[id],{play:'still',controls:false});tio.unobserve(t);});},{rootMargin:'500px'});
cards.forEach(function(t){tio.observe(t);if(reduce)return;var id=t.getAttribute('data-id');
  var on=function(){var c=tctl[id];if(!c)return;c.mode='loop';c.seek(0.7);c.play();};
  var off=function(){var c=tctl[id];if(!c)return;c.pause();c.mode='still';c.seek(c.timeline.total);};
  t.addEventListener('mouseenter',on);t.addEventListener('mouseleave',off);t.addEventListener('focus',on);t.addEventListener('blur',off);
});
var segs=document.querySelectorAll('.seg button');
var fGroup='all',find=$('find');
function applyFilter(){
  var ws=terms(find.value),n=0;
  cards.forEach(function(c){var ok=(fGroup==='all'||c.getAttribute('data-group')===fGroup)&&(!ws.length||hits(c.getAttribute('data-words'),ws)===ws.length);c.hidden=!ok;if(ok)n++;});
  var none=$('none');none.hidden=n>0;
  if(!n){var t=find.value.trim();$('none-p').textContent=t?'No sheet about “'+t+'” yet. Ask Claude to draw it:':'Nothing here.';$('none-cmd').textContent='/blueprint '+(t||'how it works');}
}
segs.forEach(function(b){b.addEventListener('click',function(){fGroup=b.getAttribute('data-f');segs.forEach(function(x){x.setAttribute('aria-pressed',x===b);});applyFilter();});});
find.addEventListener('input',applyFilter);
$('none-copy').addEventListener('click',function(e){copy($('none-cmd').textContent,e.currentTarget);});

/* viewer */
var dlg=$('vw'),vctl=null,cur=null;
function openV(id){
  var m=byId[id];if(!m)return;cur=m;
  $('vw-title').textContent=m.title;$('vw-meta').textContent=(m.group==='small'?'Small':'Complex')+' · '+m.steps.length+' steps · '+m.secs+' s';
  $('vw-ask').textContent='/blueprint '+m.prompt;
  var host=$('vw-scene');if(vctl)vctl.destroy();host.innerHTML='';host.scrollTop=0;
  vctl=BLUEPRINT.mount(host,BLUEPRINT.scenes[id],{play:'loop',key:true});
  var ol=$('vw-steps');ol.innerHTML='';
  var bs=m.steps.map(function(s,i){var li=document.createElement('li'),b=document.createElement('button');b.type='button';b.textContent=s;b.addEventListener('click',function(){vctl.step(i);});li.appendChild(b);ol.appendChild(li);return b;});
  var orig=vctl.onStep;vctl.onStep=function(si){orig.call(vctl,si);bs.forEach(function(b,i){if(i===si){b.setAttribute('aria-current','step');}else b.removeAttribute('aria-current');});};
  vctl.onStep(vctl.stepIndex());
  $('vw-gh').href=GHB+m.file;
  var src=$('vw-src');if(m.sources){src.hidden=false;src.innerHTML='Sources: '+m.sources.map(function(s){return '<a href="'+s[1].replace(/"/g,'&quot;')+'" target="_blank" rel="noopener">'+s[0].replace(/</g,'&lt;')+'</a>';}).join(', ');}else src.hidden=true;
  if(heroCtl)heroCtl.pause();
  if(!dlg.open)dlg.showModal();
}
function near(d){var i=META.indexOf(cur);return META[(i+d+META.length)%META.length].id;}
function go(id){history.replaceState('',document.title,'#'+id);openV(id);}
dlg.addEventListener('close',function(){if(vctl){vctl.destroy();vctl=null;}if(byId[location.hash.slice(1)])history.replaceState('',document.title,location.pathname+location.search);if(heroCtl&&!reduce)heroCtl.play();});
$('vw-x').addEventListener('click',function(){dlg.close();});
$('vw-prev').addEventListener('click',function(){go(near(-1));});
$('vw-next').addEventListener('click',function(){go(near(1));});
dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close();});
dlg.addEventListener('keydown',function(e){
  if(!vctl||e.target.closest('a'))return;var i=vctl.stepIndex();
  if(e.key==='ArrowRight'){e.preventDefault();vctl.step(Math.min(cur.steps.length-1,i+1));}
  else if(e.key==='ArrowLeft'){e.preventDefault();vctl.step(Math.max(0,i-1));}
  else if(e.key===' '&&e.target.tagName!=='BUTTON'){e.preventDefault();vctl.toggle();}
});
$('vw-ask-copy').addEventListener('click',function(e){copy($('vw-ask').textContent,e.currentTarget);});
$('vw-link').addEventListener('click',function(e){if(cur)copy(location.origin+location.pathname+'#'+cur.id,e.currentTarget);});
$('vw-code').addEventListener('click',function(e){if(cur)copy(SRC[cur.id],e.currentTarget);});
cards.forEach(function(c){c.addEventListener('click',function(e){if(e.metaKey||e.ctrlKey)return;e.preventDefault();go(c.getAttribute('data-id'));});});
function route(){var id=location.hash.slice(1);if(byId[id])openV(id);else if(dlg.open)dlg.close();}
window.addEventListener('hashchange',route);route();
})();
</script>
`;

mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist/index.html'), `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head><body>\n${body}\n</body></html>\n`);
console.log(`site: ${scenes.length} scenes (${small.length} small, ${complex.length} complex), repo ${REPO} -> site/dist/index.html (${(body.length / 1024).toFixed(0)} KB)`);
