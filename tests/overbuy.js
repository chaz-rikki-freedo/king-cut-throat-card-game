#!/usr/bin/env node
/* Not a check. Measures whether the bots buy trump too often, one hand at a time.
   Each seed deals one hand of a new game (scores 0-0-0; a Joker redeal is the same hand). The bots play it. Then, for
   every buy or pass in its bidding, the hand is rebuilt from the seed and the moves up to that turn, the opposite
   choice is played instead (a buy becomes a pass; a pass becomes a buy, in round 2 of the best suit by AI.handValue),
   and the same bots play the hand out. The bots are deterministic, so the two branches differ only by that choice.
   Net points: the player's points in the hand minus the mean of the two opponents'. A buy is an overbuy when the
   pass branch nets more; a pass is an underbuy when the buy branch nets more.
   Tables: shark (three Sharks) or personas (three different personalities per seed, as themselves).
   Usage: node overbuy.js [table=shark] [hands=1000] [workers=4] [seed=23]
   Prints JSON: for buys and for passes, the overbuy or underbuy rate and the mean net gain of the choice made over
   the other, with a 95% margin, overall and by round, seat, hand value and (personas) bot. */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

const PAGE = `
  const { Engine, AI, buildView, PERSONAS } = KCT;
  const P = Engine.P, SUITS = ['S', 'H', 'D', 'C'];
  const shark = AI.personaConfig({ tier: 'shark', courage: 'normal', realTable: false, leadPick: 'fair' });
  const out = [];
  for (const seed of arg.seeds) {
    let ids = ['shark', 'shark', 'shark'], cfgs = [shark, shark, shark];
    if (arg.table === 'personas') {
      const pool = PERSONAS.slice(), pick = [];
      for (let k = 0, x = seed; k < 3; k++) { x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0; pick.push(pool.splice(x % pool.length, 1)[0]); }
      ids = pick.map(p => p.id); cfgs = pick.map(p => AI.personaConfig(p));
    }
    const step = s => {
      const actors = Engine.actors(s);
      let a;
      if (actors.length) { const v = buildView(s, actors[0]), c = cfgs[actors[0]]; a = AI.decide(v, c); if (Engine.validate(s, a)) a = AI.fallbackAction(v, c); }
      else a = Engine.systemAction(s);
      if (!a || !Engine.dispatch(s, a).ok) return null;
      return a;
    };
    /* Plays on from the bidding until the hand ends: the next deal, or the end of the game. Returns the hand's points. */
    const finish = (s, start) => {
      let n = 0;
      while (!s.gameOver && s.phase !== P.HAND_START && n++ < 3000) if (!step(s)) break;
      return s.scores.map((v, i) => v - start[i]);
    };
    /* The real hand: record every move, and the bidding turns. */
    const s = Engine.createGame(seed, ['A', 'B', 'C']), moves = [], turns = [];
    let start = null, guard = 0, flipped = null, dealer = null;
    while (!s.gameOver && guard++ < 3000) {
      if (s.phase === P.BID1 && !start) { start = s.scores.slice(); flipped = buildView(s, 0).flippedSuit; dealer = s.dealer; }
      if (start && s.phase !== P.BID1 && s.phase !== P.BID2) break;
      const ph = s.phase, who = Engine.actors(s)[0];
      if (start && (ph === P.BID1 || ph === P.BID2)) {
        const hand = s.hands[who].slice(), at = moves.length, a = step(s);
        if (!a) break;
        moves.push(a);
        const buy = ph === P.BID1 ? a.accept : !!a.suit;
        const value = ph === P.BID1 ? AI.handValue(hand, flipped) : buy ? AI.handValue(hand, a.suit)
          : Math.max(...SUITS.filter(u => u !== flipped).map(u => AI.handValue(hand, u)));
        const alt = ph === P.BID1 ? { type: 'BID', player: who, accept: !a.accept }
          : { type: 'NAME', player: who, suit: buy ? null : SUITS.filter(u => u !== flipped).sort((x, y) => AI.handValue(hand, y) - AI.handValue(hand, x))[0] };
        turns.push({ at, alt, player: who, round: ph === P.BID1 ? 1 : 2, buy, value });
        continue;
      }
      const a = step(s);
      if (!a) break;
      moves.push(a);
    }
    if (!start) continue;
    /* The real outcome: play the recorded hand out. */
    const real = finish(s, start);
    /* The bots must be deterministic: the real choice, rebuilt, has to give the real points. */
    if (turns.length) {
      const f = Engine.createGame(seed, ['A', 'B', 'C']);
      for (let i = 0; i <= turns[0].at; i++) Engine.dispatch(f, moves[i]);
      if (finish(f, start).join() !== real.join()) throw new Error('seed ' + seed + ': a rebuilt hand scored differently');
    }
    for (const t of turns) {
      const f = Engine.createGame(seed, ['A', 'B', 'C']);
      let ok = true;
      for (let i = 0; i < t.at && ok; i++) ok = Engine.dispatch(f, moves[i]).ok;
      if (!ok || Engine.validate(f, t.alt) || !Engine.dispatch(f, t.alt).ok) continue;
      const other = finish(f, start), p = t.player, net = x => x[p] - (x[(p + 1) % 3] + x[(p + 2) % 3]) / 2;
      out.push({ bot: ids[p], round: t.round, seat: (p - dealer + 3) % 3, buy: t.buy, value: t.value,
        gain: net(real) - net(other), own: real[p] - other[p], left: real[(p + 1) % 3] - other[(p + 1) % 3] });
    }
  }
  return out;`;

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const r2 = x => Math.round(x * 100) / 100;
/* For a group of choices: how often the other choice netted more, and the mean net gain of the choice made. */
function sum(rows) {
  if (!rows.length) return { n: 0 };
  const g = rows.map(r => r.gain), m = mean(g);
  return { n: rows.length, wrong: r2(rows.filter(r => r.gain < 0).length / rows.length), tie: r2(rows.filter(r => r.gain === 0).length / rows.length),
    gain: r2(m), margin: r2(1.96 * Math.sqrt(mean(g.map(v => (v - m) ** 2)) / g.length)), ownGain: r2(mean(rows.map(r => r.own))), leftGain: r2(mean(rows.map(r => r.left))) };
}
const by = (rows, key, keys) => Object.fromEntries(keys.map(k => [k, sum(rows.filter(r => key(r) === k))]));
const bucket = v => v < 2 ? '<2' : v < 3 ? '2-3' : v < 4 ? '3-4' : v < 5 ? '4-5' : '5+';
const SEAT = ['dealer', "dealer's left", 'second'];

