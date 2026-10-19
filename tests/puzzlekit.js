#!/usr/bin/env node
/* Puzzle authoring kit (docs/puzzles.md). A spec names the hands after the exchange; the kit builds the full deal and
   the script (discards, bidding, exchange, then the plays), loads the puzzle in the game, and prints what the search
   says about each of your moves. Not a check.

     node puzzlekit.js spec.json          # a spec file, or a .js file that exports a list of specs

   A spec: { id, dealer, caller, turned, hands7: [you, west, east], plays: [card, ...], round?, named?, ...the
   format 2 fields (title, kind, teachers, prompt, lesson, goal, scores, say, tips) }. The receiver (left of the
   caller) holds the turned card in hands7. The cards that no hand holds are dealt as discards and kitty cards. */
'use strict';
const fs = require('fs'), path = require('path');
const { serve, launch, openPage } = require('./lib/browser');

const SUITS = ['S', 'H', 'D', 'C'], RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const ALL = SUITS.flatMap(s => RANKS.map(r => r + s)).concat(['JK']);

/** Builds a format 2 puzzle from a spec. */
function build(spec) {
  const dealer = spec.dealer, seat = k => (dealer + k) % 3;
  /* No bid yet: the dealt hands (10 cards each) and the kitty are given whole, with the script so far. */
  if (spec.caller === undefined) return finish(spec, spec.hands10, spec.kitty, spec.script || []);
  const hands7 = spec.hands7.map(h => h.slice());
  const held = hands7.flat();
  if (new Set(held).size !== held.length) throw new Error(spec.id + ': a card is in two hands');
  for (const h of hands7) if (h.length !== 7) throw new Error(spec.id + ': a hand after the exchange has 7 cards');
  /* The 12 cards no hand holds: the kitty's other two, the discards and the exchange discard. Low cards first, so
     the discards look like real ones (you can see your own in the Outside popup). */
  const rank = c => c === 'JK' ? 99 : RANKS.indexOf(c.slice(0, -1));
  const pool = ALL.filter(c => !held.includes(c)).sort((x, y) => rank(x) - rank(y));
  const take = n => pool.splice(0, n);
  const round = spec.round || 1;
  const script = [];
  const dealt = [[], [], []];
  let kitty;
  const recv = (spec.caller + 1) % 3;
  if (round === 1) {
    if (!hands7[recv].includes(spec.turned)) throw new Error(spec.id + ': the receiver must hold the turned card');
    const exOut = spec.exchangeOut ? [spec.exchangeOut] : take(1);
    if (spec.exchangeOut) pool.splice(pool.indexOf(spec.exchangeOut), 1);
    kitty = [spec.turned].concat(take(2));
    for (let p = 0; p < 3; p++) dealt[p] = hands7[p].filter(c => p !== recv || c !== spec.turned).concat(p === recv ? exOut : []);
    const out = (spec.discards || [null, null, null]).map((d, p) => d ? d : null);
    for (let p = 0; p < 3; p++) {
      const d = out[p] || take(3);
      if (out[p]) for (const c of d) pool.splice(pool.indexOf(c), 1);
      dealt[p] = dealt[p].concat(d);
      out[p] = d;
    }
    for (const k of [1, 2, 0]) script.push({ type: 'DISCARD', player: seat(k), cards: out[seat(k)] });
    for (const k of [1, 2, 0]) { const p = seat(k); if (p === spec.caller) { script.push({ type: 'BID', player: p, accept: true }); break; } script.push({ type: 'BID', player: p, accept: false }); }
    script.push({ type: 'EXCHANGE', player: recv, cards: exOut });
  } else throw new Error('round 2 specs are not supported yet');
  if (pool.length) throw new Error(spec.id + ': ' + pool.length + ' cards left over');
  for (const card of spec.plays || []) { script.push({ type: 'PLAY', player: null, card }); }
  return finish(spec, dealt, kitty, script);
}
function finish(spec, hands, kitty, script) {
  const out = { format: 2, id: spec.id, title: spec.title, kind: spec.kind || 'lesson', teachers: spec.teachers, prompt: spec.prompt, lesson: spec.lesson, goal: spec.goal, dealer: spec.dealer, scores: spec.scores || [0, 0, 0], deal: { hands, kitty }, script };
  if (spec.say) out.say = spec.say;
  if (spec.tips) out.tips = spec.tips;
  if (spec.seed !== undefined) out.seed = spec.seed;
  return out;
}

