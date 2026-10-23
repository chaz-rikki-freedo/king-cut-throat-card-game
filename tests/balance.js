#!/usr/bin/env node
/* Not a check. Is it worth playing a weak hand when you trail? (docs/strategic-depth.md, "Playing a weak hand when behind".)
   Three Sharks play full games. At the first trick of every hand, for each seat T that is not the sole leader,
   did not call trump and holds a weak hand (fitted estimate below `weak` tricks), the hand is branched: the deal, the
   discards and the other two seats' cards and AI are the same, and T plays the main tricks (and picks the Showdown
   lead, if it mediates) by one policy per branch:
     fold     lowest legal card every time, never tries to win a trick; picks the Showdown lead by the rule (fair)
     greedy   plays to win tricks (Casual-style plan), fair pick
     duck     plays to lose tricks (aims for 1 trick and a 3-3-1 Showdown), shrewd pick
     balance  takes 1 trick, then gives each trick to the opponent with fewer, shrewd pick
     shark    the full Shark AI: tries all three plans, keeps the best by its own win chance, shrewd pick
     deny     the Shark AI, but it values only a lower win chance for the leader (pure leader-bashing), shrewd pick
   Each branch plays the hand to its end (Showdown included). The value of the end is the game's own win-chance table
   (AI.winChance, from the scores), or 1/0 when a seat reaches 10. T uses only its own view; the other seats are Sharks.
   The page is a patched copy of index.html (a plan list and a value function can be set on a config); the repository file
   is not changed.
   Usage: node balance.js [games=40] [workers=4] [weak=1.6] [seed=1]
   Prints JSON: one row per branched hand (scores before, per policy the scores and win chances after). */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { launch, openPage, run, ROOT } = require('./lib/browser');

