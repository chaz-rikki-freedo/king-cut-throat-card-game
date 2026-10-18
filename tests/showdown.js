#!/usr/bin/env node
/* Not a check. How often hands end in a Showdown, and what the Showdown lead is worth.
   Every game uses the house rule Mediator picks the Showdown lead. Tables: shark (three Sharks, Shrewd pick),
   wave15 (a Casual, Real table bot in seat 0, Vex West, Lou East, as personalities).
   Usage: node showdown.js <shark|wave15> [games=300] [workers=4]
   Prints JSON: the trick splits of complete hands, the Showdown rate, how often the Showdown leader wins,
   the mediator per seat, how often the mediator was the caller, and each seat's game wins. Results: docs/strategic-depth.md. */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');
const PAGE = `
  const { Engine, AI, buildView } = KCT;
  const P = Engine.P;
  const cfgs = arg.seats.map(x => AI.personaConfig(x));
  const out = [];
  for (const seed of arg.seeds) {
    const s = Engine.createGame(seed, ['A','B','C'], undefined, { mediatorLead: true });
    let steps = 0, last = null, before = null, games = { hands: [], winner: null };
    while (!s.gameOver && steps++ < 9000) {
      if (s.phase !== last) {
        if (s.phase === P.HAND_START || s.phase === P.DEAL) before = s.scores.slice();
        if ((s.phase === P.HAND_SCORE || s.phase === P.SHOWDOWN_SETUP) && s.handSummary && !s.handSummary._r) {
          s.handSummary._r = 1; games.hands.push({ t: s.tricksWon.slice(), caller: s.caller, before: before && before.slice(), sd: s.phase === P.SHOWDOWN_SETUP ? { med: s.showdown.mediator, parts: s.showdown.participants.slice() } : null });
        }
        if (s.phase === P.SHOWDOWN_SCORE) { const h = games.hands[games.hands.length - 1]; h.sd.lead = s.showdown.lead.player; h.sd.win = s.handSummary.showdown.winner; }
        last = s.phase;
      }
      const actors = Engine.actors(s); let a;
      if (actors.length) { const v = buildView(s, actors[0]); a = AI.decide(v, cfgs[actors[0]]); if (Engine.validate(s, a)) a = AI.fallbackAction(v, cfgs[actors[0]]); }
      else a = Engine.systemAction(s);
      if (!a || !Engine.dispatch(s, a).ok) break;
    }
    games.winner = s.scores.indexOf(Math.max(...s.scores)); games.final = s.scores.slice();
    out.push(games);
  }
  return out;`;
const TABLES = {
  shark: [0,1,2].map(() => ({ tier: 'shark', courage: 'normal', realTable: false, leadPick: 'shrewd' })),
  wave15: [{ tier: 'casual', courage: 'normal', realTable: true, leadPick: 'fair' }, { tier: 'shark', courage: 'bold', realTable: false, leadPick: 'impulsive' }, { tier: 'novice', courage: 'timid', realTable: false, leadPick: 'fair' }]
};
(async () => {
  const [name, g = '300', w = '4'] = process.argv.slice(2), games = +g, workers = +w;
  const seeds = Array.from({ length: games }, (_, i) => (31 * 7919 + i * 104729) >>> 0);
  const srv = await serve(), browser = await launch();
  const res = (await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const mine = seeds.filter((_, i) => i % workers === k), { page } = await openPage(browser, srv.url), r = [];
    for (let i = 0; i < mine.length; i += 10) r.push(...await run(page, PAGE, { seeds: mine.slice(i, i + 10), seats: TABLES[name] }));
    await page.context().close(); return r;
  }))).flat();
  await browser.close(); srv.close();
  const hands = res.flatMap(x => x.hands.filter(h => h.t.reduce((a, b) => a + b, 0) === 7));
  const key = h => h.t.slice().sort((a, b) => b - a).join('-');
  const splits = {}; hands.forEach(h => splits[key(h)] = (splits[key(h)] || 0) + 1);
  const sds = hands.filter(h => h.sd && h.sd.win != null);
  const leadWin = sds.filter(h => h.sd.lead === h.sd.win).length;
  const medBySeat = [0,1,2].map(p => sds.filter(h => h.sd.med === p).length);
  const medCaller = sds.filter(h => h.sd.med === h.caller).length;
  const seatWins = [0,1,2].map(p => res.filter(x => x.winner === p).length);
  const pct = (a, b) => Math.round(1000 * a / b) / 10;
  console.log(JSON.stringify({ table: name, games: res.length, hands: hands.length,
    splitsPct: Object.fromEntries(Object.entries(splits).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, pct(v, hands.length)])),
    showdownPct: pct(sds.length, hands.length), showdownLeaderWinsPct: pct(leadWin, sds.length), showdowns: sds.length,
    mediatorBySeat: medBySeat, mediatorWasCallerPct: pct(medCaller, sds.length), seatWinsPct: seatWins.map(x => pct(x, res.length)) }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
