#!/usr/bin/env node
/* Not a check. Measures the Dynamic post-game review and its signals (issue #117).
   A "player" seat (rotating) plays at a row of the easing ladder against two Casual bots. A "new player" setting
   plays at the floor and throws away its 3 best cards at every first discard.
   At every player decision a Club bot decides on the same view: timed (the cost of a review that judges every decision)
   and compared with the player's action. Per hand: discard loss and hand value at bid time (data/handvalue-fit.json),
   calls, failed calls, tricks and points. Prints, per setting: timing, the signals, how many hands each signal needs
   to tell that setting from row 0, and how often the fast-path triggers of decision 19 fire.
   Usage: node review.js [games-per-setting=150] [workers=4] */
'use strict';
const fs = require('fs'), path = require('path');
const { serve, launch, openPage, run } = require('./lib/browser');

const OFF = { bids: false, turnedCard: false, ownDiscards: false, voids: false, scoreAware: false, showdownPlans: false };
const SETTINGS = [
  { name: 'row 0 (Shark)', tier: 'shark' },
  { name: 'row 2 (10 hunches)', tier: 'shark', thinking: { worlds: 10 } },
  { name: 'row 4 (5 hunches, knowledge off)', tier: 'shark', thinking: { worlds: 5 }, knowledge: OFF },
  { name: 'row 6 (Novice)', tier: 'shark', thinking: { worlds: 3, playoutSkill: 0.4 }, knowledge: OFF },
  { name: 'row 8 (floor)', tier: 'shark', thinking: { worlds: 1, playoutSkill: 0.4 }, knowledge: OFF },
  { name: 'new player (floor, throws best cards)', tier: 'shark', thinking: { worlds: 1, playoutSkill: 0.4 }, knowledge: OFF, throwsBest: true }
];

const PAGE = `
  const { Engine, AI, Rules: R, buildView } = KCT;
  const P = Engine.P, W = arg.fit;
  function bestKeep(h, k) {
    let b = -1e9;
    const rec = (i, pick) => { if (pick.length === k) { b = Math.max(b, heBest(W, pick)); return; } for (let j = i; j < h.length; j++) { pick.push(h[j]); rec(j + 1, pick); pick.pop(); } };
    rec(0, []); return b;
  }
  const mk = c => {
    const base = AI.personaConfig({ tier: c.tier, courage: 'normal', realTable: false, leadPick: 'fair' });
    return Object.freeze({ thinking: Object.freeze(Object.assign({}, base.thinking, c.thinking || {})),
      knowledge: Object.freeze(Object.assign({}, base.knowledge, c.knowledge || {})), style: base.style, persona: base.persona });
  };
  const club = mk({ tier: 'club' }), casual = mk({ tier: 'casual' });
  const same = (x, y) => { const n = a => JSON.stringify(Object.keys(a).filter(k => k !== 'player').sort().map(k => [k, Array.isArray(a[k]) ? a[k].slice().sort() : a[k]])); return n(x) === n(y); };
  const out = [];
  for (const job of arg.jobs) {
    const me = job.seat, cfg = mk(job.setting), s = Engine.createGame(job.seed, ['A', 'B', 'C']);
    const g = { name: job.setting.name, seat: me, decisions: [], hands: [] };
    let hand = null, steps = 0, last = null;
    while (!s.gameOver && steps++ < 8000) {
      if (s.phase !== last) {
        if (s.phase === P.DISCARD && !hand) hand = { dealt: s.hands[me].slice(), scoreBefore: s.scores[me] };
        if (s.phase === P.BID1 && hand && !hand.kept) { hand.kept = s.hands[me].slice(); hand.keptValue = heBest(W, hand.kept); hand.bestKeep = bestKeep(hand.dealt, hand.kept.length); }
        if (s.phase === P.TRICK_PLAY && hand && hand.caller === undefined) { hand.caller = s.caller; hand.receiver = s.receiver; }
        if ((s.phase === P.HAND_SCORE || s.phase === P.SHOWDOWN_SETUP) && hand && hand.tricks === undefined) { hand.tricks = s.tricksWon[me]; hand.allTricks = s.tricksWon.slice(); hand.showdown = s.phase === P.SHOWDOWN_SETUP; }
        if (s.phase === P.HAND_START && hand) { hand.scoreAfter = s.scores[me]; g.hands.push(hand); hand = null; }
        last = s.phase;
      }
      const actors = Engine.actors(s);
      let a;
      if (actors.length) {
        const p = actors[0], v = buildView(s, p);
        if (p === me) {
          if (job.setting.throwsBest && s.phase === P.DISCARD) {
            const h = s.hands[me], bs = R.SUITS.reduce((x, y) => heValue(W, h, y) > heValue(W, h, x) ? y : x);
            a = { type: 'DISCARD', player: me, cards: h.slice().sort((x, y) => R.getCardStrength(y, bs) - R.getCardStrength(x, bs)).slice(0, Engine.C.INITIAL_DISCARD) };
          } else a = AI.decide(v, cfg);
          if (Engine.validate(s, a)) a = AI.fallbackAction(v, cfg);
          const t0 = performance.now(), ref = AI.decide(buildView(s, p), club), ms = performance.now() - t0;
          g.decisions.push({ phase: s.phase, ms, agree: same(ref, a) });
          if (a.type === 'BID' && hand && a.accept) hand.callValue = s.phase === P.BID1 ? heValue(W, s.hands[me], R.turnedSuit(s.flippedId, s.jokerSuit)) : heBest(W, s.hands[me]);
        } else { a = AI.decide(v, casual); if (Engine.validate(s, a)) a = AI.fallbackAction(v, casual); }
      } else a = Engine.systemAction(s);
      if (!a || !Engine.dispatch(s, a).ok) break;
    }
    if (hand && hand.tricks !== undefined) { hand.scoreAfter = s.scores[me]; g.hands.push(hand); }
    const tot = s.scores.reduce((x, y) => x + y, 0);
    g.done = s.gameOver; g.win = s.gameOver && s.winner === me; g.share = tot ? s.scores[me] / tot : 1 / 3;
    out.push(g);
  }
  return out;`;

