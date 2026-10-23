#!/usr/bin/env node
/* Not a check. What naming trump is worth, by round and by hand value.
   At every bid, the hand is copied and played twice with the same deal: once with the player naming trump and once
   with the player passing (the others then bid as they would). The difference in the player's hand points is the
   value of the call at the margin. Also prints the points each role (namer, receiver, third) scores when the bots call
   as they do, and how much the gift adds to the receiver's hand value. Each hand starts at 3-3-3, so the 0 floor and
   the first-to-10 end never cut a score.
   Usage: node namer.js [deals=300] [workers=4] [play=fast|shark] [scenario=natural|forced] [seedBase=0]
   scenario: natural = stop at the first natural call; forced = every bidder passes in turn, through both rounds, so
   every deal gives six bids (round 1 and round 2 on the same deal). The others' hands are not selected by their passes.
   RAW=file writes one compact row per bid for further analysis.
   play: how the bots play the hand after the bid (fast = the rule-based play, shark = full play-outs; slow).
   Prints JSON. Results: docs/strategic-depth.md. */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');
const PAGE = `
  const { Engine, AI, buildView } = KCT;
  const P = Engine.P;
  const cfg = AI.personaConfig({ tier: 'shark', courage: 'normal', realTable: false, leadPick: 'shrewd' });
  const DONE = new Set([P.HAND_SCORE, P.SHOWDOWN_SCORE, P.ABANDONED, P.GAME_OVER]);
  const clone = s => JSON.parse(JSON.stringify(s));
  const step = (s, full) => {
    const actors = Engine.actors(s); let a;
    if (actors.length) {
      const p = actors[0];
      if (full || s.phase === P.DISCARD) { const v = buildView(s, p); a = AI.decide(v, cfg); if (Engine.validate(s, a)) a = AI.fallbackAction(v, cfg); }
      else a = AI.fastAction(s, p, cfg);
    } else a = Engine.systemAction(s);
    return !!a && Engine.dispatch(s, a).ok;
  };
  const finish = (s, full) => { let n = 0; while (!DONE.has(s.phase) && n++ < 400) if (!step(s, full)) return false; return DONE.has(s.phase); };
  const SUITS = ['S', 'H', 'D', 'C'];
  const turned = s => KCT.Rules.turnedSuit(s.flippedId, s.jokerSuit);
  const gain = (s, before) => s.scores.map((x, i) => x - before[i]);
  const out = [];
  for (const seed of arg.seeds) {
    const s = Engine.createGame(seed, ['A', 'B', 'C'], undefined, { mediatorLead: true });
    Engine.dispatch(s, Engine.systemAction(s));
    s.scores = [3, 3, 3];
    let guard = 0;
    while (s.phase !== P.BID1 && s.phase !== P.JOKER_VOID && guard++ < 60) if (!step(s, arg.full)) break;
    if (s.phase !== P.BID1) continue;
    const before = s.scores.slice(), rows = [];
    while ((s.phase === P.BID1 || s.phase === P.BID2) && rows.length < 6) {
      const p = s.bidTurn, round = s.phase === P.BID1 ? 1 : 2, nat = AI.fastAction(s, p, cfg);
      const natural = round === 1 ? nat.accept : nat.suit !== null;
      let suit;
      if (round === 1) suit = turned(s);
      else { suit = null; let best = -1e9; for (const x of SUITS) if (x !== turned(s)) { const v = AI.handValue(s.hands[p], x); if (v > best) { best = v; suit = x; } } }
      const hv = AI.handValue(s.hands[p], suit);
      const seatFromDealer = (p - s.dealer + 3) % 3;
      const A = clone(s), B = clone(s);
      const okA = Engine.dispatch(A, round === 1 ? { type: 'BID', player: p, accept: true } : { type: 'NAME', player: p, suit }).ok;
      let rec = null;
      if (okA) {
        const recv = A.receiver, pre = AI.handValue(A.hands[recv].filter(c => !A.received.includes(c)), A.trump);
        let g = 0; while (A.phase === P.EXCHANGE && g++ < 5) if (!step(A, false)) break;
        const post = AI.handValue(A.hands[recv], A.trump);
        const fa = finish(A, arg.full);
        rec = { fa, gainA: gain(A, before), outA: A.handSummary && A.handSummary.outcome, trA: A.handSummary && A.handSummary.tricks, giftGain: post - pre, recv };
      }
      const okB = Engine.dispatch(B, round === 1 ? { type: 'BID', player: p, accept: false } : { type: 'NAME', player: p, suit: null }).ok;
      let fb = false, gainB = null, outB = null;
      if (okB) { fb = finish(B, arg.full); gainB = gain(B, before); outB = B.handSummary && B.handSummary.outcome; }
      if (rec && rec.fa && fb) rows.push({ p, round, seatFromDealer, hv, natural, ...rec, gainB, outB });
      if (natural && !arg.forced) break;
      Engine.dispatch(s, arg.forced ? (round === 1 ? { type: 'BID', player: p, accept: false } : { type: 'NAME', player: p, suit: null }) : nat);
    }
    out.push(rows);
  }
  return out;`;
