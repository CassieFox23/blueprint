# /blueprint

A Claude Code skill that draws animated explainers like a Victorian patent sheet on blueprint paper.

The sheet starts empty. Each part is drawn in because the last one fell short: a database is slow, *so* a drawer by the door keeps recent answers. Parts get numbered leader lines, things travel along the lines, and one plain caption per step tells the story. The finished sheet explains the idea on its own as a still.

## Install

Copy this folder into your skills directory:

```bash
cp -R blueprint-build ~/.claude/skills/blueprint
```

Then ask your agent:

```
/blueprint how a cache works
/blueprint our signup flow, for the docs page
/blueprint why the retry storm took the API down
/blueprint the event loop, as a complex scene with camera moves
```

It finds the "but… so…" chain in the topic, picks parts from the kit, lays out the sheet, lints it, renders a contact sheet to check it, and either embeds it in your page or exports a standalone HTML file.

## What you get

```html
<blueprint-scene scene="cache" play="view" key></blueprint-scene>
<script src="/blueprint/blueprint.js" defer></script>
<script src="/blueprint/cache.js" defer></script>
```

- `play`: `loop`, `view` (once when scrolled into view), `click` or `still`
- `paper`: `blue` (cyanotype) or `linen` (ink on cream)
- `key`: the numbered parts list under the sheet
- `no-controls`, `no-font`, `speed`

Every scene has play/pause, previous/next step and a step bar. Reduced motion shows the finished sheet. One file, no dependencies.

## Files

| | |
|---|---|
| `SKILL.md` | what the agent reads first: workflow and style rules |
| `references/craft.md` | the scene format, the 28-part kit, line kinds, step actions, metaphor catalogue |
| `runtime/blueprint.js` | the runtime: layout, timeline, SVG renderer, `<blueprint-scene>` |
| `templates/scene.js` | a starting scene |
| `scripts/check.mjs` | lint a scene: unknown ids, overlaps, lines through parts, labels off the sheet |
| `scripts/frames.mjs` | contact sheet PNG of chosen moments (needs Playwright) |
| `scripts/build.mjs` | scenes → one standalone HTML page |
| `examples/small/` | 10 scenes, 3–6 steps each |
| `examples/complex/` | 10 scenes, 7–10 steps with camera moves |
| `gallery/` | `node gallery/build.mjs` builds a page with all 20 |

## Where the style comes from

Victorian patent drawings (fine line work, reference numerals, shading on the lower right), Randall Munroe's *Thing Explainer* (plain words, labels everywhere), Bartosz Ciechanowski's step-by-step builds (each part fixes what the last one couldn't), Bret Victor's ladder of abstraction (one concrete case before the rule), and Oliver Byrne's coloured Euclid (one colour means one thing). Packaging follows Kamran Ahmed's `/stick-scene`.
