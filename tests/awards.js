#!/usr/bin/env node
/* Not a check. Fits and checks the award bands (Awards in index.html, section 6f; docs/human-play.md, "Awards").
   Bot games play to the end, three default personalities at a table (the seed picks them). For every seat of every
   game: its share of the kept strength (Tally) and its share of the points. Prints:
     - the fit: SLOPE (points share against kept share) and the EDGES that put 5, 12, 20, 26, 20, 12 and 5% of the
       seat-games in bands 0 to 6, to copy into index.html when they move
     - the bands that Awards.read gives with the constants in index.html, as % of seat-games (the fit's targets)
     - one replay code per band, graded for seat 0: paste it in Menu -> Load a code with !dev awards=on, and the
       game-over box at its end shows that band's stroke
   Usage: node awards.js [games=600] [workers=4] [first seed=5150] */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

const PAGE = `
  const { Engine, AI, Replay, RNG, Tally, Awards, buildView, PERSONAS } = KCT;
  const out = [];
  for (const seed of arg.seeds) {
    const ids = RNG.shuffle(PERSONAS.map(x => x.id), { s: (seed ^ 0x5bd1e995) >>> 0 }).slice(0, 3);
    const cfgs = ids.map(id => AI.personaConfig(PERSONAS.find(x => x.id === id)));
    const g = Engine.createGame(seed, ['A', 'B', 'C']); Engine.dispatch(g, { type: 'START_GAME' });
    for (let n = 0; !g.gameOver && n < 9000; n++) {
      const act = Engine.actors(g);
      const a = act.length ? AI.decide(buildView(g, act[0]), cfgs[act[0]]) : Engine.systemAction(g);
      if (!a || !Engine.dispatch(g, a).ok) break;
    }
    if (!g.gameOver) continue;
    const rec = Replay.fromState(g, { mode: 'free', seats: ids }), t = Tally.read(rec), total = g.scores[0] + g.scores[1] + g.scores[2];
    if (!t || !t.scored || total <= 0) continue;
    out.push({ kept: t.share.kept, points: g.scores.map(x => x / total), bands: [0, 1, 2].map(p => Awards.read(rec, p).band), code: Replay.encode(rec) });
  }
  return { out, slope: Awards.SLOPE, edges: Awards.EDGES };`;

const TARGET = [5, 12, 20, 26, 20, 12, 5];
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const f = (x, d = 3) => x.toFixed(d);

(async () => {
  const [g = '600', w = '4', s0 = '5150'] = process.argv.slice(2), games = Number(g), workers = Number(w);
  const srv = await serve(), browser = await launch(), t0 = Date.now();
  const seeds = Array.from({ length: games }, (_, i) => (Number(s0) * 1000003 + i * 104729) >>> 0);
  const R = await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const { page } = await openPage(browser, srv.url);
    const r = await run(page, PAGE, { seeds: seeds.filter((_, i) => i % workers === k) });
    await page.context().close(); return r;
  }));
  await browser.close(); srv.close();
  const G = R.flatMap(r => r.out), { slope: SLOPE, edges: EDGES } = R[0];

  const X = G.flatMap(x => x.kept), Y = G.flatMap(x => x.points), mx = mean(X), my = mean(Y);
  const slope = X.reduce((a, x, i) => a + (x - mx) * (Y[i] - my), 0) / X.reduce((a, x) => a + (x - mx) ** 2, 0);
  const gaps = X.map((x, i) => Y[i] - (1 / 3 + slope * (x - 1 / 3))).sort((a, b) => a - b);
  let cum = 0;
  const edges = TARGET.slice(0, 6).map(p => gaps[Math.min(gaps.length - 1, Math.round((cum += p) / 100 * gaps.length))]);
  console.log(G.length + ' games, ' + X.length + ' seat-games (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  console.log('\nThe fit');
  console.log('  SLOPE ' + f(slope, 2) + ' (index.html: ' + SLOPE + ')');
  console.log('  EDGES [' + edges.map(x => f(x)).join(', ') + '] (index.html: [' + EDGES.join(', ') + '])');

  const B = G.flatMap(x => x.bands), n = [0, 1, 2, 3, 4, 5, 6].map(b => B.filter(x => x === b).length);
  console.log('\nBands with the constants in index.html, % of seat-games (target in brackets)');
  console.log('  ' + n.map((c, b) => b + ': ' + f(100 * c / B.length, 1) + ' (' + TARGET[b] + ')').join('  '));

  console.log('\nOne replay code per band, graded for seat 0 (Load a code, with !dev awards=on)');
  for (let b = 0; b < 7; b++) {
    const gm = G.find(x => x.bands[0] === b);
    console.log('  band ' + b + ': ' + (gm ? 'points ' + f(100 * gm.points[0], 0) + '%, kept ' + f(100 * gm.kept[0], 0) + '%\n    ' + gm.code : 'none in these games'));
  }
})().catch(e => { console.error(e); process.exit(1); });