const BINS = [[-9, 1.5], [1.5, 2], [2, 2.5], [2.5, 3], [3, 3.5], [3.5, 4], [4, 99]];
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / Math.max(1, a.length - 1)); };
const r2 = x => Math.round(x * 100) / 100;
function summarize(rows) {
  const d = rows.map(r => r.gainA[r.p] - r.gainB[r.p]);
  return { n: rows.length, callMinusPass: r2(mean(d)), se: r2(sd(d) / Math.sqrt(Math.max(1, d.length))), callPts: r2(mean(rows.map(r => r.gainA[r.p]))), passPts: r2(mean(rows.map(r => r.gainB[r.p]))) };
}
(async () => {
  const [d = '300', w = '4', play = 'fast', scenario = 'natural', base = '0'] = process.argv.slice(2), deals = +d, workers = +w, forced = scenario === 'forced';
  const seeds = Array.from({ length: deals }, (_, i) => (17 * 7919 + (i + +base) * 104729) >>> 0);
  const srv = await serve(), browser = await launch(), t0 = Date.now();
  const res = (await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const mine = seeds.filter((_, i) => i % workers === k), { page } = await openPage(browser, srv.url), r = [];
    for (let i = 0; i < mine.length; i += 10) r.push(...await run(page, PAGE, { seeds: mine.slice(i, i + 10), full: play === 'shark', forced }));
    await page.context().close(); return r;
  }))).flat();
  await browser.close(); srv.close();
  const rows = res.flat();
  if (process.env.RAW) require('fs').writeFileSync(process.env.RAW, JSON.stringify(rows.map(r => ({ p: r.p, round: r.round, sf: r.seatFromDealer, hv: r.hv, ga: r.gainA[r.p], gb: r.gainB[r.p] }))));
  const byRound = {};
  for (const round of [1, 2]) {
    const rr = rows.filter(r => r.round === round);
    byRound[round] = { all: summarize(rr), byHandValue: BINS.map(([lo, hi]) => ({ hv: lo + ' to ' + hi, ...summarize(rr.filter(r => r.hv >= lo && r.hv < hi)) })).filter(x => x.n) };
  }
  const bySeat = {};
  for (const round of [1, 2]) for (const sf of [0, 1, 2]) {
    const rr = rows.filter(r => r.round === round && r.seatFromDealer === sf);
    if (rr.length) bySeat['round ' + round + ', seat ' + sf + ' from dealer'] = summarize(rr);
  }
  const COARSE = [[-9, 2.5], [2.5, 3.5], [3.5, 4], [4, 99]];
  const seatByHandValue = {};
  for (const round of [1, 2]) for (const sf of [0, 1, 2]) {
    const line = {};
    for (const [lo, hi] of COARSE) {
      const rr = rows.filter(r => r.round === round && r.seatFromDealer === sf && r.hv >= lo && r.hv < hi);
      if (rr.length >= 20) line['hv ' + lo + ' to ' + hi] = summarize(rr);
    }
    if (Object.keys(line).length) seatByHandValue['round ' + round + ', seat ' + sf + ' from dealer (0 = dealer, 1 = first to bid)'] = line;
  }
  const nat = rows.filter(r => r.natural);
  const pointsBySeat = {};
  for (const sf of [0, 1, 2]) {
    const mine = nat.map(r => r.gainA[(((r.p - r.seatFromDealer + 3) % 3) + sf) % 3]);
    pointsBySeat['seat ' + sf + ' from dealer'] = r2(mean(mine));
  }
  const roles = {};
  for (const round of [1, 2]) {
    const rr = nat.filter(r => r.round === round);
    if (!rr.length) continue;
    const third = r => [0, 1, 2].find(i => i !== r.p && i !== r.recv);
    roles['round ' + round] = {
      n: rr.length, namer: r2(mean(rr.map(r => r.gainA[r.p]))), receiver: r2(mean(rr.map(r => r.gainA[r.recv]))), third: r2(mean(rr.map(r => r.gainA[third(r)]))),
      giftHandValue: r2(mean(rr.map(r => r.giftGain))),
      namerWinsMostTricksPct: r2(100 * rr.filter(r => (r.outA === 'CLEAR_WINNER' || r.outA === 'NAMER_SWEEP') && r.trA[r.p] === Math.max(...r.trA)).length / rr.length),
      namerSweepPct: r2(100 * rr.filter(r => r.outA === 'NAMER_SWEEP').length / rr.length),
      nonNamerSweepPct: r2(100 * rr.filter(r => r.outA === 'NON_NAMER_SWEEP').length / rr.length),
      showdownPct: r2(100 * rr.filter(r => r.outA === 'SHOWDOWN').length / rr.length)
    };
  }
  console.log(JSON.stringify({ deals: res.length, calls: nat.length, playedBy: play, scenario, seconds: Math.round((Date.now() - t0) / 1000), valueOfNaming: byRound, bySeat, seatByHandValue, pointsBySeatPerHand: pointsBySeat, naturalCallsByRole: roles }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
