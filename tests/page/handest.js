/* Page helper for the Dynamic measurements (handvalue.js, levers.js, review.js): the card features that
   AI.handValue weighs, and a hand estimate from any set of weights for them (see data/handvalue-fit.json).
   Needs KCT on the page. */
const HE_RANKS = [18, 17, 16, 14, 13, 12, 10, 9, 8, 7];

/* Feature counts of a hand with a trump, in the same cases as AI.handValue. */
function heFeatures(hand, trump) {
  const R = KCT.Rules, f = { extraTrump: 0, kTrump: 0, offA: 0, offK_A: 0, offK_2: 0, offK_1: 0, offQ_AK: 0, offQ: 0, offLow: 0, void_t2: 0, single_t3: 0, kOff_A: 0, kOff: 0 };
  for (const r of HE_RANKS) f['tr' + r] = 0;
  let t = 0; const off = {};
  for (const s of R.SUITS) if (s !== trump) off[s] = [];
  for (const id of hand) {
    if (R.isTrump(id, trump)) { t++; f['tr' + R.trumpRank(id, trump)]++; if (R.isKing(id)) f.kTrump++; }
    else off[R.getEffectiveSuit(id, trump)].push(R.card(id).rank);
  }
  for (const s of Object.keys(off)) {
    const rk = off[s], hasA = rk.includes('A'), hasK = rk.includes('K');
    for (const r of rk) {
      if (r === 'A') f.offA++;
      else if (r === 'K') { if (hasA) { f.offK_A++; f.kOff_A++; } else { f[rk.length >= 2 ? 'offK_2' : 'offK_1']++; f.kOff++; } }
      else if (r === 'Q') f[hasA && hasK ? 'offQ_AK' : 'offQ']++;
      else f.offLow++;
    }
    if (t >= 2) { if (rk.length === 0) f.void_t2++; else if (rk.length === 1 && t >= 3) f.single_t3++; }
  }
  f.extraTrump = Math.max(0, t - 2);
  return f;
}

/* The two parts of an estimate: tricks (weights W.tricks) and King points (weights W.kings). */
function heParts(W, hand, trump) {
  const f = heFeatures(hand, trump);
  let tricks = 0, kings = 0;
  for (const k of Object.keys(W.tricks)) tricks += W.tricks[k] * f[k];
  for (const k of Object.keys(W.kings)) kings += W.kings[k] * f[k];
  return { f, tricks, kings, value: tricks + 0.9 * kings };
}
function heValue(W, hand, trump) { return heParts(W, hand, trump).value; }
function heBest(W, hand) { return Math.max(...KCT.Rules.SUITS.map(s => heValue(W, hand, s))); }

/* AI.handValue's own weights, as written in index.html. handvalue.js checks heValue(HE_CURRENT, ...) against
   AI.handValue on every hand, so a change to the game's weights shows up there. */
const HE_CURRENT = {
  tricks: { tr18: 1.0, tr17: 0.93, tr16: 0.86, tr14: 0.76, tr13: 0.66, tr12: 0.54, tr10: 0.45, tr9: 0.40, tr8: 0.36, tr7: 0.32,
    extraTrump: 0.2, offA: 0.62, offK_A: 0.42, offK_2: 0.28, offK_1: 0.18, offQ_AK: 0.28, offQ: 0.07, offLow: 0.02, void_t2: 0.22, single_t3: 0.08 },
  kings: { kTrump: 0.55, kOff_A: 0.45, kOff: 0.22 }
};
