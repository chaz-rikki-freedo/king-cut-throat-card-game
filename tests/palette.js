/* The color checker (docs/ui/colors.md). No browser: it reads index.html and the registry, docs/ui/palette.json.

   node palette.js               checks the game's colors; exits with code 1 when a check fails
   node palette.js --pack f.json  checks a theme pack: its tokens over the defaults, with no known problems allowed
   node palette.js --write-doc   rewrites the generated tables in docs/ui/colors.md from the registry

   The checks:
   - Registry: every color token in index.html is in the registry with the same value, and every registry token is
     in index.html.
   - Stray colors: every color written in index.html outside a token is on the registry's untokenized list, and every
     color on that list is still in index.html. The list can only shrink.
   - Collisions: each rule's pairs are at least as far apart as the rule's level, for normal vision and for the
     simulated color blindness in the registry.
   - Contrast: each text and background pair has at least its WCAG contrast ratio.
   - Known problems: a failing pair passes only while it is listed under known, and a listed pair that no longer
     fails must be removed, so the list stays true. A theme pack has no known problems.

   The palette page (docs/ui/palette.html) loads this file too, for the same color math and checks: only main()
   uses Node. */
'use strict';

/* ---- Color math ---- */
/** @returns {{ r: number, g: number, b: number, a: number } | null} 0–255 channels, alpha 0–1 */
function parse(text) {
  const t = text.trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(t);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = i => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = /^rgba?\(([^)]*)\)$/.exec(t);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(x => Number.isNaN(x))) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  return null;
}
/** One spelling per color, so #fff and #ffffff are the same entry. */
function norm(text) {
  const c = parse(text);
  if (!c) return text.trim().toLowerCase();
  const hex = v => Math.round(v).toString(16).padStart(2, '0');
  return c.a === 1 ? '#' + hex(c.r) + hex(c.g) + hex(c.b) : 'rgba(' + [c.r, c.g, c.b].map(Math.round).join(',') + ',' + +c.a.toFixed(3) + ')';
}
const toLinear = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const fromLinear = v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
/* Color blindness, simulated with the matrices of Machado, Oliveira and Fernandes (2009), severity 1, in linear RGB. */
const VISION = {
  normal: null,
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
};
function seenAs(c, vision) {
  const M = VISION[vision];
  if (!M) return c;
  const v = [toLinear(c.r), toLinear(c.g), toLinear(c.b)];
  const o = M.map(row => Math.min(1, Math.max(0, row[0] * v[0] + row[1] * v[1] + row[2] * v[2])));
  return { r: fromLinear(o[0]), g: fromLinear(o[1]), b: fromLinear(o[2]), a: c.a };
}
function lab(c) {
  const r = toLinear(c.r), g = toLinear(c.g), b = toLinear(c.b);
  const f = v => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
  const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047), y = f(r * 0.2126 + g * 0.7152 + b * 0.0722), z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