function patchedPage() {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const pl = 'const activePlans = cfg => (cfg.knowledge.showdownPlans ? PLANS : [\'greedy\']);';
  const oc = 'function outcome(s, me, base, cfg) {';
  if (!html.includes(pl) || !html.includes(oc)) throw new Error('index.html changed: the patch points are gone');
  html = html.replace(pl, 'const activePlans = cfg => cfg.__plans || (cfg.knowledge.showdownPlans ? PLANS : [\'greedy\']);');
  html = html.replace(oc, oc + ' if (cfg && cfg.__util) return cfg.__util(s, me, base);');
  return html;
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

const POLICIES = ['fold', 'greedy', 'duck', 'balance', 'shark', 'deny'];

const PAGE = `
  const { Engine, AI, Rules: R, Dynamic, buildView } = KCT;
  const P = Engine.P;
  const base = AI.personaConfig({ tier: 'shark', courage: 'normal', realTable: false, leadPick: 'shrewd' });
  const withStyle = (cfg, st) => Object.assign({}, cfg, { style: Object.assign({}, cfg.style, st) });
  const fair = withStyle(base, { leadPick: 'fair' });
  const policyCfg = (name, leader) => {
    switch (name) {
      case 'greedy': return Object.assign({}, fair, { __plans: ['greedy'] });
      case 'duck': return Object.assign({}, base, { __plans: ['duck'] });
      case 'balance': return Object.assign({}, base, { __plans: ['balance'] });
      case 'shark': return base;
      case 'deny': return Object.assign({}, base, { __util: (s, me, b) => 1 - (s.gameOver ? (s.winner === leader ? 1 : 0) : AI.winChance(s.scores, leader)) });
      default: return base;
    }
  };
  const clone = s => JSON.parse(JSON.stringify(s));
  const act = (s, p, T, pol, leader) => {
    const v = buildView(s, p);
    let a;
    if (p === T && s.phase === P.TRICK_PLAY && pol === 'fold') {
      const low = v.legal.slice().sort((x, y) => R.getCardStrength(x, s.trump) - R.getCardStrength(y, s.trump))[0];
      a = { type: 'PLAY', player: p, card: low };
    } else if (p === T && (s.phase === P.TRICK_PLAY || s.phase === P.SHOWDOWN_LEAD) && pol) {
      const cfg = s.phase === P.SHOWDOWN_LEAD ? (pol === 'fold' || pol === 'greedy' ? fair : base) : policyCfg(pol, leader);
      a = AI.decide(v, cfg);
    } else a = AI.decide(v, base);
    if (Engine.validate(s, a)) a = AI.fallbackAction(v, base);
    return a;
  };
  const step = (s, T, pol, leader) => {
    const actors = Engine.actors(s);
    const a = actors.length ? act(s, actors[0], T, pol, leader) : Engine.systemAction(s);
    return a && Engine.dispatch(s, a).ok;
  };
  const playHand = (s, T, pol, leader) => {
    const hand = s.handNumber;
    let n = 0;
    while (!s.gameOver && s.phase !== P.HAND_SCORE && s.phase !== P.SHOWDOWN_SCORE && n++ < 400) if (!step(s, T, pol, leader)) break;
    return s;
  };
  const chance = s => [0, 1, 2].map(p => s.gameOver ? (s.winner === p ? 1 : 0) : AI.winChance(s.scores, p));
  const rows = [];
  let games = 0, checked = 0, mismatch = 0, pending = null;
  for (const seed of arg.seeds) {
    const s = Engine.createGame(seed, ['A', 'B', 'C'], undefined, { mediatorLead: true });
    let steps = 0, doneHand = -1;
    while (!s.gameOver && steps++ < 9000) {
      if (s.phase === P.TRICK_PLAY && s.trickNumber === 1 && s.trick.plays.length === 0 && doneHand !== s.handNumber) {
        doneHand = s.handNumber;
        const top = Math.max(...s.scores), leaders = s.scores.filter(x => x === top).length;
        for (let T = 0; T < 3; T++) {
          if (leaders !== 1 || s.scores[T] === top || T === s.caller) continue;
          const est = Dynamic.handEstimate(s.hands[T], s.trump);
          if (est > arg.weak) continue;
          const L = s.scores.indexOf(top), M = 3 - T - L;
          const before = s.scores.slice(), pBefore = chance(s);
          const row = { seed, hand: s.handNumber, T, L, M, est: Math.round(est * 100) / 100, before, pBefore, caller: s.caller, dealerRel: (T - s.dealer + 3) % 3, out: {} };
          for (const pol of arg.policies) {
            const b = playHand(clone(s), T, pol, L);
            row.out[pol] = { after: b.scores.slice(), p: chance(b), over: b.gameOver, tricks: b.handSummary ? b.handSummary.tricks : null, how: b.handSummary ? b.handSummary.outcome : null, tWon: b.tricksWon[T], sd: b.handSummary && b.handSummary.showdown ? b.handSummary.showdown.winner : null, med: b.handSummary && b.handSummary.mediator !== undefined ? b.handSummary.mediator : null };
          }
          rows.push(row);
          if (!pending) pending = { hand: s.handNumber, T, after: row.out.shark.after };
        }
      }
      /* Check: the Shark branch must equal the real hand (the same AI plays on), or the branching changed the game. */
      if (pending && (s.gameOver || s.phase === P.HAND_SCORE || s.phase === P.SHOWDOWN_SCORE)) {
        checked++;
        if (pending.after.join() !== s.scores.join()) mismatch++;
        pending = null;
      }
      if (!step(s, -1, null, -1)) break;
    }
    games++;
  }
  return { games, rows, checked, mismatch };`;

(async () => {
  const [g = '40', w = '4', wk = '1.6', sd = '1'] = process.argv.slice(2);
  const games = Number(g), workers = Number(w), weak = Number(wk), seed0 = Number(sd);
  const seeds = Array.from({ length: games }, (_, i) => (seed0 * 7919 + i * 104729) >>> 0);
  const srv = await servePatched(patchedPage()), browser = await launch();
  const out = await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const mine = seeds.filter((_, i) => i % workers === k), { page, errors } = await openPage(browser, srv.url);
    const rows = [];
    let n = 0, chk = 0, bad = 0;
    for (const sdd of mine) {
      const r = await run(page, PAGE, { seeds: [sdd], weak, policies: POLICIES });
      rows.push(...r.rows); n += r.games; chk += r.checked; bad += r.mismatch;
      process.stderr.write('.');
    }
    await page.context().close();
    return { rows, n, errors, chk, bad };
  }));
  await browser.close(); srv.close();
  const rows = out.flatMap(x => x.rows), errors = out.flatMap(x => x.errors);
  if (errors.length) process.stderr.write('\npage errors: ' + errors.slice(0, 3).join(' | ') + '\n');
  console.log(JSON.stringify({ games: out.reduce((a, x) => a + x.n, 0), checked: out.reduce((a, x) => a + x.chk, 0), mismatch: out.reduce((a, x) => a + x.bad, 0), weak, policies: POLICIES, rows }));
})().catch(e => { console.error(e); process.exit(1); });
