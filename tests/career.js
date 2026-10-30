#!/usr/bin/env node
/* Not a check. Measures what Dynamic does over a whole career of a player who starts bad (issue #117).
   A career is 82 games in a row from a blank profile, as the app plays them (two personalities seated as the app does,
   eased each hand by Dynamic.tracker, the post-game review updating the profile for the next game):
     games 1-8     bad
     games 9-32    bad with probability 0.5 in each game
     games 33-82   okay
   A bad game is a floor-strength bot (1 hunch, 60% brain farts, knowledge off). With --gross, a bad player also throws away
   its 3 best cards at 40% of its first discards (the gross mistakes of a new player). An okay game is 5 hunches, knowledge off.
   Each setting runs with a hold length (Dynamic.HOLD_HANDS) and a taper length (Dynamic.TAPER_HANDS), written hold:taper
   (a bare hold has the build's taper of 80): 0:0 is Dynamic without either, 80:0 the hold that ends at once, 80:80 the build.
   Prints, per phase: the starting and mean easing, Sharks at the table, the win rate (all, bad and okay games) and the
   score share, and for the first 8 games: wins per career, the longest loss streak and the careers with no win.
   It serves a patched copy of index.html and does not change the file.
   Usage: node career.js [careers=12] [workers=4] [settings=80:0,80:80] [--gross] */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { launch, openPage, run, ROOT } = require('./lib/browser');

const OFF = { bids: false, turnedCard: false, ownDiscards: false, voids: false, scoreAware: false, showdownPlans: false };
const BAD = { worlds: 1, playoutSkill: 0.4 }, OK = { worlds: 5, playoutSkill: 1 };
const PHASES = [['games 1-8', 0, 8], ['games 9-16', 8, 16], ['games 17-32', 16, 32], ['games 33-50', 32, 50], ['games 51-82', 50, 82]];

function patchedPage() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const at = 'const HOLD_HANDS = 80;', at2 = 'const TAPER_HANDS = 80;';
  if (!html.includes(at) || !html.includes(at2)) throw new Error('index.html changed: the patch point is gone');
  return html.replace(at, 'let HOLD_HANDS = 80; window.__setHold = v => { HOLD_HANDS = v; };')
    .replace(at2, 'let TAPER_HANDS = 80; window.__setTaper = v => { TAPER_HANDS = v; };');
}
function servePatched(html) {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/' || u === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); return; }
    const file = path.join(ROOT, u);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); } else { res.writeHead(200); res.end(data); } });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ url: 'http://127.0.0.1:' + srv.address().port + '/index.html', close: () => srv.close() })));
}

const PAGE = `
  const { Engine, AI, Replay, RNG, Rules: R, buildView, Dynamic: DY, PERSONAS } = KCT;
  const P = Engine.P, job = arg.job;
  window.__setHold(job.hold); window.__setTaper(job.taper);
  const base = AI.personaConfig({ tier: 'shark', courage: 'normal', realTable: false, leadPick: 'fair' });
  const mk = th => AI.config(base, { thinking: th, knowledge: ${JSON.stringify(OFF)} });
  const cfgBad = mk(job.bad), cfgOk = mk(job.ok);
  /* The table the app seats: the first pair of the seed's order that fits the starting easing (App.dynamicTable). */
  const pick = (s, e0) => {
    const order = RNG.shuffle(PERSONAS.map(x => x.id), { s: (s ^ 0x5bd1e995) >>> 0 }), max = e0 > 0.5 ? 0 : e0 > 0.2 ? 1 : 2, pairs = [];
    for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) pairs.push([order[i], order[j]]);
    const p = pairs.find(q => q.filter(id => PERSONAS.find(x => x.id === id).tier === 'shark').length <= max) || pairs[0];
    return p.map(id => PERSONAS.find(x => x.id === id));
  };
  let st = (job.seed ^ 0x9e3779b9) >>> 0; const rnd = () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; };
  let profile = DY.cleanProfile(null); const games = [];
  for (let g = 0; g < 82; g++) {
    const bad = g < 8 ? true : g < 32 ? rnd() < 0.5 : false;
    const me = bad ? cfgBad : cfgOk;
    const seed = (job.seed + g * 7919) >>> 0, t = DY.tracker(DY.snapshotOf(profile)), bots = pick(seed, t.e0), es = [];
    const s = Engine.createGame(seed); Engine.dispatch(s, { type: 'START_GAME' });
    for (let k = 0; k < 9000 && !s.gameOver; k++) {
      const ac = Engine.actors(s);
      let a;
      if (ac.length) {
        const p = ac[0], v = buildView(s, p), c = p === 0 ? me : DY.ease(bots[p - 1], t.e);
        if (p === 0 && bad && job.gross && s.phase === P.DISCARD && rnd() < 0.4) {
          const h = s.hands[0], bs = R.SUITS.reduce((x, y) => DY.handEstimate(h, y) > DY.handEstimate(h, x) ? y : x);
          a = { type: 'DISCARD', player: 0, cards: h.slice().sort((x, y) => R.getCardStrength(y, bs) - R.getCardStrength(x, bs)).slice(0, Engine.C.INITIAL_DISCARD) };
        } else a = AI.decide(v, c);
        if (Engine.validate(s, a)) a = AI.fallbackAction(v, c);
      } else a = Engine.systemAction(s);
      const res = Engine.dispatch(s, a);
      if (!res.ok) break;
      if (DY.handEnded(res.events, s)) { t.hand(buildView(s, 1)); es.push(t.e); }
    }
    const rv = DY.review(Replay.fromState(s, { mode: 'dynamic' }));
    if (rv) profile = DY.addGame(profile, rv, 'dynamic');
    const tot = s.scores[0] + s.scores[1] + s.scores[2];
    games.push({ bad, e0: t.e0, em: es.reduce((x, y) => x + y, 0) / Math.max(1, es.length), sharks: bots.filter(b => b.tier === 'shark').length, won: s.gameOver && s.winner === 0, share: tot ? s.scores[0] / tot : 1 / 3 });
  }
  return games;`;

