#!/usr/bin/env node
/* Not a check. Measures how well AI.handValue predicts what a hand wins, and fits new weights for its features.
   Three Shark bots play; for each seat and hand: its 7 cards at the first trick (after the exchange) with the trump,
   the main tricks it won and the Kings that won a trick for it. The weights are fitted by least squares and scored
   on held-out hands (5-fold). With --write, the fit replaces data/handvalue-fit.json.
   Usage: node handvalue.js [games=600] [workers=4] [seed=11] [--write]
   Prints JSON: calibration of the current weights, the fitted weights and their held-out error. */
'use strict';
const fs = require('fs'), path = require('path');
const { serve, launch, openPage, run } = require('./lib/browser');

const PAGE = `
  const { Engine, AI, buildView } = KCT;
  const P = Engine.P, cfg = AI.personaConfig({ tier: 'shark', courage: 'normal', realTable: false, leadPick: 'fair' });
  const out = [];
  for (const seed of arg.seeds) {
    const s = Engine.createGame(seed, ['A', 'B', 'C']);
    let steps = 0, bidHands = null, rec = null, last = null;
    while (!s.gameOver && steps++ < 8000) {
      if (s.phase !== last) {
        if (s.phase === P.HAND_START) { rec = null; bidHands = null; }
        if (s.phase === P.BID1 && !bidHands) bidHands = s.hands.map(h => h.slice());
        if (s.phase === P.TRICK_PLAY && !rec && s.trump) {
          rec = { caller: s.caller, receiver: s.receiver, seats: s.hands.map((h, p) => {
            const c = heParts(HE_CURRENT, h, s.trump), hv = AI.handValue(h, s.trump);
            /* The mirror must match the game's own weights. */
            if (Math.abs(c.value - hv) > 1e-9) throw new Error('heValue and AI.handValue differ: ' + c.value + ' / ' + hv);
            return { f: c.f, tricks: c.tricks, kings: c.kings, bidValue: bidHands ? AI.handValue(bidHands[p], s.trump) : null };
          }) };
        }
        if ((s.phase === P.HAND_SCORE || s.phase === P.SHOWDOWN_SETUP) && rec) {
          rec.tricksWon = s.tricksWon.slice(); rec.kingsWon = s.handStats.kings.map(k => k.length); rec.showdown = s.phase === P.SHOWDOWN_SETUP;
          out.push(rec); rec = null;
        }
        last = s.phase;
      }
      const actors = Engine.actors(s);
      let a;
      if (actors.length) { const v = buildView(s, actors[0]); a = AI.decide(v, cfg); if (Engine.validate(s, a)) a = AI.fallbackAction(v, cfg); }
      else a = Engine.systemAction(s);
      if (!a || !Engine.dispatch(s, a).ok) break;
    }
  }
  return out;`;

const TF = ['tr18', 'tr17', 'tr16', 'tr14', 'tr13', 'tr12', 'tr10', 'tr9', 'tr8', 'tr7', 'extraTrump', 'offA', 'offK_A', 'offK_2', 'offK_1', 'offQ_AK', 'offQ', 'offLow', 'void_t2', 'single_t3'];
const KF = ['kTrump', 'kOff_A', 'kOff'];
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const r2 = x => Math.round(x * 100) / 100;
function stats(pred, act) {
  const mp = mean(pred), ma = mean(act), e = pred.map((v, i) => v - act[i]);
  const cov = mean(pred.map((v, i) => (v - mp) * (act[i] - ma)));
  const corr = cov / Math.sqrt(mean(pred.map(v => (v - mp) ** 2)) * mean(act.map(v => (v - ma) ** 2)));
  return { n: pred.length, meanPredicted: r2(mp), meanActual: r2(ma), bias: r2(mean(e)), mae: r2(mean(e.map(Math.abs))), corr: r2(corr) };
}
function calibration(pred, act, step) {
  const b = {};
  pred.forEach((v, i) => { const k = Math.floor(v / step) * step; (b[k] = b[k] || []).push(act[i]); });
  return Object.keys(b).map(Number).sort((x, y) => x - y).filter(k => b[k].length >= 40)
    .map(k => ({ from: r2(k), to: r2(k + step), n: b[k].length, actual: r2(mean(b[k])) }));
}
/* Least squares with a small ridge, by Gaussian elimination. */
function fit(X, y, lambda = 1e-3) {
  const d = X[0].length, A = Array.from({ length: d }, () => new Array(d).fill(0)), b = new Array(d).fill(0);
  X.forEach((x, i) => { for (let j = 0; j < d; j++) { b[j] += x[j] * y[i]; for (let k = 0; k < d; k++) A[j][k] += x[j] * x[k]; } });
  for (let j = 0; j < d; j++) A[j][j] += lambda * X.length;
  for (let c = 0; c < d; c++) {
    let p = c; for (let r = c + 1; r < d; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < d; r++) if (r !== c) { const m = A[r][c] / A[c][c]; for (let k = c; k < d; k++) A[r][k] -= m * A[c][k]; b[r] -= m * b[c]; }
  }
  return b.map((v, j) => v / A[j][j]);
}
const dot = (w, x) => w.reduce((s, v, j) => s + v * x[j], 0);
function crossFit(rows, names, target, folds = 5) {
  const X = rows.map(r => names.map(n => r.f[n])), y = rows.map(target), pred = new Array(rows.length);
  for (let k = 0; k < folds; k++) {
    const tx = [], ty = [];
    X.forEach((x, i) => { if (i % folds !== k) { tx.push(x); ty.push(y[i]); } });
    const w = fit(tx, ty);
    X.forEach((x, i) => { if (i % folds === k) pred[i] = dot(w, x); });
  }
  const w = fit(X, y);
  return { weights: Object.fromEntries(names.map((n, j) => [n, r2(w[j])])), heldOut: stats(pred, y) };
}

