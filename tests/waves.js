#!/usr/bin/env node
/* Not a check. Measures each wave's youWin: the win rate (%) of a human-style bot (Casual, Real table, as the Settings
   panel set it before seat settings) in your seat against the wave's two personalities, as they play now.
   Prints, per wave, the measured rate with its 95% margin and the youWin in WAVES, and whether the rates still fall
   from wave to wave. --json prints the rates as JSON. shark measures the Shark run instead (waves 19 to 36: the same
   tables with both bots at Shark skill); its youWin values are SHARK_WIN in index.html, from 60 games per table.
   Usage: node waves.js [shark] [games=150] [workers=4] [seed=1] [--json] */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

const PAGE = `
  const { Engine, AI, buildView, WAVES } = KCT;
  /* The human-style bot: Casual skill with Real table, not a personality (so Real table adds its extra hand value). */
  const human = AI.config(AI.withSkillTier(AI.DEFAULT_CONFIG, 'casual'), { style: { realTable: true } });
  const out = [];
  for (const job of arg.jobs) {
    const w = WAVES[job.wave - 1];
    const bot = id => { const x = PERSONAS.find(p => p.id === id); return AI.personaConfig(w.shark ? Object.assign({}, x, { tier: 'shark' }) : x); };
    const cfgs = [human, bot(w.west), bot(w.east)];
    const s = Engine.createGame(job.seed, ['You', 'West', 'East']);
    for (let n = 0; !s.gameOver && n < 5000; n++) {
      const act = Engine.actors(s);
      let a;
      if (act.length) { const v = buildView(s, act[0]); a = AI.decide(v, cfgs[act[0]]); if (Engine.validate(s, a)) a = AI.fallbackAction(v, cfgs[act[0]]); }
      else a = Engine.systemAction(s);
      if (!a || !Engine.dispatch(s, a).ok) break;
    }
    out.push({ wave: job.wave, done: s.gameOver, won: s.gameOver && s.winner === 0 });
  }
  return out;`;

(async () => {
  const args = process.argv.slice(2), json = args.includes('--json'), shark = args.includes('shark');
  const [g = '150', w = '4', sd = '1'] = args.filter(x => x !== '--json' && x !== 'shark');
  const games = Number(g), workers = Number(w), seed0 = Number(sd);
  const srv = await serve(), browser = await launch();
  const { page } = await openPage(browser, srv.url);
  const waves = (await run(page, 'return KCT.WAVES.map(x => ({ n: x.n, k: x.k, shark: x.shark, west: x.west, east: x.east, youWin: x.youWin }));')).filter(x => x.shark === shark);
  await page.context().close();
  const jobs = [];
  for (const wv of waves) for (let i = 0; i < games; i++) jobs.push({ wave: wv.n, seed: (seed0 * 1000003 + wv.n * 100003 + i * 7919) >>> 0 });
  const shards = Array.from({ length: workers }, (_, i) => jobs.filter((_, j) => j % workers === i));
  const t0 = Date.now();
  const res = (await Promise.all(shards.map(async sh => {
    const { page: pg, errors } = await openPage(browser, srv.url);
    const r = [];
    for (let i = 0; i < sh.length; i += 100) r.push(...await run(pg, PAGE, { jobs: sh.slice(i, i + 100) }));
    if (errors.length) console.error(errors.slice(0, 5));
    await pg.context().close();
    return r;
  }))).flat();
  await browser.close(); srv.close();
  const rows = waves.map(wv => {
    const mine = res.filter(r => r.wave === wv.n && r.done);
    const rate = mine.length ? 100 * mine.filter(r => r.won).length / mine.length : null;
    return Object.assign({}, wv, { games: mine.length, rate: rate === null ? null : Math.round(rate), margin: mine.length ? Math.round(196 * Math.sqrt(0.25 / mine.length)) : null });
  });
  if (json) { console.log(JSON.stringify({ games, seconds: Math.round((Date.now() - t0) / 1000), rows }, null, 1)); return; }
  console.log((shark ? 'Shark run: ' : 'Waves: ') + games + ' games per wave, ' + Math.round((Date.now() - t0) / 1000) + ' s. Your seat: Casual, Real table.');
  console.log('wave  west/east     youWin  now   margin');
  for (const r of rows) console.log((shark ? 'S' + r.k : String(r.n)).padStart(4) + '  ' + (r.west + '/' + r.east).padEnd(12) + String(r.youWin).padStart(6) + '%' + String(r.rate).padStart(5) + '%   ±' + r.margin);
  const ups = rows.slice(1).filter((r, i) => r.rate > rows[i].rate + rows[i].margin);
  console.log(ups.length ? 'Easier for you than the wave before, by more than the margin: ' + ups.map(r => 'wave ' + r.n).join(', ') : 'Each wave is at least as hard as the one before, within the margin.');
})().catch(e => { console.error(e); process.exit(1); });
