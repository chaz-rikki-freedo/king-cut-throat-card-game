/* The naming-trump model: what a bidder gains by naming trump instead of passing, as a lookup.
   The table comes from tests/fit-naming-model.js (data/naming-model.json). It covers three Sharks, the rule-based play
   after the bid and the rules as stamped in the file; anything else needs a new run of tests/namer.js.
   Seats are counted from the dealer: 0 is the dealer (bids last), 1 bids first, 2 bids second.
   CLI: node lib/naming-model.js <handValue> [round=1] [seat=all|dealer|first|second|0|1|2]
   Hand value is AI.handValue(hand, suit) in index.html (not the fitted estimate in the Dynamic review). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const FILE = path.join(__dirname, '..', 'data', 'naming-model.json');
const SEATS = { all: 'all', dealer: 'seat0', first: 'seat1', second: 'seat2', 0: 'seat0', 1: 'seat1', 2: 'seat2' };

const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

/* The source of the function that starts at `start` (a string to find), by matching braces. */
function fnSource(html, start) {
  const i = html.indexOf(start);
  if (i < 0) return '';
  let j = html.indexOf('{', i), depth = 0;
  for (; j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}' && --depth === 0) return html.slice(i, j + 1);
  }
  return '';
}
function between(html, start, end) {
  const i = html.indexOf(start);
  if (i < 0) return '';
  const j = html.indexOf(end, i);
  return j < 0 ? '' : html.slice(i, j + end.length);
}

/** The parts of index.html the model depends on, each reduced to a short hash. */
function stampOf(html) {
  const line = re => (html.match(re) || [''])[0];
  return {
    rulesVersion: +(html.match(/const RULES_VERSION = (\d+)/) || [0, 0])[1],
    quickRules: sha(between(html, 'const QUICK_RULES = [', '];')),
    handValue: sha(fnSource(html, 'function handValue(hand, trump)')),
    round1Value: sha(fnSource(html, 'function round1Value(hand, flipped, s)')),
    bidThresholds: sha(line(/const BID_THRESHOLDS = .*/) + line(/const bidLimit = .*/) + between(html, 'const COURAGE = Object.freeze({', '});') + line(/const TRUMP_VAL = .*/))
  };
}

let cache = null;
function load() {
  if (!cache) cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  return cache;
}

/** The names of the stamped parts that differ between index.html and the model, so an empty list means current. */
function stale(html) {
  const now = stampOf(html), then = load().stamp;
  return Object.keys(now).filter(k => now[k] !== then[k]);
}

/* Linear interpolation on a table of { hv, gain, se, n } points, flat outside it. */
function lookup(points, hv) {
  if (!points || !points.length) return null;
  const nearest = points.reduce((a, b) => Math.abs(b.hv - hv) < Math.abs(a.hv - hv) ? b : a);
  let gain;
  if (hv <= points[0].hv) gain = points[0].gain;
  else if (hv >= points[points.length - 1].hv) gain = points[points.length - 1].gain;
  else for (let i = 1; i < points.length; i++) if (hv <= points[i].hv) {
    const a = points[i - 1], b = points[i];
    gain = a.gain + (b.gain - a.gain) * (hv - a.hv) / (b.hv - a.hv);
    break;
  }
  return { gain: Math.round(gain * 1000) / 1000, se: nearest.se, n: nearest.n };
}
const seatKey = seat => {
  const k = SEATS[seat === undefined ? 'all' : seat];
  if (!k) throw new Error('seat must be all, dealer, first, second, 0, 1 or 2');
  return k;
};

/** Points gained by naming instead of passing. round 1 or 2; seat as above. Returns { gain, se, n } or null. */
function gain(hv, round = 1, seat = 'all') {
  return lookup(load().naming['round' + round][seatKey(seat)], hv);
}
/** The hand value at which naming starts to pay (null if it always pays, undefined if it never does). */
function breakEven(round = 1, seat = 'all') {
  return load().breakEven['round' + round][seatKey(seat)];
}
/** Round 1 only: what the bidder's own round 2 chance is worth (pass minus pass with no round 2 chance). */
function waitValue(hv, seat = 'all') {
  return lookup(load().wait[seatKey(seat)], hv);
}
/** The change in the gain from naming if a rule is changed: 'gift0' (no gift) or 'sweep3' (a namer sweep scores +3). */
function variantChange(variant, hv, round = 1, seat = 'all') {
  const v = load().variants[variant];
  if (!v) throw new Error('variant must be gift0 or sweep3');
  return lookup(v['round' + round][seatKey(seat)] || v['round' + round].all, hv);
}

module.exports = { stampOf, stale, load, gain, breakEven, waitValue, variantChange, lookup };

if (require.main === module) {
  const [hv, round = '1', seat = 'all'] = process.argv.slice(2);
  if (hv === undefined || isNaN(+hv)) { console.error('usage: node lib/naming-model.js <handValue> [round=1] [seat=all|dealer|first|second]'); process.exit(1); }
  const g = gain(+hv, +round, isNaN(+seat) ? seat : +seat);
  const out = { handValue: +hv, round: +round, seat, gainFromNaming: g, breakEven: breakEven(+round, isNaN(+seat) ? seat : +seat) };
  if (+round === 1) {
    out.valueOfOwnRound2Chance = waitValue(+hv, isNaN(+seat) ? seat : +seat);
    out.changeInGainIfNoGift = variantChange('gift0', +hv, 1, isNaN(+seat) ? seat : +seat);
    out.changeInGainIfSweepIs3 = variantChange('sweep3', +hv, 1, isNaN(+seat) ? seat : +seat);
  }
  const s = stale(fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8'));
  if (s.length) out.warning = 'index.html changed in: ' + s.join(', ') + '. The model may be stale; refit it (see tests/fit-naming-model.js).';
  console.log(JSON.stringify(out, null, 1));
}