(async () => {
  const args = process.argv.slice(2), write = args.includes('--write');
  const [g = '600', w = '4', sd = '11'] = args.filter(a => a !== '--write');
  const games = Number(g), workers = Number(w), seed0 = Number(sd);
  const seeds = Array.from({ length: games }, (_, i) => (seed0 * 7919 + i * 104729) >>> 0);
  const srv = await serve(), browser = await launch();
  const t0 = Date.now();
  const recs = (await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const mine = seeds.filter((_, i) => i % workers === k), { page, errors } = await openPage(browser, srv.url), r = [];
    for (let i = 0; i < mine.length; i += 10) r.push(...await run(page, PAGE, { seeds: mine.slice(i, i + 10) }, ['handest.js']));
    if (errors.length) console.error(errors.slice(0, 3));
    await page.context().close(); return r;
  }))).flat();
  await browser.close(); srv.close();

  const rows = [];
  for (const r of recs) r.seats.forEach((s, p) => rows.push({ f: s.f, tricks: s.tricks, kings: s.kings, bidValue: s.bidValue,
    tricksWon: r.tricksWon[p], kingsWon: r.kingsWon[p], role: p === r.caller ? 'caller' : p === r.receiver ? 'receiver' : 'other',
    wonHand: !r.showdown && r.tricksWon[p] === Math.max(...r.tricksWon) }));
  const ft = crossFit(rows, TF, r => r.tricksWon), fk = crossFit(rows, KF, r => r.kingsWon);
  /* Map AI.handValue onto the fitted scale, to carry the bid thresholds over. */
  const cur = rows.map(r => r.tricks + 0.9 * r.kings), fitv = rows.map(r => dot(TF.map(n => ft.weights[n]), TF.map(n => r.f[n])) + 0.9 * dot(KF.map(n => fk.weights[n]), KF.map(n => r.f[n])));
  const mc = mean(cur), mf = mean(fitv), b = mean(cur.map((v, i) => (v - mc) * (fitv[i] - mf))) / mean(cur.map(v => (v - mc) ** 2)), a = mf - b * mc;
  const callers = rows.filter(r => r.role === 'caller' && r.bidValue != null);
  const out = {
    games, hands: recs.length, seconds: Math.round((Date.now() - t0) / 1000),
    tricksPerHand: { predicted: r2(mean(recs.map(r => r.seats.reduce((s, x) => s + x.tricks, 0)))), actual: 7 },
    currentTricks: stats(rows.map(r => r.tricks), rows.map(r => r.tricksWon)),
    currentTricksCalibration: calibration(rows.map(r => r.tricks), rows.map(r => r.tricksWon), 0.5),
    currentKings: stats(rows.map(r => r.kings), rows.map(r => r.kingsWon)),
    byRole: Object.fromEntries(['caller', 'receiver', 'other'].map(k => { const s = rows.filter(r => r.role === k); return [k, stats(s.map(r => r.tricks), s.map(r => r.tricksWon))]; })),
    fittedTricks: ft, fittedKings: fk,
    toCurrentScale: { a: Math.round(a * 1e4) / 1e4, b: Math.round(b * 1e4) / 1e4 },
    callerWonHandByBidValue: calibration(callers.map(r => r.bidValue), callers.map(r => r.wonHand ? 1 : 0), 0.5)
  };
  console.log(JSON.stringify(out, null, 1));
  if (write) {
    const file = path.join(__dirname, 'data', 'handvalue-fit.json'), old = JSON.parse(fs.readFileSync(file, 'utf8'));
    const map = t => r2(a + b * t);
    Object.assign(old, { fitted: new Date().toISOString().slice(0, 10), games, seed: seed0, tricks: ft.weights, kings: fk.weights,
      heldOut: { tricksMae: ft.heldOut.mae, tricksCorr: ft.heldOut.corr, currentTricksMae: out.currentTricks.mae, currentTricksCorr: out.currentTricks.corr },
      toCurrentScale: Object.assign(old.toCurrentScale, { a: out.toCurrentScale.a, b: out.toCurrentScale.b, thresholds: { ROUND1: map(3.05), ROUND2: map(2.95), ROUND2_LAST: map(2.7) } }) });
    fs.writeFileSync(file, JSON.stringify(old, null, 2) + '\n');
    console.error('wrote ' + path.relative(process.cwd(), file));
  }
})().catch(e => { console.error(e); process.exit(1); });
