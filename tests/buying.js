#!/usr/bin/env node
/* Not a check. Measures what buying trump earns: for each buy or pass, the player's hand value in the suit on offer,
   their seat (dealer's left, second, dealer) and the points they scored in that hand, Showdown included.
   Three Shark bots play. Round 1 values are for the turned suit; round 2 values are for the player's best suit that
   is not blocked, which is not always the suit named. The bots choose when to buy, so buyers and passers are not
   random groups at a hand value.
   Usage: node buying.js [games=600] [workers=4] [seed=17]
   Prints JSON: points per hand for buyers and passers by hand value, and in hands of value 3 to 5, by seat.
   Results: docs/strategic-depth.md, "Buying by seat". */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

const PAGE = `
  const { Engine, AI, buildView } = KCT;
  const P = Engine.P, cfg = AI.personaConfig({ tier: 'shark', courage: 'normal', realTable: false, leadPick: 'fair' });
  const SUITS = ['S', 'H', 'D', 'C'], out = [];
  for (const seed of arg.seeds) {
    const s = Engine.createGame(seed, ['A', 'B', 'C']);
    let steps = 0, last = null, h = null;
    /* A hand runs from round 1 to the next deal (or the end of the game), so it counts King points and the Showdown. */
    const close = () => { if (h) { h.pts = s.scores.map((v, i) => v - h.start[i]); delete h.start; out.push(h); h = null; } };
    while (!s.gameOver && steps++ < 8000) {
      if (s.phase !== last) {
        if (s.phase === P.BID1 && !h) {
          const t = buildView(s, 0).flippedSuit;
          h = { start: s.scores.slice(), dealer: s.dealer,
                v1: s.hands.map(x => AI.handValue(x, t)),
                v2: s.hands.map(x => Math.max(...SUITS.filter(u => u !== t).map(u => AI.handValue(x, u)))) };
        }
        /* The bid log is cleared at the next deal, so it is kept as soon as the bidding ends. */
        if (h && !h.bids && s.phase !== P.BID1 && s.phase !== P.BID2) h.bids = s.bidLog.slice();
        if ((s.phase === P.HAND_START || s.phase === P.DEAL) && h) close();
        last = s.phase;
      }
      const actors = Engine.actors(s);
      let a;
      if (actors.length) { const v = buildView(s, actors[0]); a = AI.decide(v, cfg); if (Engine.validate(s, a)) a = AI.fallbackAction(v, cfg); }
      else a = Engine.systemAction(s);
      if (!a || !Engine.dispatch(s, a).ok) break;
    }
    close();
  }
  return out;`;

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const r2 = x => Math.round(x * 100) / 100;
/* Mean with a 95% margin. */
function pts(a) {
  if (!a.length) return { n: 0 };
  const m = mean(a);
  return { n: a.length, mean: r2(m), margin: r2(1.96 * Math.sqrt(mean(a.map(v => (v - m) ** 2)) / a.length)) };
}
const BUCKETS = [['<2', 0, 2], ['2-3', 2, 3], ['3-4', 3, 4], ['4-5', 4, 5], ['5+', 5, Infinity]];
const SEATS = [[1, "dealer's left"], [2, 'second'], [0, 'dealer']];

(async () => {
  const [g = '600', w = '4', sd = '17'] = process.argv.slice(2);
  const games = Number(g), workers = Number(w), seed0 = Number(sd);
  const seeds = Array.from({ length: games }, (_, i) => (seed0 * 7919 + i * 104729) >>> 0);
  const srv = await serve(), browser = await launch();
  const t0 = Date.now();
  const hands = (await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const mine = seeds.filter((_, i) => i % workers === k), { page, errors } = await openPage(browser, srv.url), r = [];
    for (let i = 0; i < mine.length; i += 10) r.push(...await run(page, PAGE, { seeds: mine.slice(i, i + 10) }));
    if (errors.length) console.error(errors.slice(0, 3));
    await page.context().close(); return r;
  }))).flat();
  await browser.close(); srv.close();

  const rows = [];
  for (const h of hands) for (const b of h.bids || []) {
    const p = b.player;
    rows.push({ round: b.round, buy: b.action !== 'pass', seat: (p - h.dealer + 3) % 3, value: b.round === 1 ? h.v1[p] : h.v2[p],
      pts: h.pts[p], left: h.pts[(p + 1) % 3] });
  }
  const round = rd => {
    const rs = rows.filter(x => x.round === rd);
    return {
      byValue: BUCKETS.map(([name, lo, hi]) => {
        const s = rs.filter(x => x.value >= lo && x.value < hi), bought = s.filter(x => x.buy);
        return { value: name, buy: pts(bought.map(x => x.pts)), pass: pts(s.filter(x => !x.buy).map(x => x.pts)),
          buyRate: s.length ? r2(bought.length / s.length) : null, leftAfterBuy: pts(bought.map(x => x.left)) };
      }),
      bySeatValue3to5: SEATS.map(([seat, name]) => {
        const s = rs.filter(x => x.seat === seat && x.value >= 3 && x.value < 5);
        return { seat: name, buy: pts(s.filter(x => x.buy).map(x => x.pts)), pass: pts(s.filter(x => !x.buy).map(x => x.pts)) };
      })
    };
  };
  console.log(JSON.stringify({ games, hands: hands.length, seconds: Math.round((Date.now() - t0) / 1000),
    pointsPerSeatPerHand: r2(mean(hands.flatMap(h => h.pts))), round1: round(1), round2: round(2) }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
