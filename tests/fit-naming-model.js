#!/usr/bin/env node
/* Not a check. Fits the naming-trump model from raw `namer.js` output and writes data/naming-model.json.
   The model is a table: for each round, seat and hand value, the average points a bidder gains by naming trump
   instead of passing. lib/naming-model.js reads it, so the question "what does naming cost the first bidder at a
   hand value of 3.2?" is a lookup and not a 5-minute simulation. See docs/naming-trump-cost.md.
   Usage: node fit-naming-model.js base=ff.raw [gift0=f] [sweep3=f] [option=f] [natural=f] [shark=f]
   Each file is the RAW output of namer.js (see its header). base is the forced run with rule-based play.
   natural (a natural run) is only used to check the model on data it was not fitted on.
   Prints the fit and its checks, and writes data/naming-model.json. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')));
if (!args.base) { console.error('usage: node fit-naming-model.js base=<raw file> [gift0=..] [sweep3=..] [option=..] [natural=..] [shark=..]'); process.exit(1); }
const load = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const round3 = x => Math.round(x * 1000) / 1000;
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const se = a => a.length > 1 ? Math.sqrt(a.reduce((x, y) => x + (y - mean(a)) ** 2, 0) / (a.length - 1) / a.length) : NaN;

const EDGES = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5];
const COARSE = [2, 3, 3.5, 4];
const MIN_N = 60;

/* Bin rows by hand value, then merge a bin with its neighbor until each holds MIN_N rows.
   Each point is (mean hand value, mean value of f, margin, rows): the table is read by linear interpolation. */
function curve(rows, f, edges = EDGES, minN = MIN_N) {
  let bins = [];
  for (let i = 0; i <= edges.length; i++) {
    const lo = i === 0 ? -Infinity : edges[i - 1], hi = i === edges.length ? Infinity : edges[i];
    bins.push(rows.filter(r => r.hv >= lo && r.hv < hi));
  }
  for (let i = 0; i < bins.length;) {
    if (bins[i].length < minN && bins.length > 1) {
      const j = i === bins.length - 1 ? i - 1 : i + 1;
      bins[Math.min(i, j)] = bins[i].concat(bins[j]); bins.splice(Math.max(i, j), 1);
      i = Math.max(0, Math.min(i, j) - 1);
    } else i++;
  }
  return bins.filter(b => b.length).map(b => ({ hv: round3(mean(b.map(r => r.hv))), gain: round3(mean(b.map(f))), se: round3(se(b.map(f))), n: b.length }));
}
function at(points, hv) {
  if (!points.length) return NaN;
  if (hv <= points[0].hv) return points[0].gain;
  for (let i = 1; i < points.length; i++) if (hv <= points[i].hv) {
    const a = points[i - 1], b = points[i];
    return a.gain + (b.gain - a.gain) * (hv - a.hv) / (b.hv - a.hv);
  }
  return points[points.length - 1].gain;
}
function breakEven(points) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (a.gain < 0 && b.gain >= 0) return round3(a.hv + (b.hv - a.hv) * (-a.gain) / (b.gain - a.gain));
  }
  return points.length && points[0].gain >= 0 ? null : undefined;
}
const delta = r => r.ga - r.gb;

const base = load(args.base);
const model = { fitted: new Date().toISOString().slice(0, 10), play: 'fast', scenario: 'forced', minRowsPerPoint: MIN_N, sources: {}, naming: {}, breakEven: {}, wait: {}, variants: {}, shark: {}, validation: {}, stamp: {} };
model.sources.base = { rows: base.length };

for (const round of [1, 2]) {
  const rr = base.filter(r => r.round === round);
  model.naming['round' + round] = { all: curve(rr, delta) };
  for (const sf of [0, 1, 2]) model.naming['round' + round]['seat' + sf] = curve(rr.filter(r => r.sf === sf), delta);
  model.breakEven['round' + round] = { all: breakEven(model.naming['round' + round].all) };
  for (const sf of [0, 1, 2]) model.breakEven['round' + round]['seat' + sf] = breakEven(model.naming['round' + round]['seat' + sf]);
}

/* Where the bots' own bidding rule says call (the nat flag), and what those calls and passes are worth. */
model.botRule = {};
for (const round of [1, 2]) {
  const rr = base.filter(r => r.round === round && r.nat !== undefined);
  if (!rr.length) continue;
  const stat = a => a.length ? { n: a.length, gain: round3(mean(a.map(delta))), se: round3(se(a.map(delta))) } : { n: 0 };
  const q = (a, p) => { const s = a.map(r => r.hv).sort((x, y) => x - y); return s.length ? round3(s[Math.floor(p * (s.length - 1))]) : null; };
  const sum = a => Object.assign(stat(a), { hvP10: q(a, 0.1), hvMedian: q(a, 0.5), hvP90: q(a, 0.9) });
  const calls = rr.filter(r => r.nat), passes = rr.filter(r => !r.nat);
  model.botRule['round' + round] = { callShare: round3(calls.length / rr.length), whenBotCalls: sum(calls), whenBotPasses: sum(passes), callsCurve: curve(calls, delta), passesCurve: curve(passes, delta), bySeat: {} };
  for (const sf of [0, 1, 2]) {
    const c = calls.filter(r => r.sf === sf), p = passes.filter(r => r.sf === sf);
    model.botRule['round' + round].bySeat['seat' + sf] = { callShare: round3(c.length / (c.length + p.length)), whenBotCalls: stat(c), whenBotPasses: stat(p) };
  }
}

