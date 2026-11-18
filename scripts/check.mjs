#!/usr/bin/env node
// Lint a blueprint scene without a browser: unknown ids, bad steps, and the
// layout problems a still frame makes obvious only once you look: parts that
// overlap, lines that cut through a part, labels or numerals that collide or
// fall off the sheet, captions that will not fit.
//
//   node scripts/check.mjs examples/small/cache.js [more.js ...]
//
// Exit code 1 when any scene has errors. Warnings are layout advice; fix them
// unless the overlap is intended (then say so in a comment in the scene).
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const BP = require(resolve(here, '../runtime/blueprint.js'));

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: check.mjs scene.js [scene2.js ...]'); process.exit(2); }

const CH = 6.6;                       // label char width at 9.5px with tracking
const box = (x, y, w, h) => ({ x, y, w, h });
const hit = (a, b, pad = 0) => a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad;
const inset = (b, d) => box(b.x + d, b.y + d, b.w - 2 * d, b.h - 2 * d);
function segHitsBox(p, q, b) {
  // Liang–Barsky clip of segment pq against box b
  let t0 = 0, t1 = 1; const dx = q[0] - p[0], dy = q[1] - p[1];
  const P = [-dx, dx, -dy, dy], Q = [p[0] - b.x, b.x + b.w - p[0], p[1] - b.y, b.y + b.h - p[1]];
  for (let i = 0; i < 4; i++) {
    if (P[i] === 0) { if (Q[i] < 0) return false; continue; }
    const r = Q[i] / P[i];
    if (P[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t1 - t0 > 1e-6;
}

// Same grammar as PORT_RE in runtime/blueprint.js: an id (letters, digits, _ and -), an
// optional side, an optional signed offset. Ids may contain "-", so never split on it.
const PORT_RE = /^([A-Za-z0-9_-]+)(?:\.(n|s|e|w|c|ne|nw|se|sw))?(?:([+-]\d+(?:\.\d+)?))?$/;
const endId = r => { if (Array.isArray(r)) return null; const m = PORT_RE.exec(String(r)); return m ? m[1] : null; };

let failed = 0;
for (const f of files) {
  const code = readFileSync(resolve(f), 'utf8');
  const got = {};
  try { vm.runInNewContext(code, { BLUEPRINT: { scene: (id, spec) => (got[id] = spec) } }, { filename: f }); }
  catch (e) { console.log(`\n${f}\n  ERROR  the file does not run: ${e.message}`); failed++; continue; }
  if (!Object.keys(got).length) { console.log(`\n${f}\n  ERROR  the file defines no scene (call BLUEPRINT.scene('id', { … }))`); failed++; continue; }
  for (const [id, spec] of Object.entries(got)) {
    const L = BP.layout(spec), tl = BP.compile(spec, L), W = L.W, H = L.H;
    const warn = [...L.warnings], err = [...L.errors];
    if (!tl.steps.length) err.push('the scene has no steps; add at least one { say, draw } step');
    const sheet = box(0, 0, W, H);
    const solid = L.order.filter(p => !['zone', 'label', 'dot'].includes(L.parts[p].p.kind));
    // When each id is on the sheet: from its first draw (or the start, if no step draws it)
    // until an erase that is not followed by another draw.
    const shown = id => {
      const ev = tl.draws[id];
      if (!ev || !ev.length) return [0, Infinity];
      const first = ev.find(e => e.type === 'draw'), last = ev[ev.length - 1];
      return [first ? first.a : 0, last.type === 'erase' ? last.b : Infinity];
    };
    const meets = (a, b) => a[0] < b[1] && b[0] < a[1];
    for (const pid of L.order) if (!tl.draws[pid]) warn.push(`part "${pid}" is never drawn by a step, so it sits on the sheet from the start (add it to a step's "draw")`);
    for (const lid of Object.keys(L.lines)) if (!tl.draws[lid]) warn.push(`line "${lid}" is never drawn by a step, so it sits on the sheet from the start (add it to a step's "draw")`);
    const rects = [];   // things that must not collide: [name, box, owner]
    const texts = [];   // text a line must not cross: [name, box, owner, [from, to] seconds]
    for (const pid of L.order) {
      const P = L.parts[pid], b = box(P.box.x, P.box.y, P.box.w, P.box.h), when = shown(pid);
      if (P.p.kind !== 'zone' && P.p.kind !== 'label' && !hit(inset(b, -0.5), sheet) || b.x < -1 || b.y < -1 || b.x + b.w > W + 1 || b.y + b.h > H + 1) warn.push(`part "${pid}" runs off the sheet (${Math.round(b.x)},${Math.round(b.y)} ${b.w}×${b.h} on ${W}×${H})`);
      if (!['zone', 'label', 'dot'].includes(P.p.kind)) rects.push([`part "${pid}"`, b, pid]);
      const lg = BP.labelGeom(P);
      if (lg) {
        const wMax = Math.max(...lg.lines.map(s => s.length)) * CH, x0 = P.box.x + (lg.anchor === 'middle' ? lg.x - wMax / 2 : lg.anchor === 'end' ? lg.x - wMax : lg.x);
        const lb = box(x0, P.box.y + lg.y - 9, wMax, 11 * lg.lines.length + 1);
        const inside = lg.at === 'in' || lg.at === 'c' || lg.at === 'top';
        if (!inside) rects.push([`label of "${pid}"`, lb, pid]);
        // Lines run under parts, and a part's paper fill hides them, so text inside a solid part
        // is safe. A free label, a zone's corner title (zones sit under lines) and every outside
        // label are not.
        if (!inside || P.p.kind === 'label' || P.p.kind === 'zone') texts.push([`label of "${pid}"`, lb, pid, when]);
        if (lb.x < 0 || lb.y < 0 || lb.x + lb.w > W || lb.y + lb.h > H) warn.push(`label of "${pid}" runs off the sheet`);
        if (lg.at === 'in' && wMax > P.box.w - 8) warn.push(`label "${P.p.label}" is wider than "${pid}" (${Math.round(wMax)} > ${P.box.w - 8}px); widen the part or break the label with \\n`);
      }
      const ld = BP.leaderOf(P);
      if (ld) {
        const tw = ld.text.length * 7.6, tx = ld.anchor === 'middle' ? ld.tx - tw / 2 : ld.anchor === 'end' ? ld.tx - tw : ld.tx;
        const nb = box(tx, ld.ty - 10, tw, 12);
        rects.push([`numeral ${ld.text} of "${pid}"`, nb, pid]);
        texts.push([`numeral ${ld.text} of "${pid}"`, nb, pid, when]);
        if (nb.x < 0 || nb.y < 0 || nb.x + nb.w > W || nb.y + nb.h > H) warn.push(`numeral ${ld.text} of "${pid}" falls off the sheet (try another "lead")`);
      }
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const [na, a, oa] = rects[i], [nb, b, ob] = rects[j];
      if (oa === ob) continue;
      if (hit(a, b, 1)) warn.push(`${na} overlaps ${nb}`);
    }
    const lineLabels = {};
    for (const [lid, X] of Object.entries(L.lines)) {
      if (!X.l.label) continue;
      const at = BP.polyAt(X.pts, X.l.labelPos ?? 0.5), tw = String(X.l.label).length * CH + 6;
      const lb = Math.abs(at.dx) >= Math.abs(at.dy) ? box(at.x - tw / 2, at.y - 15, tw, 12) : box(at.x + 5, at.y - 6, tw, 12);
      lineLabels[lid] = lb;
      texts.push([`the label of line "${lid}"`, lb, lid, shown(lid)]);
    }
    // Notes: where each one sits and while it is up.
    tl.notes.forEach((m, i) => {
      const n = m.n;
      try {
        const p = Array.isArray(n.at) ? { x: n.at[0], y: n.at[1], side: null } : L.lines[n.at] ? { ...BP.polyAt(L.lines[n.at].pts, n.pos ?? 0.5), side: 'n' } : BP.port(n.at, L.parts);
        const rows = String(n.text).split('\n'), tw = Math.max(...rows.map(s => s.length)) * 6.2;
        const dx = n.dx ?? (p.side && p.side.includes('w') ? -6 : 6), dy = n.dy ?? (p.side === 'n' ? -6 : p.side === 's' ? 14 : 3);
        const an = n.anchor || (dx < 0 ? 'end' : p.side === 'n' || p.side === 's' ? 'middle' : 'start');
        const x = p.x + dx, x0 = an === 'end' ? x - tw : an === 'middle' ? x - tw / 2 : x;
        const nb = box(x0, p.y + dy - 9, tw, 11 * rows.length + 1);
        if (x0 < 0 || x0 + tw > W || nb.y < 0 || nb.y + nb.h > H) warn.push(`note "${rows[0]}" runs off the sheet (set "anchor", "dx" or "dy")`);
        for (const [nm, b] of rects) if (hit(nb, b, 1.5)) { warn.push(`note "${rows[0]}" overlaps ${nm}`); break; }
        texts.push([`note "${rows[0]}"`, nb, `note${i}`, [m.a, m.b - 0.3]]);   // fully faded 0.3 s before m.b
      } catch {}
    });
    for (const [lid, X] of Object.entries(L.lines)) {
      const ends = [X.l.from, X.l.to].map(endId), when = shown(lid);
      for (let k = 1; k < X.pts.length; k++) {
        for (const pid of solid) {
          if (ends.includes(pid)) continue;
          const b = L.parts[pid].box;
          if (segHitsBox(X.pts[k - 1], X.pts[k], inset(box(b.x, b.y, b.w, b.h), 2))) { warn.push(`line "${lid}" cuts through part "${pid}" (add "via" points or move the part)`); break; }
        }
      }
      // No text on a line: part labels, numerals, notes and other lines' labels. Only text that is
      // on the sheet while the line is counts, and the text box is shrunk a little so a line that
      // merely grazes a letter's side bearing does not count.
      for (const [nm, b, owner, tw] of texts) {
        if (owner === lid || !meets(when, tw)) continue;
        const tb = inset(b, 1.5);
        if (X.pts.some((q, k) => k && segHitsBox(X.pts[k - 1], q, tb))) warn.push(`line "${lid}" runs through ${nm} (move the text: "labelAt", "lead", the note's "dx"/"dy", or route the line with "via")`);
      }
      if (lineLabels[lid]) for (const [n, b] of rects) if (hit(lineLabels[lid], b, 1)) warn.push(`label of line "${lid}" overlaps ${n}`);
    }
    tl.steps.forEach((s, i) => { if (s.say.length > 120) warn.push(`step ${i + 1}: caption is ${s.say.length} chars; keep it under 120`); });
    const T = tl.total;
    console.log(`\n${f}  ·  ${id}  ·  ${tl.steps.length} steps  ·  ${T.toFixed(1)} s  ·  ${L.order.length} parts, ${Object.keys(L.lines).length} lines`);
    [...new Set(err)].forEach(e => console.log('  ERROR  ' + e));
    [...new Set(warn)].forEach(w => console.log('  warn   ' + w));
    if (!err.length && !warn.length) console.log('  clean');
    if (err.length) failed++;
  }
}
process.exit(failed ? 1 : 0);
