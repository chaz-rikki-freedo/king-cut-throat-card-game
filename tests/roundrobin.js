#!/usr/bin/env node
/* Round-robin of the ten personalities: every table of three bots, in every seat order, played to the end.
   Each game counts a win for the personality that wins it, and a game for each of the three.
   Usage: node roundrobin.js [games=4] [workers=4] [seed=1]
   games is the number per table of three, so 120 tables × games in all. The seat orders (6 per table) rotate
   from table to table, so each bot sits in each seat about equally often. A game takes about 3 s per worker.
   Prints JSON: per bot (games, wins, rate), per bot and seat, and per table. */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

const PAGE = `
  const { Engine, AI, buildView } = KCT;
  const out = [];
  for (const job of arg.jobs) {
    const cfgs = job.seats.map(id => AI.personaConfig(arg.personas[id]));
    const s = Engine.createGame(job.seed, job.seats.map(id => arg.personas[id].name));
    let steps = 0;
    while (!s.gameOver && steps++ < 5000) {
      const actors = Engine.actors(s);
      let a;
      if (actors.length) {
        const p = actors[0], v = buildView(s, p);
        a = AI.decide(v, cfgs[p]);
        if (Engine.validate(s, a)) a = AI.fallbackAction(v, cfgs[p]);
      } else a = Engine.systemAction(s);
      if (!a) break;
      const r = Engine.dispatch(s, a);
      if (!r.ok) break;
    }
    out.push({ seats: job.seats, winner: s.gameOver ? s.winner : null, hands: s.handNumber });
  }
  return out;`;

(async () => {
  const [g = '4', w = '4', sd = '1'] = process.argv.slice(2);
  const games = Number(g), workers = Number(w), seed0 = Number(sd);
  const srv = await serve(), browser = await launch();
  const { page } = await openPage(browser, srv.url);
  const list = await page.evaluate(() => {
    /* PERSONAS is not on KCT; personaConfig takes the persona object, so read the fields from the page script. */
    return typeof PERSONAS !== 'undefined' ? PERSONAS.map(x => Object.assign({}, x)) : null;
  });
  await page.context().close();
  if (!list) throw new Error('PERSONAS not reachable from the page');
  const P = Object.fromEntries(list.map(x => [x.id, x])), ids = list.map(x => x.id);

  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const jobs = [];
  let n = 0, t = 0;
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) for (let c = b + 1; c < ids.length; c++) {
    const trio = [ids[a], ids[b], ids[c]];
    for (let k = 0; k < games; k++) jobs.push({ seats: perms[(t + k) % 6].map(i => trio[i]), seed: (seed0 * 1000003 + n++) >>> 0 });
    t++;
  }
  const shards = Array.from({ length: workers }, (_, i) => jobs.filter((_, j) => j % workers === i));
  const t0 = Date.now();
  const results = (await Promise.all(shards.map(async (sh) => {
    const { page: pg, errors } = await openPage(browser, srv.url);
    const res = [];
    for (let i = 0; i < sh.length; i += 200) res.push(...await run(pg, PAGE, { jobs: sh.slice(i, i + 200), personas: P }));
    if (errors.length) console.error(errors.slice(0, 5));
    await pg.context().close();
    return res;
  }))).flat();
  await browser.close(); srv.close();

  const bots = Object.fromEntries(ids.map(id => [id, { games: 0, wins: 0, seat: [[0, 0], [0, 0], [0, 0]] }]));
  const tables = {};
  let unfinished = 0;
  for (const r of results) {
    if (r.winner === null) { unfinished++; continue; }
    const key = r.seats.slice().sort().join('-');
    tables[key] = tables[key] || Object.fromEntries(r.seats.slice().sort().map(id => [id, 0]));
    r.seats.forEach((id, p) => {
      const b = bots[id]; b.games++; b.seat[p][0]++;
      if (p === r.winner) { b.wins++; b.seat[p][1]++; tables[key][id]++; }
    });
  }
  const pct = (x, y) => y ? Math.round(1000 * x / y) / 10 : null;
  const summary = ids.map(id => ({ id, games: bots[id].games, wins: bots[id].wins, rate: pct(bots[id].wins, bots[id].games),
    seats: bots[id].seat.map(([gm, wn]) => pct(wn, gm)) })).sort((x, y) => y.rate - x.rate);
  console.log(JSON.stringify({ gamesPerTable: games, total: results.length, unfinished, seconds: Math.round((Date.now() - t0) / 1000), summary, tables }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