/* The value of the player's own round 2 chance: pass (normal) minus pass (barred from naming in round 2). */
if (args.option) {
  const opt = load(args.option).filter(r => r.round === 1 && r.gc !== null && r.gc !== undefined);
  model.sources.option = { rows: opt.length };
  const w = r => r.gb - r.gc;
  model.wait = { all: curve(opt, w) };
  for (const sf of [0, 1, 2]) model.wait['seat' + sf] = curve(opt.filter(r => r.sf === sf), w);
}

/* Rule variants, paired with the baseline on the same bid (seed, round, player). */
const key = r => r.seed + ':' + r.round + ':' + r.p;
for (const v of ['gift0', 'sweep3']) {
  if (!args[v]) continue;
  const variant = load(args[v]), idx = new Map(variant.map(r => [key(r), r]));
  const paired = base.filter(r => r.seed !== undefined && idx.has(key(r))).map(r => ({ hv: r.hv, round: r.round, sf: r.sf, d: delta(idx.get(key(r))) - delta(r) }));
  model.sources[v] = { pairedRows: paired.length };
  model.variants[v] = {};
  for (const round of [1, 2]) {
    const rr = paired.filter(r => r.round === round);
    model.variants[v]['round' + round] = { all: curve(rr, r => r.d) };
    if (round === 1) for (const sf of [0, 1, 2]) model.variants[v]['round1']['seat' + sf] = curve(rr.filter(r => r.sf === sf), r => r.d);
  }
}

/* Full Shark play: a thin sample, so a coarse curve with no seats. */
if (args.shark) {
  const sh = load(args.shark);
  model.sources.shark = { rows: sh.length };
  for (const round of [1, 2]) model.shark['round' + round] = { all: curve(sh.filter(r => r.round === round), delta, COARSE, 40) };
}

/* Checks. (1) Fit on one half of the seeds, test on the other. (2) Predict a natural run that was not used in the fit. */
function predict(m, r) { return at(m.naming['round' + r.round]['seat' + r.sf], r.hv); }
function halves() {
  const seeded = base.filter(r => r.seed !== undefined);
  if (!seeded.length) return null;
  const fitHalf = seeded.filter(r => r.seed % 2 === 0), testHalf = seeded.filter(r => r.seed % 2 === 1);
  const m = { naming: {} };
  for (const round of [1, 2]) { m.naming['round' + round] = {}; for (const sf of [0, 1, 2]) m.naming['round' + round]['seat' + sf] = curve(fitHalf.filter(r => r.round === round && r.sf === sf), delta); }
  return error(m, testHalf);
}
function error(m, rows) {
  const out = {};
  for (const round of [1, 2]) {
    const rr = rows.filter(r => r.round === round);
    if (!rr.length) continue;
    const bias = mean(rr.map(r => delta(r) - predict(m, r)));
    /* The error of the table itself: compare the mean prediction with the mean outcome in each hand-value bin. */
    const byBin = [];
    for (let i = 0; i <= EDGES.length; i++) {
      const lo = i === 0 ? -Infinity : EDGES[i - 1], hi = i === EDGES.length ? Infinity : EDGES[i];
      const b = rr.filter(r => r.hv >= lo && r.hv < hi);
      if (b.length >= 100) byBin.push({ w: b.length, e: Math.abs(mean(b.map(r => delta(r) - predict(m, r)))) });
    }
    out['round' + round] = { rows: rr.length, bias: round3(bias), meanBinError: round3(byBin.reduce((s, x) => s + x.w * x.e, 0) / byBin.reduce((s, x) => s + x.w, 0)), worstBinError: round3(Math.max(...byBin.map(x => x.e))) };
  }
  return out;
}
const half = halves();
if (half) model.validation.sameRunHalves = half;
if (args.natural) {
  const nat = load(args.natural);
  model.sources.natural = { rows: nat.length };
  model.validation.naturalRun = error(model, nat);
}

/* A stamp of the parts of index.html the model depends on, so lib/naming-model.js can say when it may be stale. */
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const { stampOf } = require('./lib/naming-model');
model.stamp = stampOf(html);

fs.writeFileSync(path.join(__dirname, 'data', 'naming-model.json'), JSON.stringify(model, null, 1) + '\n');
console.log(JSON.stringify({ sources: model.sources, breakEven: model.breakEven, botRule: Object.fromEntries(Object.entries(model.botRule).map(([k, v]) => [k, { callShare: v.callShare, whenBotCalls: v.whenBotCalls, whenBotPasses: v.whenBotPasses, bySeat: v.bySeat }])), validation: model.validation, stamp: model.stamp }, null, 1));