(async () => {
  const [table = 'shark', h = '1000', w = '4', sd = '23'] = process.argv.slice(2);
  if (table !== 'shark' && table !== 'personas') throw new Error('table: shark or personas');
  const hands = Number(h), workers = Number(w), seed0 = Number(sd);
  const seeds = Array.from({ length: hands }, (_, i) => (seed0 * 7919 + i * 104729) >>> 0);
  const srv = await serve(), browser = await launch();
  const t0 = Date.now();
  const rows = (await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const mine = seeds.filter((_, i) => i % workers === k), { page, errors } = await openPage(browser, srv.url), r = [];
    for (let i = 0; i < mine.length; i += 20) r.push(...await run(page, PAGE, { table, seeds: mine.slice(i, i + 20) }));
    if (errors.length) console.error(errors.slice(0, 3));
    await page.context().close(); return r;
  }))).flat();
  await browser.close(); srv.close();

  const report = rs => ({
    all: sum(rs),
    byRound: by(rs, r => r.round, [1, 2]),
    bySeat: Object.fromEntries([1, 2, 0].map(s => [SEAT[s], sum(rs.filter(r => r.seat === s))])),
    round1BySeat: Object.fromEntries([1, 2, 0].map(s => [SEAT[s], sum(rs.filter(r => r.round === 1 && r.seat === s))])),
    byValue: by(rs, r => bucket(r.value), ['<2', '2-3', '3-4', '4-5', '5+']),
    ...(table === 'personas' ? { byBot: by(rs, r => r.bot, [...new Set(rs.map(r => r.bot))].sort()) } : {})
  });
  console.log(JSON.stringify({ table, hands, decisions: rows.length, seconds: Math.round((Date.now() - t0) / 1000),
    buys: report(rows.filter(r => r.buy)), passes: report(rows.filter(r => !r.buy)) }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
