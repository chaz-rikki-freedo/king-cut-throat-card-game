#!/usr/bin/env node
/* Not a check. Fits and checks the award bands (Awards in index.html, section 6f; docs/human-play.md, "Awards").
   Bot games play to the end, three default personalities at a table (the seed picks them). Every seat of every game is
   graded with Awards.read: the mean cost of its choices. Prints:
     - the time to grade one seat (the app does it in slices after the game-over box opens)
     - the fit: the EDGES that put 5, 12, 20, 26, 20, 12 and 5% of the seat-games in bands 6 down to 0, to copy into
       index.html when they move
     - the bands with the constants in index.html, as % of seat-games (the fit's targets)
     - the mean cost and win rate by tier, and how the cost goes with winning (a grade of choices should rank the tiers
       and stay near 0 with the result)
     - one replay code per band, graded for seat 0: paste it in Menu -> Load a code with !dev awards=on, and the
       game-over box at its end shows that band's stroke
   Usage: node awards.js [games=300] [workers=4] [first seed=5150] */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

const PAGE = `
  const { Engine, AI, Replay, RNG, Awards, buildView, PERSONAS } = KCT;
  const out = [];
  for (const seed of arg.seeds) {
    const ids = RNG.shuffle(PERSONAS.map(x => x.id), { s: (seed ^ 0x5bd1e995) >>> 0 }).slice(0, 3);
    const ps = ids.map(id => PERSONAS.find(x => x.id === id)), cfgs = ps.map(p => AI.personaConfig(p));
    const g = Engine.createGame(seed, ['A', 'B', 'C']); Engine.dispatch(g, { type: 'START_GAME' });
    for (let n = 0; !g.gameOver && n < 9000; n++) {
      const act = Engine.actors(g);
      const a = act.length ? AI.decide(buildView(g, act[0]), cfgs[act[0]]) : Engine.systemAction(g);
      if (!a || !Engine.dispatch(g, a).ok) break;
    }
    if (!g.gameOver) continue;
    const rec = Replay.fromState(g, { mode: 'free', seats: ids }), ms = [], aw = [];
    for (let p = 0; p < 3; p++) { const t = performance.now(); aw.push(Awards.read(rec, p)); ms.push(performance.now() - t); }
    if (aw.some(a => !a)) continue;
    out.push({ tiers: ps.map(p => p.tier), winner: g.winner, cost: aw.map(a => a.cost), bands: aw.map(a => a.band), ms, code: Replay.encode(rec) });
  }
  return { out, edges: Awards.EDGES };`;

const TARGET = [5, 12, 20, 26, 20, 12, 5];   /* bands 6 down to 0 */
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const f = (x, d = 3) => x.toFixed(d);

(async () => {
  const [g = '300', w = '4', s0 = '5150'] = process.argv.slice(2), games = Number(g), workers = Number(w);
  const srv = await serve(), browser = await launch(), t0 = Date.now();
  const seeds = Array.from({ length: games }, (_, i) => (Number(s0) * 1000003 + i * 104729) >>> 0);
  const R = await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const { page } = await openPage(browser, srv.url);
    const r = await run(page, PAGE, { seeds: seeds.filter((_, i) => i % workers === k) });
    await page.context().close(); return r;
  }));
  await browser.close(); srv.close();
  const G = R.flatMap(r => r.out), EDGES = R[0].edges;
  const seats = G.flatMap(gm => [0, 1, 2].map(p => ({ cost: gm.cost[p], band: gm.bands[p], tier: gm.tiers[p], won: gm.winner === p, ms: gm.ms[p] })));
  const ms = seats.map(x => x.ms).sort((a, b) => a - b);
  console.log(G.length + ' games, ' + seats.length + ' seat-games (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  console.log('time to grade a seat: median ' + Math.round(ms[ms.length >> 1]) + ' ms, 95% ' + Math.round(ms[Math.floor(ms.length * 0.95)]) + ' ms, most ' + Math.round(ms[ms.length - 1]) + ' ms');

  const costs = seats.map(x => x.cost).sort((a, b) => a - b);
  let cum = 0;
  const edges = TARGET.slice(0, 6).map(p => costs[Math.min(costs.length - 1, Math.round((cum += p) / 100 * costs.length))]);
  console.log('\nThe fit');
  console.log('  EDGES [' + edges.map(x => f(x)).join(', ') + '] (index.html: [' + EDGES.join(', ') + '])');

  const n = [6, 5, 4, 3, 2, 1, 0].map(b => seats.filter(x => x.band === b).length);
  console.log('\nBands with the constants in index.html, % of seat-games (target in brackets)');
  console.log('  ' + n.map((c, i) => (6 - i) + ': ' + f(100 * c / seats.length, 1) + ' (' + TARGET[i] + ')').join('  '));

  console.log('\nBy tier: mean cost per choice, win rate');
  for (const t of ['novice', 'casual', 'club', 'shark']) {
    const s = seats.filter(x => x.tier === t);
    if (s.length) console.log('  ' + t.padEnd(7) + ' n ' + String(s.length).padStart(4) + '  cost ' + f(mean(s.map(x => x.cost))) + '  won ' + f(100 * mean(s.map(x => x.won ? 1 : 0)), 0) + '%');
  }
  const xs = seats.map(x => x.cost), ys = seats.map(x => x.won ? 1 : 0), mx = mean(xs), my = mean(ys);
  const r = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0) * ys.reduce((a, y) => a + (y - my) ** 2, 0));
  console.log('  cost against winning: r ' + f(r, 2) + '; mean cost of winners ' + f(mean(seats.filter(x => x.won).map(x => x.cost))) + ', of losers ' + f(mean(seats.filter(x => !x.won).map(x => x.cost))));
  const lost = seats.filter(x => !x.won);
  console.log('  losses in band 6: ' + lost.filter(x => x.band === 6).length + ' of ' + lost.length + ', in band 5: ' + lost.filter(x => x.band === 5).length);

  console.log('\nOne replay code per band, graded for seat 0 (Load a code, with !dev awards=on)');
  for (let b = 6; b >= 0; b--) {
    const gm = G.find(x => x.bands[0] === b);
    console.log('  band ' + b + ': ' + (gm ? 'cost ' + f(gm.cost[0]) + ', ' + (gm.winner === 0 ? 'won' : 'lost') + '\n    ' + gm.code : 'none in these games'));
  }
})().catch(e => { console.error(e); process.exit(1); });