const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const f = (x, d = 2) => Number.isFinite(x) ? x.toFixed(d) : '-';
const pct = L => L.length ? f(100 * mean(L.map(g => g.won ? 1 : 0)), 1) : '-';

(async () => {
  const args = process.argv.slice(2), gross = args.includes('--gross'), pos = args.filter(a => !a.startsWith('--'));
  const [c = '12', w = '4', h = '80:0,80:80'] = pos;
  const careers = Number(c), workers = Number(w), holds = h.split(',').map(x => { const [a, b = '80'] = x.split(':'); return { hold: Number(a), taper: Number(b), name: a + ':' + b }; });
  const jobs = [];
  for (const { hold, taper, name } of holds) for (let i = 0; i < careers; i++) jobs.push({ hold, taper, name, gross, bad: BAD, ok: OK, seed: (4242 * 1000003 + i * 104729) >>> 0 });
  const srv = await servePatched(patchedPage()), browser = await launch(), t0 = Date.now();
  let done = 0;
  const res = (await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const mine = jobs.filter((_, i) => i % workers === k), { page } = await openPage(browser, srv.url), r = [];
    for (const job of mine) {
      r.push({ name: job.name, games: await run(page, PAGE, { job }) });
      if (++done % 4 === 0) console.error(done + '/' + jobs.length + ' careers, ' + Math.round((Date.now() - t0) / 1000) + ' s');
    }
    await page.context().close(); return r;
  }))).flat();
  await browser.close(); srv.close();

  console.log('Beginner: ' + (gross ? 'floor strength, throws away its best cards at 40% of first discards' : 'floor strength, no gross mistakes') + '; ' + careers + ' careers of 82 games per setting');
  for (const { hold, taper, name } of holds) {
    const C = res.filter(x => x.name === name).map(x => x.games);
    console.log('\nHOLD_HANDS ' + hold + ', TAPER_HANDS ' + taper);
    console.log('phase        start e  mean e  Sharks  win%   bad%   okay%  share%');
    for (const [name, a, b] of PHASES) {
      const G = C.flatMap(x => x.slice(a, b));
      console.log(name.padEnd(12) + ' ' + [f(mean(G.map(g => g.e0))), f(mean(G.map(g => g.em))), f(mean(G.map(g => g.sharks))), pct(G), pct(G.filter(g => g.bad)), pct(G.filter(g => !g.bad)), f(100 * mean(G.map(g => g.share)), 1)].map(x => x.padStart(7)).join(' '));
    }
    const wins = C.map(x => x.slice(0, 8).filter(g => g.won).length);
    const streak = C.map(x => { let s = 0, m = 0; for (const g of x.slice(0, 8)) { s = g.won ? 0 : s + 1; m = Math.max(m, s); } return m; });
    console.log('first 8 games: wins per career ' + f(mean(wins)) + ', longest loss streak ' + f(mean(streak), 1) + ', careers with no win ' + wins.filter(n => !n).length + ' of ' + C.length);
  }
  console.log('\n' + Math.round((Date.now() - t0) / 1000) + ' s');
})().catch(e => { console.error(e); process.exit(1); });