const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const pct = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const r2 = x => Math.round(x * 100) / 100;
/* Share of 3-hand windows in which at least 2 hands meet the test. */
function windows(lists, test) {
  let hit = 0, n = 0;
  for (const l of lists) for (let i = 2; i < l.length; i++) { n++; if ([l[i], l[i - 1], l[i - 2]].filter(test).length >= 2) hit++; }
  return n ? Math.round(1000 * hit / n) / 10 : null;
}

(async () => {
  const [g = '150', w = '4'] = process.argv.slice(2), games = Number(g), workers = Number(w);
  const fit = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'handvalue-fit.json'), 'utf8'));
  const jobs = [];
  SETTINGS.forEach(setting => { for (let i = 0; i < games; i++) jobs.push({ setting, seat: i % 3, seed: (31 * 1000003 + i * 7919) >>> 0 }); });
  const srv = await serve(), browser = await launch(), t0 = Date.now();
  const res = (await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const mine = jobs.filter((_, i) => i % workers === k), { page, errors } = await openPage(browser, srv.url), r = [];
    for (let i = 0; i < mine.length; i += 5) r.push(...await run(page, PAGE, { jobs: mine.slice(i, i + 5), fit }, ['handest.js']));
    if (errors.length) console.error(errors.slice(0, 3));
    await page.context().close(); return r;
  }))).flat();
  await browser.close(); srv.close();

  const handsOf = G => G.flatMap(x => x.hands).filter(h => h.kept && h.tricks !== undefined && h.scoreAfter !== undefined);
  const signals = { discardLoss: h => h.bestKeep - h.keptValue, keptValue: h => h.keptValue, points: h => h.scoreAfter - h.scoreBefore, tricks: h => h.tricks };
  const base = handsOf(res.filter(x => x.name === SETTINGS[0].name && x.done));
  const settings = SETTINGS.map(({ name }) => {
    const G = res.filter(x => x.name === name && x.done), H = handsOf(G), D = G.flatMap(x => x.decisions), review = G.map(x => x.decisions.reduce((s, d) => s + d.ms, 0));
    const calls = G.flatMap(x => x.hands.filter(h => h.kept && h.tricks !== undefined && h.caller === x.seat));
    const byPhase = {}; for (const d of D) (byPhase[d.phase] = byPhase[d.phase] || []).push(d);
    /* Hands needed to tell this setting from row 0 at 2 sigma, per signal. */
    const handsToTell = Object.fromEntries(Object.entries(signals).map(([k, f]) => {
      const a = base.map(f), b = H.map(f), d = Math.abs(mean(a) - mean(b)) / Math.sqrt((sd(a) ** 2 + sd(b) ** 2) / 2);
      return [k, name === SETTINGS[0].name ? null : d > 0 ? Math.ceil((2 * Math.SQRT2 / d) ** 2) : null];
    }));
    const loss = H.map(signals.discardLoss);
    return {
      name, games: G.length, unfinished: res.filter(x => x.name === name).length - G.length,
      winRate: r2(100 * G.filter(x => x.win).length / G.length), scoreShare: r2(100 * mean(G.map(x => x.share))),
      reviewSeconds: { mean: r2(mean(review) / 1000), p95: r2(pct(review, 0.95) / 1000), max: r2(Math.max(...review) / 1000) },
      decisionsPerGame: r2(D.length / G.length), msPerDecision: Object.fromEntries(Object.entries(byPhase).map(([k, v]) => [k, r2(mean(v.map(d => d.ms)))])),
      agreesWithClub: Object.fromEntries(Object.entries(byPhase).map(([k, v]) => [k, r2(mean(v.map(d => d.agree ? 1 : 0)))])),
      discardLoss: { mean: r2(mean(loss)), p90: r2(pct(loss, 0.9)), p99: r2(pct(loss, 0.99)) },
      pointsPerHand: r2(mean(H.map(signals.points))), tricksPerHand: r2(mean(H.map(signals.tricks))),
      failedCalls: r2(calls.filter(h => h.showdown || h.tricks < Math.max(...h.allTricks)).length / Math.max(1, calls.length)),
      valueAtCall: r2(mean(calls.filter(h => h.callValue != null).map(h => h.callValue))),
      handsToTellFromRow0: handsToTell,
      fastPath: {
        postGame_lossAbove1_2of3: windows(G.map(x => x.hands.filter(h => h.kept).map(h => h.bestKeep - h.keptValue)), v => v > 1),
        inGame_visibleValueBelow2_5_2of3: windows(G.map(x => x.hands.filter(h => h.kept && h.caller !== undefined && h.caller !== x.seat && h.receiver !== x.seat).map(h => h.keptValue)), v => v < 2.5)
      }
    };
  });
  console.log(JSON.stringify({ gamesPerSetting: games, seconds: Math.round((Date.now() - t0) / 1000), settings }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
