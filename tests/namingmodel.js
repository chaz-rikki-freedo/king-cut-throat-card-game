#!/usr/bin/env node
/* Checks the naming-trump model in data/naming-model.json (see docs/naming-trump-cost.md). No browser, under a second.
   1. The structure the notes describe still holds in the saved table (seat order, rounds, costs, fit quality).
   2. The parts of index.html the model depends on are unchanged since it was fitted. If not, the model may be stale:
      re-run tests/namer.js and tests/fit-naming-model.js, then update the notes. Exits with code 1 on a failure. */
'use strict';
const fs = require('fs'), path = require('path');
const M = require('./lib/naming-model');

const fails = [];
const check = (name, ok, detail) => { if (!ok) fails.push(name + (detail === undefined ? '' : ' (' + detail + ')')); };
const model = M.load();
const GRID = [2, 2.5, 3, 3.5, 4, 4.5, 5];

/* Break-evens in round 1: the dealer pays least and the first bidder most. */
const be = s => M.breakEven(1, s);
check('round 1 break-even: dealer < second < first', be('dealer') < be('second') && be('second') < be('first'), [be('dealer'), be('second'), be('first')]);
check('round 1 break-even between 2.5 and 4.6 in every seat', ['dealer', 'second', 'first', 'all'].every(s => be(s) > 2.5 && be(s) < 4.6));

/* Each curve rises with hand value, apart from noise. */
for (const round of [1, 2]) for (const seat of ['all', 'dealer', 'first', 'second']) {
  const g = GRID.map(hv => M.gain(hv, round, seat).gain);
  check('round ' + round + ' ' + seat + ' rises with hand value', g[g.length - 1] > g[0] + 0.3 && g.every((x, i) => i === 0 || x > g[i - 1] - 0.1), g.join(' '));
}

/* Naming is worth more in round 2 than in round 1 at the same hand value. */
for (const hv of [3, 3.5, 4, 4.5]) check('round 2 beats round 1 at ' + hv, M.gain(hv, 2).gain > M.gain(hv, 1).gain + 0.2, M.gain(hv, 2).gain + ' vs ' + M.gain(hv, 1).gain);

/* The round 2 chance: never negative, worth most to the first bidder, nothing to the dealer. */
const w = s => GRID.slice(2, 5).reduce((a, hv) => a + M.waitValue(hv, s).gain, 0) / 3;
check('own round 2 chance is worth something on average', w('all') > 0.05, w('all'));
check('own round 2 chance: first > second > dealer', w('first') > w('second') && w('second') > w('dealer') - 0.02, [w('first'), w('second'), w('dealer')]);
check('own round 2 chance is about nothing for the dealer', Math.abs(w('dealer')) < 0.05, w('dealer'));

/* Rule variants: the gift costs the namer, the +3 sweep rule hardly matters. */
const avg = (v, round) => GRID.reduce((a, hv) => a + M.variantChange(v, hv, round).gain, 0) / GRID.length;
check('no gift helps the namer in round 1', avg('gift0', 1) > 0.05, avg('gift0', 1));
check('no gift helps the namer in round 2', avg('gift0', 2) > 0.03, avg('gift0', 2));
check('a +3 namer sweep changes little', Math.abs(avg('sweep3', 1)) < 0.05 && Math.abs(avg('sweep3', 2)) < 0.1, [avg('sweep3', 1), avg('sweep3', 2)]);

/* The bots' own calls: profitable on average, and their passes are not. */
const b1 = model.botRule.round1;
check("round 1: the bots' calls gain on average", b1.whenBotCalls.gain > 0.3, b1.whenBotCalls.gain);
check("round 1: naming on the bots' passes does not gain on average", b1.whenBotPasses.gain < 0, b1.whenBotPasses.gain);

/* Fit quality. Half of the seeds predicting the other half; then a natural run the model never saw. */
const v = model.validation;
check('fit: same-run halves, mean error under 0.06', v.sameRunHalves.round1.meanBinError < 0.06 && v.sameRunHalves.round2.meanBinError < 0.06, JSON.stringify(v.sameRunHalves));
check('fit: natural run, mean error under 0.12', v.naturalRun.round1.meanBinError < 0.12 && v.naturalRun.round2.meanBinError < 0.12, JSON.stringify(v.naturalRun));

/* The stamp: has anything the model depends on changed in index.html? */
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const stale = M.stale(html);
check('the model is current with index.html', stale.length === 0, 'changed: ' + stale.join(', ') + '. Refit: see tests/fit-naming-model.js');

if (fails.length) { console.log('FAIL ' + fails.length + ' of the naming-model checks:\n - ' + fails.join('\n - ')); process.exit(1); }
console.log('OK: the naming-trump model passes its checks (fitted ' + model.fitted + ', ' + model.sources.base.rows + ' bids).');
