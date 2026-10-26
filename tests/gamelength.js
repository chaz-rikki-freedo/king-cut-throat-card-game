#!/usr/bin/env node
/* Not a check. Measures how many hands a game takes, at tables of different strength.
   A hand is a deal that players count: a Joker redeal is the same hand (handNo in index.html).
   Tables: three Sharks; three Novices; three Novices with 1 hunch, 90% brain farts and bold courage;
   one Shark against two of those. In the mixed table the Shark's seat rotates.
   Usage: node gamelength.js [games=600] [workers=4] [seed=13] [table]
   Prints JSON per table: hands per game (fewest, percentiles, most), the games of 5 hands or fewer,
   and the most points one player scored in one hand. */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

const PAGE = `
  const { Engine, AI, buildView } = KCT;
  const mk = c => { const b = AI.personaConfig({ tier: c.tier, courage: c.courage || 'normal', realTable: false, leadPick: 'fair' });
    return c.thinking ? Object.freeze({ thinking: Object.freeze(Object.assign({}, b.thinking, c.thinking)), knowledge: b.knowledge, style: b.style, persona: b.persona }) : b; };
  const out = [];
  for (const job of arg.jobs) {
    const cfgs = [0, 1, 2].map(p => mk(arg.seats[(p + job.turn) % 3]));
    const s = Engine.createGame(job.seed, ['A', 'B', 'C']);
    let steps = 0, last = null, before = [0, 0, 0], best = 0;
    const close = () => { for (let p = 0; p < 3; p++) best = Math.max(best, s.scores[p] - before[p]); before = s.scores.slice(); };
    while (!s.gameOver && steps++ < 100000) {
      if (s.phase !== last) { if (s.phase === Engine.P.HAND_START) close(); last = s.phase; }
      const actors = Engine.actors(s);
      let a;
      if (actors.length) { const p = actors[0], v = buildView(s, p); a = AI.decide(v, cfgs[p]); if (Engine.validate(s, a)) a = AI.fallbackAction(v, cfgs[p]); }
      else a = Engine.systemAction(s);
      if (!a || !Engine.dispatch(s, a).ok) break;
    }
    close();
    out.push({ seed: job.seed, hands: s.handNumber - (s.redeals || 0), best, over: !!s.gameOver });
  }
  return out;`;

const SHARK = { tier: 'shark' }, NOVICE = { tier: 'novice' }, FEEDER = { tier: 'novice', courage: 'bold', thinking: { worlds: 1, playoutSkill: 0.1 } };
const TABLES = {
  shark: [SHARK, SHARK, SHARK],
  novice: [NOVICE, NOVICE, NOVICE],
  feeders: [FEEDER, FEEDER, FEEDER],
  'shark+feeders': [SHARK, FEEDER, FEEDER]
};

(async () => {
  const [g = '600', w = '4', sd = '13', only] = process.argv.slice(2);
  const games = Number(g), workers = Number(w), seed0 = Number(sd);
  const srv = await serve(), browser = await launch(), t0 = Date.now(), res = {};
  for (const [name, seats] of Object.entries(TABLES)) {
    if (only && only !== name) continue;
    const jobs = Array.from({ length: games }, (_, i) => ({ seed: (seed0 * 7919 + i * 104729) >>> 0, turn: i % 3 }));
    const all = (await Promise.all(Array.from({ length: workers }, async (_, k) => {
      const mine = jobs.filter((_, i) => i % workers === k), { page, errors } = await openPage(browser, srv.url), r = [];
      for (let i = 0; i < mine.length; i += 10) r.push(...await run(page, PAGE, { seats, jobs: mine.slice(i, i + 10) }));
      if (errors.length) console.error(errors.slice(0, 3));
      await page.context().close(); return r;
    }))).flat();
    const h = all.map(r => r.hands).sort((a, b) => a - b), q = p => h[Math.min(h.length - 1, Math.floor(p * h.length))];
    const short = {}, best = {};
    for (const x of h) if (x <= 5) short[x] = (short[x] || 0) + 1;
    for (const r of all) best[r.best] = (best[r.best] || 0) + 1;
    res[name] = { games: all.length, unfinished: all.filter(r => !r.over).length, mean: Math.round(h.reduce((a, b) => a + b, 0) / h.length * 10) / 10,
      fewest: h[0], p1: q(0.01), p5: q(0.05), median: q(0.5), p95: q(0.95), p99: q(0.99), most: h[h.length - 1],
      gamesOf5OrFewer: short, bestHandPoints: best, shortest: all.filter(r => r.hands === h[0]).slice(0, 3).map(r => r.seed),
      longest: all.filter(r => r.hands === h[h.length - 1]).slice(0, 3).map(r => r.seed) };
    console.error(name + ': ' + JSON.stringify(res[name]));
  }
  await browser.close(); srv.close();
  console.log(JSON.stringify(Object.assign({ seconds: Math.round((Date.now() - t0) / 1000) }, res), null, 1));
})();
