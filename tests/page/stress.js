/* Stress sections, run in the game page by stress.js. SECTIONS.<name>(params) returns counts and
   up to 40 failures ({ kind, ...details }). O is the rules oracle: the rules written again from the
   README, with no code from Rules or Engine. Uses the page globals (KCT, cleanSlot, Base64url, ...). */
const E = KCT.Engine, R = KCT.Rules, P = E.P, AIx = KCT.AI, Rep = KCT.Replay;
KCT.Logger.enabled = false;
const J = x => JSON.stringify(x);
const fails = [];
const fail = (kind, info) => { if (fails.length < 40) fails.push(Object.assign({ kind }, info)); };
/* A seeded random source for the harness, separate from the game. */
const mk = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
const sample = (rnd, arr, k) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); };

/* ---- Oracle: the rules again, written from the README, without Rules or Engine code. ---- */
const O = (() => {
  const SAME = { S: 'C', C: 'S', H: 'D', D: 'H' };
  const RV = { '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 };
  const parse = id => id === 'JK' ? { joker: true } : { rank: id.slice(0, -1), suit: id.slice(-1) };
  const eff = (id, t) => { const c = parse(id); if (c.joker) return t; if (c.rank === 'J' && t && c.suit === SAME[t]) return t; return c.suit; };
  const tRank = (id, t) => { const c = parse(id); if (c.joker) return 18; if (c.rank === 'J' && c.suit === t) return 17; if (c.rank === 'J' && c.suit === SAME[t]) return 16; return RV[c.rank]; };
  const power = (id, lead, t) => eff(id, t) === t ? 200 + tRank(id, t) : eff(id, t) === lead ? 100 + RV[parse(id).rank] : 0;
  const legal = (hand, lead, t) => { if (!lead) return hand.slice(); const f = hand.filter(id => eff(id, t) === lead); return f.length ? f : hand.slice(); };
  const winner = (plays, t) => { const lead = eff(plays[0].card, t); let b = plays[0]; for (const x of plays.slice(1)) if (power(x.card, lead, t) > power(b.card, lead, t)) b = x; return b; };
  const isKing = id => !parse(id).joker && parse(id).rank === 'K';
  /* Hand result from the trick counts. */
  const hand = (tricks, caller) => {
    const s = tricks.slice().sort((a, b) => b - a);
    if (s[0] === 3 && s[1] === 3 && s[2] === 1) return { showdown: true, mediator: tricks.indexOf(1) };
    const w = tricks.indexOf(s[0]);
    return { winner: w, points: s[0] === 7 ? (w === caller ? 2 : 3) : 1 };
  };
  return { eff, legal, winner, isKing, hand, SAME };
})();

/* ---- Moves ---- */
function randomAction(s, p, rnd) {
  const h = s.hands[p];
  switch (s.phase) {
    case P.DISCARD: return { type: 'DISCARD', player: p, cards: sample(rnd, h, 3) };
    case P.BID1: return { type: 'BID', player: p, accept: rnd() < 0.25 };
    case P.BID2: { const bl = R.card(s.flippedId).suit; return { type: 'NAME', player: p, suit: rnd() < 0.35 ? pick(rnd, R.SUITS.filter(x => x !== bl)) : null }; }
    case P.EXCHANGE: return { type: 'EXCHANGE', player: p, cards: sample(rnd, h, s.exchangeCount) };
    case P.SHOWDOWN_DISCARD: return { type: 'SHOWDOWN_DISCARD', player: p, card: pick(rnd, h) };
    default: return { type: 'PLAY', player: p, card: pick(rnd, O.legal(h, s.trick.leadSuit, s.trump)) };
  }
}
const TYPE_FOR = { [P.DISCARD]: 'DISCARD', [P.BID1]: 'BID', [P.BID2]: 'NAME', [P.EXCHANGE]: 'EXCHANGE', [P.TRICK_PLAY]: 'PLAY', [P.SHOWDOWN_PLAY]: 'PLAY', [P.SHOWDOWN_DISCARD]: 'SHOWDOWN_DISCARD' };
const ALL_TYPES = ['START_GAME', 'DEAL', 'DISCARD', 'FLIP', 'BID', 'NAME', 'EXCHANGE', 'PLAY', 'SHOWDOWN_DISCARD', 'ADVANCE', 'BOGUS', 'constructor', '__proto__', 'toString', 'hasOwnProperty'];
/* Actions that are invalid by construction: a wrong type for the phase, or one broken field of a valid action. */
function invalidActions(s, valid, rnd) {
  const out = [null, undefined, {}, { type: 5 }, { type: 'PLAY' }, 'PLAY', 42];
  const sys = E.systemAction(s);
  const okType = valid ? valid.type : sys && sys.type;
  for (const t of ALL_TYPES) if (t !== okType) out.push({ type: t, player: pick(rnd, [0, 1, 2]), card: pick(rnd, R.ALL_IDS), cards: sample(rnd, R.ALL_IDS, 3), accept: true, suit: 'S' });
  if (!valid) return out;
  const a = valid, p = a.player, others = [0, 1, 2].filter(q => !E.actors(s).includes(q));
  for (const bad of ['0', 3, -1, 1.5, NaN, null, undefined, ...others]) out.push(Object.assign({}, a, { player: bad }));
  const notMine = R.ALL_IDS.filter(id => !s.hands[p].includes(id));
  if (a.cards) {
    out.push(Object.assign({}, a, { cards: a.cards.slice(1) }), Object.assign({}, a, { cards: a.cards.concat([pick(rnd, s.hands[p].filter(x => !a.cards.includes(x)).concat(notMine))]) }));
    if (a.cards.length > 1) out.push(Object.assign({}, a, { cards: [a.cards[0], ...a.cards.slice(1).map(() => a.cards[0])] }));
    out.push(Object.assign({}, a, { cards: a.cards.map((c, i) => i === 0 ? pick(rnd, notMine) : c) }));
    out.push(Object.assign({}, a, { cards: 'AS' }), Object.assign({}, a, { cards: undefined }), Object.assign({}, a, { cards: a.cards.map(() => 'XX') }));
    if (a.cards.length === 1) out.push(Object.assign({}, a, { cards: [a.cards[0], a.cards[0]] }));
  }
  if ('card' in a) {
    out.push(Object.assign({}, a, { card: pick(rnd, notMine) }), Object.assign({}, a, { card: undefined }), Object.assign({}, a, { card: 'ZZ' }), Object.assign({}, a, { card: [a.card] }));
    if (a.type === 'PLAY') { const ill = s.hands[p].filter(id => !O.legal(s.hands[p], s.trick.leadSuit, s.trump).includes(id)); if (ill.length) out.push(Object.assign({}, a, { card: pick(rnd, ill) })); }
  }
  if (a.type === 'BID') for (const v of ['yes', 1, 0, undefined, null]) out.push(Object.assign({}, a, { accept: v }));
  if (a.type === 'NAME') for (const v of [R.card(s.flippedId).suit, 'X', undefined, 1, '', 'JK', 'SS']) out.push(Object.assign({}, a, { suit: v }));
  return out;
}

/* ---- Invariants after each step ---- */
function invariants(s, info) {
  const errs = E.audit(s);
  if (errs.length) fail('audit', Object.assign({ errs }, info));
  if (!s.scores.every(x => Number.isInteger(x) && x >= 0)) fail('scores', Object.assign({ scores: s.scores }, info));
  if (s.gameOver !== (s.phase === P.GAME_OVER)) fail('gameOver-phase', info);
  if (s.gameOver) {
    if (!(s.scores[s.winner] >= 10)) fail('winner-score', Object.assign({ scores: s.scores, winner: s.winner }, info));
    if (s.scores.filter(x => x >= 10).length !== 1) fail('two-at-10', Object.assign({ scores: s.scores }, info));
  } else if (s.scores.some(x => x >= 10)) fail('10-not-over', Object.assign({ scores: s.scores }, info));
  const act = E.actors(s), sys = E.systemAction(s);
  if (!s.gameOver && (act.length > 0) === !!sys) fail('actors-xor-system', Object.assign({ phase: s.phase, act, sys }, info));
  if (s.gameOver && (act.length || sys)) fail('acts-after-over', info);
  if (E.PLAY_PHASES.includes(s.phase)) {
    const left = s.totalTricks - s.trickNumber + 1;
    for (const p of s.activePlayers) {
      const inTrick = s.trick.plays.some(x => x.player === p) ? 1 : 0;
      if (s.hands[p].length + inTrick !== left) fail('hand-size', Object.assign({ p, hand: s.hands[p].length, inTrick, left }, info));
    }
    if (!s.showdown || !s.showdown.active) {
      if (s.outside.length !== 12) fail('outside-12', info);
      const done = s.tricksWon.reduce((a, b) => a + b, 0);
      if (done !== s.trickNumber - 1) fail('tricks-sum', Object.assign({ done, n: s.trickNumber }, info));
    }
  }
  if (new Set(s.played).size !== s.played.length) fail('played-dup', info);
}

/* One game. policy: 'fast' | 'random' | 'mix'. Returns stats and snapshots for later checks. */
function playGame(seed, policy, rnd, opts) {
  const s = E.createGame(seed);
  const st = { steps: 0, decisions: 0, rejectsTried: 0, hands: 0, showdowns: 0, abandoned: 0, jokerVoids: 0, sweeps2: 0, sweeps3: 0, kings: 0, sdKings: 0, floorHits: 0, sdLosses: 0, legalityChecks: 0 };
  const snaps = [];
  let sys = 0, nondet = 0;
  for (let guard = 0; guard < 20000 && !s.gameOver; guard++) {
    const act = E.actors(s);
    const p = act.length ? act[0] : null;
    let a;
    if (p === null) a = E.systemAction(s);
    else {
      const usePolicy = policy === 'fast' || (policy === 'mix' && rnd() < 0.5);
      a = usePolicy ? AIx.fastAction(s, p) : randomAction(s, p, rnd);
      // Turn order from the README: bidding starts left of the dealer and goes left.
      if (s.phase === P.BID1 || s.phase === P.BID2) {
        const n = s.bidLog.filter(b => b.round === (s.phase === P.BID1 ? 1 : 2)).length;
        if (p !== (s.dealer + 1 + n) % 3) fail('bid-turn', { seed, p, dealer: s.dealer, n });
      }
      // Differential legality: for every card in hand, the engine accepts a play iff the oracle says it is legal.
      if (E.PLAY_PHASES.includes(s.phase)) {
        const leg = O.legal(s.hands[p], s.trick.leadSuit, s.trump);
        for (const c of s.hands[p]) { st.legalityChecks++; const ok = E.validate(s, { type: 'PLAY', player: p, card: c }) === null; if (ok !== leg.includes(c)) fail('legality', { seed, card: c, hand: s.hands[p], lead: s.trick.leadSuit, trump: s.trump }); }
      }
    }
    // Broken actions must be refused, and the state must not change.
    if (opts.fuzz && rnd() < opts.fuzz) {
      const before = J(s);
      for (const bad of invalidActions(s, p === null ? null : a, rnd)) {
        st.rejectsTried++;
        let r;
        try { r = E.dispatch(s, bad); } catch (e) { fail('dispatch-threw', { seed, bad: J(bad), err: String(e) }); continue; }
        if (r.ok) { fail('accepted-invalid', { seed, phase: s.phase, bad: J(bad) }); return { st, snaps, s, broken: true }; }
      }
      if (J(s) !== before) { fail('reject-changed-state', { seed }); return { st, snaps, s, broken: true }; }
    }
    const pre = { tricks: s.tricksWon.slice(), caller: s.caller, scores: s.scores.slice(), dealer: s.dealer, plays: s.trick ? s.trick.plays.slice() : [], phase: s.phase, sd: s.showdown && JSON.parse(J(s.showdown)), trickWinners: s.trickWinners.slice() };
    const r = E.dispatch(s, a);
    if (!r.ok) { fail('valid-rejected', { seed, a: J(a), error: r.error, phase: s.phase }); return { st, snaps, s, broken: true }; }
    st.steps++;
    if (p === null) sys++; else st.decisions++;
    // Check each event against the oracle.
    let scoreReq = {};
    for (const e of r.events) {
      if (e.type === 'TRICK_WON' || e.type === 'SHOWDOWN_TRICK_WON') {
        const lt = s.lastTrick, w = O.winner(lt.plays, s.trump);
        if (w.player !== e.winner) fail('trick-winner', { seed, plays: lt.plays, trump: s.trump, engine: e.winner, oracle: w.player });
        if (O.isKing(w.card) !== e.king) fail('king-flag', { seed, card: w.card });
      }
      if (e.type === 'KING_SCORED') { if (e.showdown) st.sdKings++; else st.kings++; }
      if (e.type === 'KITTY_TRANSFER' && (e.to !== (s.caller + 1) % 3 || e.count !== (e.round === 1 ? 1 : 2))) fail('kitty-transfer', { seed, e });
      if (e.type === 'HAND_SCORED') {
        st.hands++;
        const o = O.hand(e.tricks, s.caller);
        if (o.showdown) { st.showdowns++; if (e.outcome !== 'SHOWDOWN' || s.showdown.mediator !== o.mediator) fail('showdown-trigger', { seed, tricks: e.tricks }); }
        else {
          if (e.winner !== o.winner || e.points !== o.points) fail('hand-points', { seed, tricks: e.tricks, caller: s.caller, engine: [e.winner, e.points], oracle: [o.winner, o.points] });
          if (o.points === 2) st.sweeps2++; if (o.points === 3) st.sweeps3++;
        }
        if (e.tricks.reduce((x, y) => x + y, 0) !== 7) fail('tricks-not-7', { seed, tricks: e.tricks });
      }
      if (e.type === 'SHOWDOWN_LEAD') {
        const parts = s.showdown.participants; let exp = null;
        for (let i = s.trickWinners.length - 1; i >= 0; i--) if (parts.includes(s.trickWinners[i])) { exp = s.trickWinners[i]; break; }
        if (exp !== e.player) fail('showdown-lead', { seed, exp, got: e.player });
      }
      if (e.type === 'SHOWDOWN_SCORED') {
        const t = e.tricks, [x, y] = s.showdown.participants;
        if (t[x] + t[y] !== 5 || e.winner !== (t[x] > t[y] ? x : y)) fail('showdown-winner', { seed, t });
      }
      if (e.type === 'SCORE_CHANGED') {
        const old = e.score - e.delta;
        if (e.score !== Math.max(0, old + e.requested)) fail('floor', { seed, e });
        if (e.requested < 0 && e.delta === 0) st.floorHits++;
        if (e.reason === 'SHOWDOWN_LOSS') st.sdLosses++;
        if (e.reason === 'KING' || e.reason === 'SHOWDOWN_KING') { if (e.requested !== 1) fail('king-points', { seed, e }); }
      }
      if (e.type === 'HAND_ABANDONED') st.abandoned++;
      if (e.type === 'HAND_VOID') st.jokerVoids++;
      if (e.type === 'BIDDING_ROUND' && e.round === 1 && s.bidTurn !== (s.dealer + 1) % 3) fail('first-bidder', { seed });
      if (e.type === 'TRICK_STARTED' && !e.showdown && e.number === 1 && e.leader !== (s.dealer + 1) % 3) fail('first-leader', { seed });
      if (e.type === 'DEALER_ROTATED' && e.dealer !== (pre.dealer + 1) % 3) fail('dealer-rotate', { seed });
      if (e.type === 'REDEAL' && e.dealer !== pre.dealer) fail('redeal-dealer', { seed });
    }
    // The game ends at once at 10, also mid-trick.
    if (s.gameOver && r.events[r.events.length - 1].type !== 'GAME_ENDED') fail('end-not-last', { seed });
    invariants(s, { seed, v: s.version });
    if (s.version !== st.steps) fail('version', { seed });
    if (s.decisions.length !== st.decisions) fail('decision-count', { seed });
    if (!s.gameOver && opts.snapEvery && rnd() < opts.snapEvery) snaps.push(J(s));
  }
  if (!s.gameOver) fail('no-end', { seed });
  st.games = 1; st.policy = {}; st.policy[policy] = 1;
  return { st, snaps, s };
}

/* Replay, seek and the save check on one finished game and its snapshots. */
function replayChecks(g, rnd, out) {
  const s = g.s, code = Rep.encode(Rep.fromState(s, { mode: 'free', seats: [null, 'vex', 'doc'], endedAt: Date.now() }));
  out.codeChars += code.length; out.codeMax = Math.max(out.codeMax || 0, code.length);
  const run = Rep.run(code);
  if (!run.ok) fail('replay-run', { seed: s.seed, error: run.error });
  else if (J(Object.assign({}, run.state, { players: 0 })) !== J(Object.assign({}, s, { players: 0 }))) fail('replay-state', { seed: s.seed });
  out.replays++;
  // Seek to random points, also backwards; each must equal a straight replay to that point.
  const cur = Rep.cursor(code), straight = n => { const c = Rep.cursor(code); c.seek(n); return J(c.state); };
  for (let k = 0; k < 4; k++) { const n = Math.floor(rnd() * (s.version + 1)); cur.seek(n); out.seeks++; if (J(cur.state) !== straight(n)) fail('seek', { seed: s.seed, n }); }
  // Saves: a real snapshot loads with the same state; any one changed field is refused.
  for (const snap of g.snaps) {
    const st = JSON.parse(snap);
    const ok = cleanSlot('free', { format: SAVE_FORMAT, state: st, personas: [null, 'vex', 'doc'], wave: { n: null } });
    out.slotAccept++;
    if (!ok || J(ok.state) !== snap) fail('slot-refused-real', { seed: s.seed, v: st.version });
    for (let m = 0; m < 6; m++) {
      const bad = JSON.parse(snap), path = mutate(bad, rnd);
      if (!path || path[0] === 'players') continue;
      if (J(bad) === snap) continue;
      out.slotMutations++;
      let res = null;
      try { res = cleanSlot('free', { format: SAVE_FORMAT, state: bad, personas: [null, 'vex', 'doc'], wave: { n: null } }); } catch (e) { fail('slot-threw', { path: path.join('.'), err: String(e) }); }
      if (res) fail('slot-accepted-mutation', { seed: s.seed, path: path.join('.') });
    }
  }
}
/* Changes one random leaf (or array) of x. Returns its path. */
function mutate(x, rnd) {
  const path = [];
  let node = x;
  for (let d = 0; d < 8; d++) {
    const keys = Object.keys(node);
    if (!keys.length) break;
    const k = pick(rnd, keys);
    const v = node[k];
    path.push(k);
    if (v && typeof v === 'object' && rnd() < 0.75) { node = v; continue; }
    if (Array.isArray(v)) { if (v.length && rnd() < 0.5) v.pop(); else v.push(v.length ? v[0] : 1); }
    else if (typeof v === 'number') node[k] = rnd() < 0.5 ? v + 1 : '<b>' + v + '</b>';
    else if (typeof v === 'string') node[k] = v + 'x';
    else if (typeof v === 'boolean') node[k] = !v;
    else if (v === null) node[k] = 0;
    else if (v && typeof v === 'object') node[k] = null;
    return path;
  }
  return null;
}

const SECTIONS = {

  /* Record objects with holes and junk: Replay.run returns ok:false with an error, and never throws. */
  recordFuzz(prm) {
    const rnd = mk(313 + prm.shard);
    const out = { tries: 0, ok: 0, refused: 0, encodeErr: 0 };
    const base = [];
    for (let i = 0; i < 4; i++) base.push(Rep.fromState(playGame(9000 + prm.shard * 10 + i, 'mix', rnd, {}).s, { mode: 'free' }));
    const junk = [null, undefined, 0, '', 'x', [], {}, { type: 'MARK' }, { type: 'EXT', kind: 1 }, { type: 'PLAY' }, { type: 'PLAY', player: 0, card: 'AS' }, NaN, true];
    for (let i = 0; i < prm.tries; i++) {
      const rec = JSON.parse(J(pick(rnd, base)));
      const n = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const kind = Array.isArray(rec.decisions) && rec.decisions.length ? Math.floor(rnd() * 5) : 3 + Math.floor(rnd() * 2);
        if (kind === 0) rec.decisions[Math.floor(rnd() * rec.decisions.length)] = pick(rnd, junk);
        else if (kind === 1) rec.decisions.splice(Math.floor(rnd() * rec.decisions.length), 1);
        else if (kind === 2) rec.decisions.push(pick(rnd, junk));
        else if (kind === 3) mutate(rec, rnd);
        else rec[pick(rnd, ['seed', 'rules', 'decisions', 'result'])] = pick(rnd, junk);
      }
      out.tries++;
      let r;
      try { r = Rep.run(rec); } catch (e) { fail('run-threw', { err: String(e) }); continue; }
      if (r.ok) out.ok++; else { out.refused++; if (typeof r.error !== 'string' || !r.error) fail('no-error-text', {}); }
      try { Rep.encode(rec); } catch (e) { out.encodeErr++; if (!(e instanceof Error)) fail('encode-non-error', {}); }
    }
    return Object.assign(out, { fails });
  },
  /* Engine games with the oracle, fuzz, replay, seek and save checks. */
  engine(prm) {
    const rnd = mk(1000 + prm.shard * 7919);
    const out = { replays: 0, seeks: 0, slotAccept: 0, slotMutations: 0, codeChars: 0 };
    const tot = {};
    const t0 = performance.now();
    for (let i = 0; i < prm.games; i++) {
      const seed = (prm.shard * 1000003 + i * 2654435761) >>> 0;
      const policy = ['random', 'fast', 'mix'][i % 3];
      const g = playGame(seed, policy, rnd, { fuzz: prm.fuzz, snapEvery: i % prm.replayEvery === 0 ? 0.01 : 0 });
      for (const [k, v] of Object.entries(g.st)) if (typeof v === 'number') tot[k] = (tot[k] || 0) + v;
      if (!g.broken && i % prm.replayEvery === 0) replayChecks(g, rnd, out);
    }
    out.ms = Math.round(performance.now() - t0);
    return Object.assign(out, tot, { fails });
  },
  /* Damaged replay codes: decode and run must fail with an Error (or succeed), never hang or break. */
  replayFuzz(prm) {
    const rnd = mk(77 + prm.shard);
    const out = { tries: 0, decodedOk: 0, decodeErr: 0, runOk: 0, runFail: 0, slowest: 0 };
    const codes = [];
    for (let i = 0; i < 6; i++) { const g = playGame(4000 + prm.shard * 10 + i, 'mix', rnd, {}); codes.push(Rep.encode(Rep.fromState(g.s, { mode: 'waves', wave: 3, seats: [null, 'kit', 'tex'], endedAt: 1.7e12, meta: { a: 1, b: 'x', c: true, d: [1, 2] } }))); }
    const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    for (let i = 0; i < prm.tries; i++) {
      let c = pick(rnd, codes);
      const kind = Math.floor(rnd() * 6);
      const body = c.slice(5).split('');
      if (kind === 0) { const n = 1 + Math.floor(rnd() * 4); for (let k = 0; k < n; k++) body[Math.floor(rnd() * body.length)] = pick(rnd, b64.split('')); }
      else if (kind === 1) body.length = Math.floor(rnd() * body.length);
      else if (kind === 2) body.splice(Math.floor(rnd() * body.length), 0, ...Array.from({ length: 1 + Math.floor(rnd() * 20) }, () => pick(rnd, b64.split(''))));
      else if (kind === 3) { const bytes = Array.from({ length: Math.floor(rnd() * 200) }, () => Math.floor(rnd() * 256)); c = 'KCT2-' + Base64url.encode(bytes); }
      else if (kind === 4) { const bytes = Array.from({ length: Math.floor(rnd() * 60) }, () => Math.floor(rnd() * 256)); bytes[0] = 2; c = 'KCT2-' + Base64url.encode(bytes); }
      else { const bytes = Array.from({ length: Math.floor(rnd() * 200) }, () => Math.floor(rnd() * 256)); bytes[0] = 1; c = 'KCT1-' + Base64url.encode(bytes); }
      if (kind < 3) c = c.slice(0, 5) + body.join('');
      out.tries++;
      const t = performance.now();
      try { Rep.decode(c); out.decodedOk++; } catch (e) { if (!(e instanceof Error)) fail('decode-non-error', { c }); out.decodeErr++; }
      let r;
      try { r = Rep.run(c); } catch (e) { fail('run-threw', { c: c.slice(0, 80), err: String(e) }); continue; }
      if (r.ok) out.runOk++; else out.runFail++;
      if (r.ok && r.state && E.audit(r.state).length) fail('run-ok-bad-state', { c: c.slice(0, 80) });
      const ms = performance.now() - t;
      if (ms > out.slowest) out.slowest = Math.round(ms);
    }
    return Object.assign(out, { fails });
  },
  /* Backup: round trips (file and code, gzip and plain), all-or-nothing import, damaged input. */
  async backup(prm) {
    const rnd = mk(91 + prm.shard);
    const out = { roundTrips: 0, atomicTries: 0, fuzzTries: 0, parsedOk: 0, parsedErr: 0 };
    const fake = (init, failOn) => { const m = new Map(Object.entries(init)); return { get length() { return m.size; }, key: i => Array.from(m.keys())[i] ?? null, getItem: k => m.get(k) ?? null, setItem(k, v) { if (k === failOn) throw new Error('quota'); m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, dump: () => J(Object.fromEntries([...m].sort())) }; };
    const randData = () => { const d = {}; const n = 1 + Math.floor(rnd() * 6); for (let i = 0; i < n; i++) d['kct.' + Math.floor(rnd() * 1e6).toString(36)] = J({ x: rnd(), s: 'é♠"<>\\' + i, a: Array.from({ length: Math.floor(rnd() * 50) }, () => Math.floor(rnd() * 1e6)) }); d['other.' + n] = 'keep'; return d; };
    for (let i = 0; i < prm.n; i++) {
      const src = fake(randData());
      const env = Backup.create(src, { i });
      for (const form of ['json', 'gzip', 'plain']) {
        const text = form === 'json' ? Backup.toJSON(env) : await Backup.toCode(env, { plain: form === 'plain' });
        const back = await Backup.parse(text);
        const dst = fake({ 'kct.old': '{}', 'other.app': 'mine' });
        Backup.apply(dst, back);
        const want = J(Object.fromEntries([...Object.entries(env.data), ['other.app', 'mine']].sort()));
        out.roundTrips++;
        if (dst.dump() !== want) fail('backup-roundtrip', { form });
      }
      // All or nothing: a failing write at any key leaves the old data.
      const keys = Object.keys(env.data);
      const dst = fake({ 'kct.a': '{"old":1}', 'kct.zz': '[]', 'x.y': 'z' }, pick(rnd, keys));
      const before = dst.dump();
      out.atomicTries++;
      try { Backup.apply(dst, env); fail('apply-should-throw', {}); } catch (e) { if (dst.dump() !== before) fail('apply-not-atomic', { before, after: dst.dump() }); }
      // Damaged codes and files.
      const code = await Backup.toCode(env);
      for (let k = 0; k < 10; k++) {
        let t = code.split('');
        const kind = Math.floor(rnd() * 4);
        if (kind === 0) t[5 + Math.floor(rnd() * (t.length - 5))] = pick(rnd, 'Aa0-_Zz'.split(''));
        else if (kind === 1) t.length = Math.floor(rnd() * t.length);
        else if (kind === 2) t = Backup.toJSON(env).split('').map(c => (rnd() < 0.01 ? pick(rnd, '{}[]",:0a'.split('')) : c));
        else t = ('KCTS1-' + Base64url.encode([pick(rnd, [0, 1, 2]), ...Array.from({ length: Math.floor(rnd() * 80) }, () => Math.floor(rnd() * 256))])).split('');
        out.fuzzTries++;
        try { const e2 = await Backup.parse(t.join('')); out.parsedOk++; Backup.check(e2); } catch (e) { if (!(e instanceof Error)) fail('backup-non-error', {}); out.parsedErr++; }
      }
    }
    return Object.assign(out, { fails });
  },
  /* AI: decisions are legal and depend only on the view (hidden cards shuffled: same decision). */
  ai(prm) {
    const rnd = mk(5 + prm.shard * 31);
    const out = { decisions: 0, viewSame: 0, viewDiffer: 0, msMax: 0, msTotal: 0, byPhase: {} };
    const cfgs = PERSONAS.map(x => AIx.personaConfig(x)).concat([AIx.DEFAULT_CONFIG, AIx.config(AIx.DEFAULT_CONFIG, { knowledge: AIx.KNOWLEDGE_ALL_ON, thinking: { worlds: 1, playoutSkill: 0 }, style: { realTable: true, courage: 'timid' } })]);
    for (let i = 0; i < prm.n; i++) {
      // Play a random game a random number of steps into it.
      const s = E.createGame((prm.shard * 99991 + i * 7777) >>> 0);
      const stop = Math.floor(rnd() * 400);
      for (let k = 0; k < stop && !s.gameOver; k++) { const act = E.actors(s); E.dispatch(s, act.length ? (rnd() < 0.5 ? AIx.fastAction(s, act[0]) : randomAction(s, act[0], rnd)) : E.systemAction(s)); }
      const act = E.actors(s);
      if (s.gameOver || !act.length) { i--; continue; }
      const p = act[0], cfg = pick(rnd, cfgs);
      const t = performance.now();
      const d1 = AIx.decide(buildView(s, p), cfg);
      const ms = performance.now() - t; out.msMax = Math.max(out.msMax, Math.round(ms)); out.msTotal += Math.round(ms);
      out.decisions++; out.byPhase[s.phase] = (out.byPhase[s.phase] || 0) + 1;
      if (E.validate(s, d1) !== null) fail('ai-illegal', { phase: s.phase, d: J(d1), err: E.validate(s, d1) });
      // Shuffle the cards this seat cannot see, keeping every pile's size. The view must stay the same.
      const view0 = J(buildView(s, p));
      const t2 = JSON.parse(J(s));
      const mine = new Set([...t2.memory[p].out, ...t2.played, t2.flippedId].filter(Boolean));
      const spots = [];
      for (let q = 0; q < 3; q++) if (q !== p) t2.hands[q].forEach((c, k) => spots.push(['hands', q, k]));
      t2.kitty.forEach((c, k) => { if (k !== 0 || !t2.flippedId) spots.push(['kitty', null, k]); });
      t2.outside.forEach((c, k) => spots.push(['outside', null, k]));
      if (t2.showdown) t2.showdown.discards.forEach((c, k) => spots.push(['sd', null, k]));
      const get = ([w, q, k]) => w === 'hands' ? t2.hands[q][k] : w === 'sd' ? t2.showdown.discards[k] : t2[w][k];
      const set = ([w, q, k], v) => { if (w === 'hands') t2.hands[q][k] = v; else if (w === 'sd') t2.showdown.discards[k] = v; else t2[w][k] = v; };
      const free = spots.filter(sp => !mine.has(get(sp)) && !(s.receiver === null ? false : (sp[0] === 'hands' && sp[1] === s.receiver && s.received.includes(get(sp)) && s.round === 1)));
      const vals = sample(rnd, free.map(get), free.length);
      free.forEach((sp, k) => set(sp, vals[k]));
      if (J(buildView(t2, p)) !== view0) { out.viewDiffer++; continue; }
      out.viewSame++;
      const d2 = AIx.decide(buildView(t2, p), cfg);
      if (J(d1) !== J(d2)) fail('ai-saw-hidden', { phase: s.phase, d1: J(d1), d2: J(d2) });
    }
    return Object.assign(out, { fails });
  }
};