(async () => {
  const file = process.argv[2];
  if (!file) { console.log('usage: node puzzlekit.js spec.json'); return; }
  const raw = file.endsWith('.js') ? require(path.resolve(file)) : JSON.parse(fs.readFileSync(file, 'utf8'));
  const specs = Array.isArray(raw) ? raw : [raw];
  const built = specs.map(build);
  const srv = await serve(), browser = await launch();
  try {
    const { page } = await openPage(browser, srv.url);
    const res = await page.evaluate(list => list.map(pz => {
      const K = window.KCT, R = K.Rules, E = K.Engine;
      /* The plays name a card only: the player is whoever must act, found by playing the script through the Engine. */
      const st = E.createGame(1, ['You', 'West', 'East']);
      E.dispatch(st, { type: 'START_GAME' });
      st.dealer = pz.dealer; st.scores = pz.scores.slice();
      K.Puzzles.stackDeal(st, pz.deal);
      const settle = () => { for (let s = E.systemAction(st); s && !st.gameOver; s = E.systemAction(st)) E.dispatch(st, s); };
      for (const a of pz.script) {
        settle();
        if (a.type === 'PLAY' && a.player === null) a.player = E.actors(st)[0];
        const r = E.dispatch(st, a);
        if (!r.ok) return { id: pz.id, error: a.type + ' ' + (a.card || '') + ': ' + r.error, pz };
      }
      const ld = K.Puzzles.load(pz);
      if (!ld.ok) return { id: pz.id, error: ld.error, pz };
      const s = ld.state;
      const ans = K.Puzzles.answers(pz.goal, s, s);
      return {
        id: pz.id, pz, phase: s.phase, trump: s.trump, hand: s.hands[0],
        legal: s.trick ? R.legalCards(s.hands[0], s.trick.leadSuit, s.trump) : null,
        answers: ans && ans.map(x => (x.action.card || x.action.type) + (x.wins ? ' WINS' : ' fails'))
      };
    }), built);
    for (const r of res) {
      console.log('== ' + r.id + (r.error ? '  ERROR: ' + r.error : ''));
      if (!r.error) console.log('   phase ' + r.phase + ', trump ' + r.trump + ', your hand ' + r.hand.join(' ') + (r.legal ? '\n   legal ' + r.legal.join(' ') : '') + (r.answers ? '\n   ' + r.answers.join(' · ') : ''));
    }
    if (process.argv.includes('--json')) console.log(JSON.stringify(res.map(r => r.pz), null, 1));
    /* --write NAME: replace the list NAME (TRAINING or PUZZLES) in index.html with these puzzles. */
    const w = process.argv.indexOf('--write');
    if (w > 0) {
      if (res.some(r => r.error)) throw new Error('not written: a puzzle does not load');
      writeList(process.argv[w + 1], res.map(r => r.pz));
    }
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

/* The puzzles as the game's source code: single quotes, one field group per line. */
const js = v => typeof v === 'string' ? "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
  : Array.isArray(v) ? '[' + v.map(js).join(', ') + ']'
  : v && typeof v === 'object' ? '{ ' + Object.entries(v).map(([k, x]) => k + ': ' + js(x)).join(', ') + ' }' : String(v);
function source(pz) {
  const L = ['  {', '    format: 2, id: ' + js(pz.id) + ', kind: ' + js(pz.kind) + ', title: ' + js(pz.title) + ',', '    teachers: ' + js(pz.teachers) + ',',
    '    prompt: ' + js(pz.prompt) + ',', '    lesson: ' + js(pz.lesson) + ',',
    '    goal: ' + js(pz.goal) + ', dealer: ' + pz.dealer + ', scores: ' + js(pz.scores) + ',' + (pz.tips ? ' tips: ' + js(pz.tips) + ',' : '') + (pz.seed !== undefined ? ' seed: ' + pz.seed + ',' : ''),
    '    deal: {', '      hands: [', pz.deal.hands.map(h => '        ' + js(h)).join(',\n'), '      ],', '      kitty: ' + js(pz.deal.kitty), '    },',
    pz.script.length ? '    script: [\n' + pz.script.map(a => '      ' + js(a)).join(',\n') + '\n    ]' + (pz.say ? ',' : '') : '    script: []' + (pz.say ? ',' : '')];
  if (pz.say) L.push('    say: {\n' + Object.entries(pz.say).map(([k, v]) => '      ' + k + ': ' + js(v)).join(',\n') + '\n    }');
  L.push('  }');
  return L.join('\n');
}
function writeList(name, list) {
  if (!/^(TRAINING|PUZZLES)$/.test(name || '')) throw new Error('--write TRAINING or --write PUZZLES');
  const file = path.join(__dirname, '..', 'index.html'), html = fs.readFileSync(file, 'utf8');
  const head = 'const ' + name + ' = Object.freeze([', start = html.indexOf(head);
  /* An empty list is written on one line: Object.freeze([]). */
  const end = html.startsWith(']);', start + head.length) ? start + head.length : html.indexOf('\n]);', start);
  if (start < 0 || end < 0) throw new Error(name + ' not found in index.html');
  const body = list.length ? '\n' + list.map(source).join(',\n') : '';
  fs.writeFileSync(file, html.slice(0, start + head.length) + body + (list.length && html.startsWith(']);', end) ? '\n' : '') + html.slice(end));
  console.log('wrote ' + list.length + ' puzzles to ' + name + ' in index.html');
}

module.exports = { build };
