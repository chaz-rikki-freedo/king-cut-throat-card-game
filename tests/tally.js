#!/usr/bin/env node
/* Not a check. Measures how well Tally (level 0: the fitted strength of what each seat was dealt) predicts the points
   a seat scores (docs/human-play.md, "Tally").
   Bot games play to the end, three default personalities at a table (the seed picks them). For every scored hand, Tally.read
   gives each seat's kept value, and the replay gives the points each seat scored in that hand. Prints:
     - the points of a seat-hand against its kept value: r, R2 and the slope, pooled and within the hand
     - the mean points by kept value, and by the seat's strength rank in the hand
     - for each game, a seat's share of the table's kept strength against its share of the points
   Usage: node tally.js [games=300] [workers=4] */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

const PAGE = `
  const { Engine, AI, Replay, RNG, Tally, Dynamic, buildView, PERSONAS } = KCT;
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
    const rec = Replay.fromState(g), t = Tally.read(rec);
    const cur = Replay.cursor(rec); let prev = [0, 0, 0]; const pts = [];
    for (let st; (st = cur.step());) {
      if (Dynamic.handEnded(st.events, cur.state)) { pts.push(cur.state.scores.map((v, i) => v - prev[i])); prev = cur.state.scores.slice(); }
    }
    const last = cur.state.scores.map((v, i) => v - prev[i]);
    if (last.some(x => x)) pts.push(last);
    const deals = t.deals.filter(d => d.scored && d.kept);
    if (deals.length === pts.length) out.push({ kept: deals.map(d => d.kept), dealt: deals.map(d => d.dealt), pts, final: cur.state.scores });
  }
  return out;`;

const sum = a => a.reduce((x, y) => x + y, 0), mean = a => sum(a) / a.length;
const sd = a => Math.sqrt(mean(a.map(x => (x - mean(a)) ** 2)));
const cov = (a, b) => { const ma = mean(a), mb = mean(b); return sum(a.map((x, i) => (x - ma) * (b[i] - mb))); };
const corr = (a, b) => cov(a, b) / Math.sqrt(cov(a, a) * cov(b, b));
const slope = (a, b) => cov(a, b) / cov(a, a);
const f = (x, d = 2) => x.toFixed(d);

(async () => {
  const [g = '300', w = '4'] = process.argv.slice(2), games = Number(g), workers = Number(w);
  const srv = await serve(), browser = await launch(), t0 = Date.now();
  const seeds = Array.from({ length: games }, (_, i) => (7777 * 1000003 + i * 104729) >>> 0);
  const G = (await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const { page } = await openPage(browser, srv.url);
    const r = await run(page, PAGE, { seeds: seeds.filter((_, i) => i % workers === k) });
    await page.context().close(); return r;
  }))).flat();
  await browser.close(); srv.close();

  const X = [], Y = [], Xd = [], RX = [], RY = [], rank = [[], [], []];
  let hands = 0;
  for (const gm of G) gm.kept.forEach((k, h) => {
    const p = gm.pts[h], d = gm.dealt[h], mk = mean(k), mp = mean(p);
    hands++;
    for (let i = 0; i < 3; i++) { X.push(k[i]); Y.push(p[i]); Xd.push(d[i]); RX.push(k[i] - mk); RY.push(p[i] - mp); }
    [0, 1, 2].sort((a, b) => k[b] - k[a]).forEach((seat, r) => rank[r].push(p[seat]));
  });
  console.log(G.length + ' games, ' + hands + ' scored hands, ' + X.length + ' seat-hands (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  console.log('points per seat-hand: mean ' + f(mean(Y)) + ', sd ' + f(sd(Y)) + '; kept value: mean ' + f(mean(X)) + ', sd ' + f(sd(X)));
  console.log('\nPoints of a seat-hand against its strength');
  console.log('  kept value, pooled       r ' + f(corr(X, Y), 3) + '  R2 ' + f(corr(X, Y) ** 2, 3) + '  slope ' + f(slope(X, Y), 3) + ' points per unit');
  console.log('  dealt value, pooled      r ' + f(corr(Xd, Y), 3) + '  R2 ' + f(corr(Xd, Y) ** 2, 3));
  console.log('  kept, within the hand    r ' + f(corr(RX, RY), 3) + '  R2 ' + f(corr(RX, RY) ** 2, 3) + '  slope ' + f(slope(RX, RY), 3));
  console.log('\nMean points by strength rank in the hand: strongest ' + f(mean(rank[0])) + ', middle ' + f(mean(rank[1])) + ', weakest ' + f(mean(rank[2])));
  console.log('Mean points by kept value');
  for (const [lo, hi] of [[0, 3], [3, 4], [4, 5], [5, 6], [6, 99]]) {
    const ys = Y.filter((_, i) => X[i] >= lo && X[i] < hi);
    console.log('  ' + lo + (hi === 99 ? '+' : '-' + hi) + ': n ' + ys.length + ', mean points ' + f(mean(ys)));
  }
  const ks = [], ds = [], ps = [];
  for (const gm of G) {
    const kt = [0, 1, 2].map(i => sum(gm.kept.map(h => h[i]))), dt = [0, 1, 2].map(i => sum(gm.dealt.map(h => h[i]))), P = sum(gm.final);
    if (!P) continue;
    for (let i = 0; i < 3; i++) { ks.push(kt[i] / sum(kt)); ds.push(dt[i] / sum(dt)); ps.push(gm.final[i] / P); }
  }
  console.log('\nA seat\'s share of the table\'s strength against its share of the points (' + ks.length + ' seat-games)');
  console.log('  kept share   r ' + f(corr(ks, ps), 3) + '  R2 ' + f(corr(ks, ps) ** 2, 3) + '  slope ' + f(slope(ks, ps)));
  console.log('  dealt share  r ' + f(corr(ds, ps), 3) + '  R2 ' + f(corr(ds, ps) ** 2, 3) + '  slope ' + f(slope(ds, ps)));
  console.log('  sd of kept share ' + f(sd(ks), 3) + ', sd of points share ' + f(sd(ps), 3) + ': a 1 sd swing of strength moves the points about ' + f(slope(ks, ps) * sd(ks) * 10, 1) + ' of 10');
})().catch(e => { console.error(e); process.exit(1); });