/** CIEDE2000: how different two colors look. */
const deltaE = (c1, c2) => deltaELab(lab(c1), lab(c2));
function deltaELab([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180;
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2, G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1 = Math.hypot(a1p, b1), C2 = Math.hypot(a2p, b2);
  const hue = (x, y) => (Math.atan2(y, x) / rad + 360) % 360;
  const h1 = hue(a1p, b1), h2 = hue(a2p, b2);
  let dh = C1 * C2 === 0 ? 0 : h2 - h1;
  if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dL = L2 - L1, dC = C2 - C1, dH = 2 * Math.sqrt(C1 * C2) * Math.sin(dh * rad / 2);
  const Lb = (L1 + L2) / 2, Cp = (C1 + C2) / 2;
  const hb = C1 * C2 === 0 ? h1 + h2 : Math.abs(h1 - h2) <= 180 ? (h1 + h2) / 2 : h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const SL = 1 + 0.015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * Cp, SH = 1 + 0.015 * Cp * T;
  const RT = -Math.sin(2 * 30 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad) * 2 * Math.sqrt(Cp ** 7 / (Cp ** 7 + 25 ** 7));
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
/** WCAG 2 contrast ratio. */
function contrast(c1, c2) {
  const lum = c => 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b);
  const [hi, lo] = [lum(c1), lum(c2)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---- Reading the game ---- */
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
/** The color tokens declared in the CSS ({ name, value, scope }), and every other color written in index.html. */
function readGame(html) {
  const css = html.slice(0, html.indexOf('</style>'));
  const tokens = [], decl = /([^{}]+)\{([^{}]*)\}/g, prop = /(--[\w-]+)\s*:\s*([^;]+)/g;
  let m, p;
  const spans = [];
  while ((m = decl.exec(css))) {
    const scope = m[1].trim().split('\n').pop().trim();
    prop.lastIndex = 0;
    while ((p = prop.exec(m[2]))) {
      if (!parse(p[2])) continue;
      tokens.push({ name: p[1], value: norm(p[2]), scope });
      const at = m.index + m[1].length + 1 + p.index;
      spans.push([at, at + p[0].length]);
    }
  }
  /* Comments name colors too (issue numbers like #117 look like hex): leave them out, and anything inside a token. */
  const blank = (s, re) => s.replace(re, x => ' '.repeat(x.length));
  let code = blank(blank(html, /\/\*[\s\S]*?\*\//g), /<!--[\s\S]*?-->/g);
  for (const [a, b] of spans) code = code.slice(0, a) + ' '.repeat(b - a) + code.slice(b);
  const stray = new Map();
  for (const x of code.match(COLOR_RE) || []) if (parse(x)) { const k = norm(x); stray.set(k, (stray.get(k) || 0) + 1); }
  return { tokens, stray };
}

/* ---- The checks ---- */
const LEVELS = ['identical', 'lookalike', 'similar', 'distinct'];
function levelOf(reg, d) {
  const t = reg.levels;
  return d < t.lookalike ? 'identical' : d < t.similar ? 'lookalike' : d < t.distinct ? 'similar' : 'distinct';
}
const pairKey = (check, a, b, vision) => [check, ...[a, b].sort(), vision].join(' ');
function members(reg, group) {
  const g = reg.groups[group];
  if (!g) throw new Error('palette.json: no group ' + group);
  return g;
}
/** Every collision and contrast failure for a set of token values. */
function problems(reg, values) {
  const out = [];
  const color = name => { const c = values.get(name); if (!c) throw new Error('palette.json: no token ' + name); return parse(c); };
  for (const rule of reg.rules) {
    const A = members(reg, rule.between[0]), B = members(reg, rule.between[1]);
    const pairs = [];
    if (rule.between[0] === rule.between[1]) A.forEach((a, i) => A.slice(i + 1).forEach(b => pairs.push([a, b])));
    else A.forEach(a => B.forEach(b => { if (a !== b) pairs.push([a, b]); }));
    for (const vision of Object.keys(VISION)) {
      const need = vision === 'normal' ? rule.min : rule.minColorBlind || reg.colorBlindMin;
      if (vision !== 'normal' && !reg.visions.includes(vision)) continue;
      for (const [a, b] of pairs) {
        const d = deltaE(seenAs(color(a), vision), seenAs(color(b), vision)), seen = levelOf(reg, d);
        if (LEVELS.indexOf(seen) < LEVELS.indexOf(need)) out.push({ key: pairKey(rule.id, a, b, vision), check: rule.id, a, b, vision, text: seen + ' (' + d.toFixed(1) + '), needs ' + need });
      }
    }
  }
  /* A background can be a tint over a surface, written "--panel@--felt": the seats and the log are a tint over the felt. */
  const surface = name => {
    const [top, under] = name.split('@');
    if (!under) return color(top);
    const t = color(top), u = surface(under), mix = k => t[k] * t.a + u[k] * (1 - t.a);
    return { r: mix('r'), g: mix('g'), b: mix('b'), a: 1 };
  };
  for (const c of reg.contrast) for (const bg of c.on) {
    const r = contrast(color(c.text), surface(bg));
    if (r < c.min) out.push({ key: pairKey('contrast', c.text, bg, 'normal'), check: 'contrast', a: c.text, b: bg, vision: 'normal', text: r.toFixed(2) + ':1, needs ' + c.min + ':1' });
  }
  return out;
}

/* ---- The generated tables in colors.md ---- */
function tokenTable(reg) {
  const rows = reg.tokens.map(t => '| `' + t.name + '` | ' + t.family + ' | `' + t.value + '` | ' + t.job + ' |');
  return ['| Token | Family | Default | Job |', '|---|---|---|---|', ...rows].join('\n');
}
function knownTable(reg) {
  const rows = reg.known.map(k => { const [check, a, b, vision] = k.key.split(' '); return '| ' + check + ' | `' + a + '` / `' + b + '` | ' + vision + ' | ' + k.fix + ' |'; });
  return rows.length ? ['| Check | Pair | Vision | Planned fix |', '|---|---|---|---|', ...rows].join('\n') : 'None.';
}
function withTables(doc, reg) {
  const put = (text, name, table) => {
    const re = new RegExp('(<!-- palette:' + name + ' -->)[\\s\\S]*?(<!-- /palette:' + name + ' -->)');
    if (!re.test(text)) throw new Error('colors.md: no <!-- palette:' + name + ' --> block');
    return text.replace(re, '$1\n' + table + '\n$2');
  };
  return put(put(put(doc, 'tokens', tokenTable(reg)), 'known', knownTable(reg)), 'untokenized', reg.untokenized.length + ' colors: ' + reg.untokenized.map(x => '`' + x + '`').join(', ') + '.');
}

/* ---- Main ---- */
function main(argv) {
  const fs = require('fs'), path = require('path');
  const ROOT = path.resolve(__dirname, '..');
  const REG_FILE = path.join(ROOT, 'docs/ui/palette.json'), DOC_FILE = path.join(ROOT, 'docs/ui/colors.md');
  const reg = JSON.parse(fs.readFileSync(REG_FILE, 'utf8'));
  if (argv[0] === '--write-doc') { fs.writeFileSync(DOC_FILE, withTables(fs.readFileSync(DOC_FILE, 'utf8'), reg)); console.log('colors.md: tables rewritten'); return 0; }
  const fails = [], note = s => console.log('  ' + s), fail = s => { fails.push(s); console.log('  ✖ ' + s); };
  const values = new Map(reg.tokens.map(t => [t.name, norm(t.value)]));

  if (argv[0] === '--pack') {
    const pack = JSON.parse(fs.readFileSync(path.resolve(argv[1]), 'utf8'));
    console.log('Theme pack: ' + (pack.name || argv[1]));
    for (const [name, v] of Object.entries(pack.tokens || {})) {
      if (!values.has(name)) fail(name + ' is not a token');
      else if (!parse(v)) fail(name + ': ' + v + ' is not a color');
      else values.set(name, norm(v));
    }
    for (const p of problems(reg, values)) fail(p.check + ': ' + p.a + ' / ' + p.b + (p.vision === 'normal' ? '' : ' (' + p.vision + ')') + ': ' + p.text);
    note(reg.untokenized.length + ' colors in the game are not tokens yet, so no theme can change them.');
    console.log(fails.length ? 'FAIL: ' + fails.length + ' problem(s)' : 'OK: the pack has no collisions');
    return fails.length ? 1 : 0;
  }

  /* Published test pairs for CIEDE2000 (Sharma, Wu and Dalal, 2005: pairs 1, 7, 17 and 25). */
  console.log('Color math');
  for (const [x, y, want] of [[[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425], [[50, 0, 0], [50, -1, 2], 2.3669],
    [[50, 2.5, 0], [73, 25, -18], 27.1492], [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644]]) {
    const got = deltaELab(x, y);
    if (Math.abs(got - want) > 1e-4) fail('CIEDE2000 gives ' + got.toFixed(4) + ' for a published pair of ' + want);
  }
  note('CIEDE2000 matches the published test pairs');

  const game = readGame(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
  console.log('Registry');
  const regByName = new Map(reg.tokens.map(t => [t.name, t]));
  for (const t of game.tokens) {
    const r = regByName.get(t.name);
    if (!r) fail(t.name + ' (' + t.value + ', in ' + t.scope + ') is not in palette.json');
    else if (norm(r.value) !== t.value) fail(t.name + ' is ' + t.value + ' in index.html but ' + r.value + ' in palette.json');
  }
  for (const r of reg.tokens) if (!game.tokens.some(t => t.name === r.name)) fail(r.name + ' is in palette.json but not in index.html');
  note(game.tokens.length + ' tokens');

  console.log('Stray colors');
  const listed = new Set(reg.untokenized.map(norm));
  for (const [c, n] of game.stray) if (!listed.has(c)) fail(c + ' is written in index.html ' + n + ' time(s): make it a token, or reuse one');
  for (const c of listed) if (!game.stray.has(c)) fail(c + ' is no longer in index.html: remove it from untokenized');
  note(game.stray.size + ' colors not yet tokens (the list can only shrink)');

  console.log('Collisions and contrast');
  const found = problems(reg, values), known = new Map(reg.known.map(k => [k.key, k]));
  for (const p of found) if (!known.has(p.key)) fail(p.check + ': ' + p.a + ' / ' + p.b + (p.vision === 'normal' ? '' : ' (' + p.vision + ')') + ': ' + p.text);
  for (const k of reg.known) if (!found.some(p => p.key === k.key)) fail('known "' + k.key + '" passes now: remove it from known');
  note(found.length + ' problems, ' + reg.known.length + ' of them known');

  console.log('Docs');
  const doc = fs.readFileSync(DOC_FILE, 'utf8');
  if (withTables(doc, reg) !== doc) fail('colors.md is out of date: run node palette.js --write-doc');

  console.log(fails.length ? 'FAIL: ' + fails.length + ' check(s) failed' : 'OK: no new collisions');
  return fails.length ? 1 : 0;
}
if (typeof module !== 'undefined') {
  module.exports = { parse, norm, deltaE, deltaELab, contrast, seenAs, readGame, problems, levelOf, VISION, LEVELS };
  if (require.main === module) process.exitCode = main(process.argv.slice(2));
}
