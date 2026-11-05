#!/usr/bin/env node
/* Feedback module (feedback/feedback.js, with synth.js and palettes.js): the rule table picks the right cue,
   the gates and the dropping rules keep what should be quiet quiet, the Settings rows read and write the
   module's kct.feedback. keys, every required preset renders in every palette, and the contract holds: the
   ready message, the log messages, and silence for a version mismatch or a missing file. Runs on a harness
   page (tests/page/feedback.html) with vibration and the playing AudioContext stubbed; rendering is real.
   Exit code 1 on a failed check. Spec: docs/ui/feedback.md and docs/ui/feedback-contract.md. */
'use strict';
const { serve, launch } = require('./lib/browser');

let failed = 0;
function expect(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? '  ✔ ' : '  ✖ ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail)));
}

/* Runs before the module: a vibration spy, a playing AudioContext that records what starts, and a record of
   the module's messages. OfflineAudioContext and AudioBuffer stay real, so rendering is real. */
function stubs() {
  const w = /** @type {any} */ (window);
  w.__vibrations = [];
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: (p) => { w.__vibrations.push(p); return true; } });
  w.__starts = [];
  w.__contexts = 0;
  class FakeAudioContext {
    constructor() { w.__contexts++; this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    createGain() { return { gain: { value: 1 }, connect() {} }; }
    createBufferSource() {
      const s = { buffer: null, onended: null, connect() {}, stop() {},
        start() { w.__starts.push({ length: s.buffer ? s.buffer.length : 0 }); setTimeout(() => s.onended && s.onended(), 5); } };
      return s;
    }
  }
  w.AudioContext = FakeAudioContext;
  w.__logs = [];
  w.__ready = [];
  document.addEventListener('kct:feedback-log', (e) => w.__logs.push(e.detail));
  document.addEventListener('kct:feedback-ready', (e) => w.__ready.push(e.detail));
}

/* A batch, as the game sends it. */
const batchSrc = `
  window.__send = (moments, extra) => document.dispatchEvent(new CustomEvent('kct:moment', { detail: Object.assign(
    { v: 1, version: (window.__ver = (window.__ver || 0) + 1), at: performance.now(), anchor: 'sweep', replay: false, moments }, extra || {}) }));
  window.__control = (control, extra) => document.dispatchEvent(new CustomEvent('kct:moment', { detail: Object.assign(
    { v: 1, version: window.__ver || 0, at: performance.now(), moments: [], control }, extra || {}) }));
`;

(async () => {
  const server = await serve();
  const base = server.url.replace(/index\.html$/, '');
  const browser = await launch();
  try {
    /* ---------- The pure core ---------- */
    console.log('Rule table');
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    await ctx.addInitScript(stubs);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
    await page.goto(base + 'tests/page/feedback.html');
    await page.evaluate(batchSrc);

    const cues = await page.evaluate(() => {
      const { cueFor } = /** @type {any} */ (window).KCTFeedback.core;
      const c = (moments) => { const r = cueFor({ v: 1, moments }); return r ? r.name : null; };
      return {
        trickYou: c([{ type: 'trickWon', seat: 0, you: true }]),
        trickBot: c([{ type: 'trickWon', seat: 1, you: false }]),
        kingOverTrick: c([{ type: 'trickWon', you: true }, { type: 'king', you: true }]),
        botKing: c([{ type: 'trickWon', you: false }, { type: 'king', you: false }]),
        gameEndMidTrick: c([{ type: 'trickWon', you: true }, { type: 'king', you: true }, { type: 'gameEnded', you: true, byKing: true }]),
        gameLoss: c([{ type: 'gameEnded', you: false }]),
        wave: c([{ type: 'gameEnded', you: true }, { type: 'waveCleared', wave: 3 }]),
        showdownOverHand: c([{ type: 'handScored', you: true }, { type: 'showdownCalled', youPlay: true }]),
        showdownWatch: c([{ type: 'showdownCalled', youPlay: false, youMediate: true }]),
        showdownMediated: c([{ type: 'showdownScored', you: false, youMediate: true }]),
        showdownLoss: c([{ type: 'showdownScored', you: false, youMediate: false }]),
        skipMediate: c([{ type: 'skipPressed', youMediate: true }]),
        skipOther: c([{ type: 'skipPressed', youMediate: false }]),
        pick: c([{ type: 'cardPicked', card: 'KS', picked: true }]),
        unknownOnly: c([{ type: 'somethingNew', you: true }]),
        unknownWithKnown: c([{ type: 'somethingNew' }, { type: 'deal', showdown: false, extra: 1 }]),
        empty: c([]),
        junk: c([null, 7, { notype: 1 }]),
      };
    });
    const want = {
      trickYou: 'trickYou', trickBot: 'trickBot', kingOverTrick: 'kingYou', botKing: 'kingBot', gameEndMidTrick: 'suddenDeathYou',
      gameLoss: 'gameLoss', wave: 'waveCleared', showdownOverHand: 'showdownCalledYou', showdownWatch: 'showdownCalledOther',
      showdownMediated: 'showdownMediated', showdownLoss: 'showdownLoss', skipMediate: 'skip', skipOther: null, pick: 'pick',
      unknownOnly: null, unknownWithKnown: 'deal', empty: null, junk: null,
    };
    for (const k of Object.keys(want)) expect('cue for ' + k + ' is ' + want[k], cues[k] === want[k], cues[k]);

    const tables = await page.evaluate(() => {
      const { RULES, CUES, LAYERS } = /** @type {any} */ (window).KCTFeedback.core;
      return { missing: RULES.filter((r) => !CUES[r.cue]).map((r) => r.cue), sorted: RULES.every((r, i) => !i || RULES[i - 1].rank <= r.rank),
        vibrating: Object.keys(CUES).filter((k) => CUES[k].vibrate), unused: Object.keys(CUES).filter((k) => !RULES.concat(LAYERS).some((r) => r.cue === k)) };
    });
    expect('every rule names a cue', tables.missing.length === 0, tables.missing);
    expect('the rules are in rank order', tables.sorted);
    expect('every cue has a rule', tables.unused.length === 0, tables.unused);
    /* A bot's moment never vibrates, except the end of your game (a loss is yours too). */
    expect('only your moments and results vibrate', tables.vibrating.every((k) => !/(?<!suddenDeath)Bot$|Other$|^hand|^card|^deal|^flip|^discard|^trump/.test(k)), tables.vibrating);

    console.log('Moments of interest and derived events');
    const moi = await page.evaluate(() => {
      const { cueFor, newMemory, derive } = /** @type {any} */ (window).KCTFeedback.core;
      const c = (moments, you = 0) => { const r = cueFor({ moments }, { you }); return r ? r.name : null; };
      const deal = { type: 'deal', showdown: false, handNumber: 1, bottom: 0 };
      const types = (mem, moments) => derive(mem, { moments }).map((d) => d.type);
      const r = {};
      /* Lead changes: alone at the top, and only once the leader has 7. */
      r.leadYou = c([{ type: 'king', seat: 0, you: true, scoresBefore: [6, 7, 2], scoresAfter: [7, 7, 2] }]);   // a tie: no
      r.leadYou2 = c([{ type: 'king', seat: 0, you: true, scoresBefore: [7, 7, 2], scoresAfter: [8, 7, 2] }]);
      r.leadEarly = c([{ type: 'king', seat: 0, you: true, scoresBefore: [4, 5, 2], scoresAfter: [5, 5, 2] }, { type: 'trickWon', seat: 0, you: true }]);
      r.leadBot = c([{ type: 'handScored', winner: 1, you: false, outcome: 'CLEAR_WINNER', scoresBefore: [7, 7, 2], scoresAfter: [7, 8, 2] }]);
      r.botsOnly = c([{ type: 'handScored', winner: 2, you: false, outcome: 'CLEAR_WINNER', scoresBefore: [3, 8, 7], scoresAfter: [3, 8, 8] }]);
      r.sudden = c([{ type: 'gameEnded', you: true, byKing: true }]);
      r.steal = c([{ type: 'handScored', winner: 0, you: true, outcome: 'NON_NAMER_SWEEP', scoresBefore: [1, 2, 3], scoresAfter: [4, 2, 3] }]);
      r.perfect = c([{ type: 'handScored', winner: 0, you: true, outcome: 'NAMER_SWEEP', scoresBefore: [1, 2, 3], scoresAfter: [3, 2, 3] }]);
      r.denial = c([{ type: 'handScored', winner: 0, you: true, outcome: 'CLEAR_WINNER', scoresBefore: [3, 9, 2], scoresAfter: [4, 9, 2] }]);
      r.knocked = c([{ type: 'showdownScored', winner: 1, loser: 2, you: false, youMediate: true, tricks: [0, 3, 2], scoresBefore: [3, 5, 9], scoresAfter: [3, 6, 8] }]);
      r.sweep = c([{ type: 'showdownScored', winner: 0, loser: 1, you: true, tricks: [5, 0, 0], scoresBefore: [3, 5, 2], scoresAfter: [4, 4, 2] }]);
      r.finalWave = c([{ type: 'gameEnded', you: true }, { type: 'waveCleared', wave: 18, finalWave: true }]);
      /* Derived events from the memory. */
      let mem = newMemory(); types(mem, [deal]);
      r.kingKilledTrump = types(mem, [{ type: 'cardPlayed', seat: 0, you: true, card: 'KS' }, { type: 'trickWon', seat: 1, you: false, card: 'JS', trump: 'S', trickNumber: 1, totalTricks: 7, tricksWon: [0, 1, 0] }]);
      r.kingKilledOther = types(mem, [{ type: 'cardPlayed', seat: 0, you: true, card: 'KH' }, { type: 'trickWon', seat: 1, you: false, card: 'AH', trump: 'S', trickNumber: 2, totalTricks: 7, tricksWon: [0, 2, 0] }]);
      mem = newMemory(); types(mem, [deal]);
      const streak = [];
      for (let n = 1; n <= 8; n++) streak.push(types(mem, [{ type: 'trickWon', seat: 0, you: true, trickNumber: n % 7 || 7, totalTricks: 7, showdown: false, tricksWon: [1, 0, 0] }]).includes('derived:trickStreak') ? n : 0);
      r.streakAt = streak.filter(Boolean);
      mem = newMemory(); types(mem, [deal]);
      r.decider = types(mem, [{ type: 'trickWon', seat: 2, you: false, trickNumber: 7, totalTricks: 7, showdown: false, tricksWon: [3, 3, 1] }]);
      r.deciderNotYou = types(mem, [{ type: 'trickWon', seat: 0, you: true, trickNumber: 7, totalTricks: 7, showdown: false, tricksWon: [1, 3, 3] }]);
      r.decider321 = types(mem, [{ type: 'trickWon', seat: 1, you: false, trickNumber: 7, totalTricks: 7, showdown: false, tricksWon: [3, 3, 1] }]);
      mem = newMemory(); types(mem, [deal]);
      r.match1 = types(mem, [{ type: 'king', seat: 1, you: false, scoresBefore: [3, 8, 2], scoresAfter: [3, 9, 2] }]);
      r.match2 = types(mem, [{ type: 'showdownScored', winner: 0, loser: 1, you: true, tricks: [3, 2, 0], scoresBefore: [3, 9, 2], scoresAfter: [4, 8, 2] }, { type: 'king', seat: 1, you: false, scoresBefore: [4, 8, 2], scoresAfter: [4, 9, 2] }]);
      r.firstKing = types(mem, [{ type: 'king', seat: 0, you: true, scoresBefore: [4, 9, 2], scoresAfter: [5, 9, 2] }]);
      r.secondKing = types(mem, [{ type: 'king', seat: 0, you: true, scoresBefore: [5, 9, 2], scoresAfter: [6, 9, 2] }]);
      const partial = newMemory();   // a resumed game: the memory did not see the first deal
      types(partial, [{ type: 'deal', showdown: false, handNumber: 4, bottom: 0 }]);
      r.firstKingPartial = types(partial, [{ type: 'king', seat: 0, you: true, scoresBefore: [0, 0, 0], scoresAfter: [1, 0, 0] }]);
      mem = newMemory(); types(mem, [deal]);
      types(mem, [{ type: 'handScored', winner: 1, you: false, outcome: 'CLEAR_WINNER', scoresBefore: [0, 4, 0], scoresAfter: [0, 5, 0] }]);
      r.comeback = types(mem, [{ type: 'gameEnded', winner: 0, you: true, scores: [10, 7, 2], byKing: false }]);
      mem = newMemory(); types(mem, [deal]);
      types(mem, [{ type: 'showdownScored', winner: 1, loser: 0, you: false, tricks: [2, 3, 0], scoresBefore: [1, 1, 0], scoresAfter: [0, 2, 0] }]);
      r.revenge = types(mem, [{ type: 'showdownScored', winner: 0, loser: 1, you: true, tricks: [3, 2, 0], scoresBefore: [0, 2, 0], scoresAfter: [1, 1, 0] }]);
      r.noChain = types(mem, [{ type: 'derived:matchPoint', seat: 0, you: true }]);
      return r;
    });
    const has = (a, t) => Array.isArray(a) && a.includes(t);
    expect('a tie for the lead is no lead change', moi.leadYou === 'kingYou', moi.leadYou);
    expect('taking the lead alone at 8: leadYou', moi.leadYou2 === 'leadYou', moi.leadYou2);
    expect('an early lead change (under 7) stays an ordinary King', moi.leadEarly === 'kingYou', moi.leadEarly);
    expect('a bot taking the lead from you: leadBot', moi.leadBot === 'leadBot', moi.leadBot);
    expect('two bots trading the lead while you trail: not yours', moi.botsOnly === 'handLoss', moi.botsOnly);
    expect('the game ended on your King point: suddenDeathYou', moi.sudden === 'suddenDeathYou', moi.sudden);
    expect('a sweep against the namer: stealYou', moi.steal === 'stealYou', moi.steal);
    expect('your namer sweep: perfectHand', moi.perfect === 'perfectHand', moi.perfect);
    expect('a win while a bot is at 9: denial', moi.denial === 'denial', moi.denial);
    expect('a Showdown loss off 9: knockedBack', moi.knocked === 'knockedBack', moi.knocked);
    expect('a 5-0 Showdown: showdownSweep', moi.sweep === 'showdownSweep', moi.sweep);
    expect('the final wave outranks the wave and the win', moi.finalWave === 'finalWave', moi.finalWave);
    expect('your King of trump beaten: kingKilled; another King: not', has(moi.kingKilledTrump, 'derived:kingKilled') && !has(moi.kingKilledOther, 'derived:kingKilled'), moi);
    expect('a trick streak at 4 and 7 in a row', JSON.stringify(moi.streakAt) === '[4,7]', moi.streakAt);
    expect('the decider: 3-3-0 before trick 7 with you on 3', has(moi.decider, 'derived:decider'), moi.decider);
    expect('no decider when you aren\'t on 3', !has(moi.deciderNotYou, 'derived:decider'), moi.deciderNotYou);
    expect('match point once per seat, even after dropping back', has(moi.match1, 'derived:matchPoint') && !has(moi.match2, 'derived:matchPoint'), moi);
    expect('your first King of the game, once', has(moi.firstKing, 'derived:firstKing') && !has(moi.secondKing, 'derived:firstKing'), moi);
    expect('no first King when the memory missed the start (a resume)', !has(moi.firstKingPartial, 'derived:firstKing'), moi.firstKingPartial);
    expect('a win from 5 behind: comeback', has(moi.comeback, 'derived:comeback'), moi.comeback);
    expect('beating the seat that won the last Showdown: revenge', has(moi.revenge, 'derived:revenge'), moi.revenge);
    expect('a derived event never spawns another', moi.noChain.length === 0, moi.noChain);

    console.log('Variety');
    const vr = await page.evaluate(() => {
      const F = /** @type {any} */ (window).KCTFeedback.core;
      const mem = () => Object.assign(F.newMemory(), { you: 0, hand: 3 });
      const found = (name) => ({ name, rank: 0, cue: F.CUES[name] });
      const r = {};
      /* Stakes from public scores. */
      const king = { moments: [{ type: 'king', seat: 0, you: true }] }, card = { moments: [{ type: 'cardPlayed', seat: 0, you: true }] };
      r.stakes = [F.stakesOf([3, 4, 2], king), F.stakesOf([7, 4, 2], king), F.stakesOf([9, 4, 2], card), F.stakesOf([9, 4, 2], king), F.stakesOf(null, king)];
      /* Variants: the same batch always picks the same; different versions spread over the list. */
      const b = (v) => ({ version: v, moments: [{ type: 'cardPlayed', seat: 1, you: false, card: 'AS' }] });
      const p1 = F.compose(found('cardPlayed'), b(10), mem(), 0).sound, p2 = F.compose(found('cardPlayed'), b(10), mem(), 0).sound;
      const spread = new Set(); for (let v = 0; v < 40; v++) spread.add(F.compose(found('cardPlayed'), b(v), mem(), 0).sound);
      r.sameVariant = p1 === p2; r.spread = [...spread].sort();
      r.missingSkipped = F.compose(found('cardPlayed'), b(5), mem(), 0, (n) => n === 'card-play').sound;
      /* Escalation: stakes entries replace only the parts they name. */
      const kb = { version: 3, moments: [{ type: 'king', seat: 0, you: true, scoresBefore: [8, 4, 2], scoresAfter: [9, 4, 2] }] };
      r.kingCalm = F.compose(found('kingYou'), kb, mem(), 0).vibrate;
      r.kingDecider = F.compose(found('kingYou'), kb, mem(), 3);
      r.streak4 = F.compose(found('streak'), { version: 1, moments: [{ type: 'derived:trickStreak', count: 4 }] }, mem(), 0);
      r.streak7 = F.compose(found('streak'), { version: 1, moments: [{ type: 'derived:trickStreak', count: 7 }] }, mem(), 0);
      /* Novelty: the same special cue within 3 hands gives way to its ordinary cue; later it plays again. */
      const m1 = mem(), sb = { version: 1, moments: [{ type: 'derived:firstKing' }] };
      r.nov1 = F.compose(found('firstKing'), sb, m1, 0).name;
      m1.hand = 4; r.nov2 = F.compose(found('firstKing'), sb, m1, 0).name;
      m1.hand = 7; r.nov3 = F.compose(found('firstKing'), sb, m1, 0).name;
      /* Layering: one part, on a channel the main cue leaves free, at the Decider level only. */
      const hb = { version: 2, moments: [{ type: 'handScored', winner: 1, you: false, outcome: 'CLEAR_WINNER', scoresBefore: [3, 9, 2], scoresAfter: [3, 10, 2] }] };
      r.layer3 = F.compose(found('handLoss'), hb, mem(), 3);
      r.layer2 = F.compose(found('handLoss'), hb, mem(), 2).layer;
      r.layerBusy = F.compose(found('showdownCalledYou'), { version: 2, moments: [{ type: 'showdownCalled', youPlay: true }, { type: 'king', seat: 0, you: true }] }, mem(), 3);
      /* Parameters: clamped, a bad one falls back, and none turns a channel on. */
      const hw = (points) => F.compose(found('handWin'), { version: 1, moments: [{ type: 'handScored', winner: 0, you: true, points, outcome: 'CLEAR_WINNER' }] }, mem(), 0).gain;
      r.gain = [hw(1), hw(3), hw(99)];
      const saved = F.CUES.handWin.gain;
      F.CUES.handWin.gain = () => { throw new Error('bad'); }; r.badGain = hw(1);
      F.CUES.handWin.gain = () => NaN; r.nanGain = hw(1);
      F.CUES.handWin.gain = saved;
      r.noVibrateStill = F.compose(found('handWin'), { version: 1, moments: [{ type: 'handScored', winner: 0, you: true, points: 3 }] }, mem(), 3).vibrate;
      r.lead = F.compose(found('leadYou'), { version: 1, moments: [{ type: 'king', seat: 0, you: true, scoresBefore: [7, 7, 2], scoresAfter: [9, 7, 2] }] }, mem(), 2).vibrate;
      r.cap = (() => { const saved2 = F.CUES.leadYou.scale; F.CUES.leadYou.scale = 50; const v = F.compose(found('leadYou'), { version: 1, moments: [{ type: 'king', seat: 0, you: true }] }, mem(), 0).vibrate; F.CUES.leadYou.scale = saved2; return v; })();
      return r;
    });
    expect('stakes: Calm, Close, Match point, Decider (a scoring moment at 9), none without scores', JSON.stringify(vr.stakes) === '[0,1,2,3,0]', vr.stakes);
    expect('a variant pick is the same for the same batch', vr.sameVariant);
    expect('variants spread across versions', vr.spread.length === 3, vr.spread);
    expect('a missing variant is skipped', vr.missingSkipped === 'card-play', vr.missingSkipped);
    expect('escalation: the King\'s vibration at Calm and at the Decider', JSON.stringify(vr.kingCalm) === '[35,60,35]' && JSON.stringify(vr.kingDecider.vibrate) === '[55,40,55,40,55]' && /^king-you/.test(vr.kingDecider.sound), vr);
    expect('escalation by count: a streak of 7 vibrates longer than 4', vr.streak7.vibrate.length > vr.streak4.vibrate.length, [vr.streak4.vibrate, vr.streak7.vibrate]);
    expect('a parameter from the count: the streak plays a little faster at 7', vr.streak7.rate > vr.streak4.rate && vr.streak7.rate <= 1.1, [vr.streak4.rate, vr.streak7.rate]);
    expect('novelty: firstKing, then its ordinary cue within 3 hands, then firstKing again', vr.nov1 === 'firstKing' && vr.nov2 === 'kingYou' && vr.nov3 === 'firstKing', [vr.nov1, vr.nov2, vr.nov3]);
    expect('a layer at the Decider adds parallax under a cue that has none', vr.layer3.layer === 'layerDecider' && vr.layer3.parallax === 'pulse', vr.layer3);
    expect('no layer below the Decider', vr.layer2 === null, vr.layer2);
    expect('a layer never doubles a channel the main cue uses', vr.layerBusy.parallax === 'lift' && vr.layerBusy.layer === null, vr.layerBusy);
    expect('gain grows with the hand\'s points, clamped to 1', vr.gain[0] < vr.gain[1] && vr.gain[2] === 1, vr.gain);
    expect('a parameter that throws or returns NaN plays at its default', vr.badGain === 1 && vr.nanGain === 1, [vr.badGain, vr.nanGain]);
    expect('no parameter or escalation turns on a channel the cue lacks', vr.noVibrateStill === null, vr.noVibrateStill);
    expect('the lead\'s vibration scales with the lead', JSON.stringify(vr.lead) === JSON.stringify([35, 40, 70].map((x) => Math.round(x * 1.5))), vr.lead);
    expect('a scaled pattern stays within 300 ms a pulse', vr.cap.every((x) => x <= 300), vr.cap);

    console.log('Gates');
    const gates = await page.evaluate(() => {
      const { channelsFor } = /** @type {any} */ (window).KCTFeedback.core;
      const env = { vibration: true, sound: 'full', replaySound: false, canVibrate: true, canSound: true, activated: true, hidden: false, instant: false };
      const g = (batch, over) => channelsFor(batch, Object.assign({}, env, over || {}));
      const b = { v: 1, moments: [] };
      return {
        all: g(b), mismatch: g({ v: 2 }), hidden: g(b, { hidden: true }), instant: g(b, { instant: true }), notTapped: g(b, { activated: false }),
        replay: g({ v: 1, replay: true }), replayOn: g({ v: 1, replay: true }, { replaySound: true }), soundOff: g(b, { sound: 'off' }),
        noVibrate: g(b, { canVibrate: false }), vibrationOff: g(b, { vibration: false }),
      };
    });
    const both = (x, v, s) => x.vibrate === v && x.sound === s;
    expect('both channels open by default', both(gates.all, true, true), gates.all);
    expect('a version mismatch is silent', both(gates.mismatch, false, false), gates.mismatch);
    expect('a hidden tab is silent', both(gates.hidden, false, false));
    expect('Instant is silent', both(gates.instant, false, false));
    expect('nothing before the first tap', both(gates.notTapped, false, false));
    expect('the replay viewer: no vibration, no sound without Sound in replays', both(gates.replay, false, false), gates.replay);
    expect('the replay viewer with Sound in replays: sound only', both(gates.replayOn, false, true), gates.replayOn);
    expect('Sound Off: vibration only', both(gates.soundOff, true, false));
    expect('no vibration support: sound only', both(gates.noVibrate, false, true));
    expect('Vibration off: sound only', both(gates.vibrationOff, false, true));

    console.log('Dropping');
    const drops = await page.evaluate(() => {
      const { makeDropper, LATE_MS, GAP_SOUND_MS, MAX_VOICES } = /** @type {any} */ (window).KCTFeedback.core;
      const d = makeDropper(GAP_SOUND_MS), r = [];
      r.push(d.decide({ at: 0, now: 0, rank: 7 }));                        // play
      r.push(d.decide({ at: 10, now: 10, rank: 9 }));                      // too soon, lower rank
      r.push(d.decide({ at: 20, now: 20, rank: 2 }));                      // too soon, higher rank: replace
      r.push(d.decide({ at: 1000, now: 1000 + LATE_MS + 1, rank: 7 }));   // late
      r.push(d.decide({ at: 2000, now: 2000, rank: 7, stale: true }));     // stale
      r.push(d.decide({ at: 3000, now: 3000, rank: 7, ready: false }));    // not ready
      r.push(d.decide({ at: 4000, now: 4000, rank: 7, voices: MAX_VOICES })); // too many sounds
      r.push(d.decide({ at: 4001, now: 4001, rank: 9, noGap: true }));     // a tap ignores the gap
      r.push(d.decide({ at: 5000, now: 5000, rank: 9 }));                  // after the gap: play
      d.reset();
      r.push(d.decide({ at: 5010, now: 5010, rank: 9 }));                  // a reset clears the gap
      return r;
    });
    expect('dropping decisions in order', JSON.stringify(drops) === JSON.stringify(['play', 'tooSoon', 'replace', 'late', 'stale', 'notReady', 'voices', 'play', 'play', 'play']), drops);

    /* ---------- The contract and the Settings rows ---------- */
    console.log('Contract and Settings');
    const ready = await page.evaluate(() => /** @type {any} */ (window).__ready);
    expect('kct:feedback-ready once, with v 1', ready.length === 1 && ready[0].v === 1, ready);
    const rows = await page.evaluate(() => ({
      ids: [...document.querySelectorAll('#setFeedback [id]')].map((e) => e.id),
      classes: [...document.querySelectorAll('#setFeedback .set-row')].length,
      replayHidden: /** @type {HTMLElement} */ (document.getElementById('setFbReplayRow')).hidden,
      sound: /** @type {HTMLSelectElement} */ (document.getElementById('setFbSound')).value,
      keys: Object.keys(localStorage),
    }));
    expect('rows use setFb ids', rows.ids.length >= 3 && rows.ids.every((i) => i.startsWith('setFb')), rows.ids);
    expect('rows use the game\'s set-row markup', rows.classes === 3, rows.classes);
    expect('everything starts Off, with nothing stored', rows.sound === 'off' && rows.replayHidden && rows.keys.length === 0, rows);

    /* The first tap, then the settings through the rows, as a player would. */
    await page.mouse.click(5, 5);
    await page.selectOption('#setFbSound', 'full');
    await page.check('#setFbVibration');
    const after = await page.evaluate(() => ({
      keys: Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])),
      replayHidden: /** @type {HTMLElement} */ (document.getElementById('setFbReplayRow')).hidden,
      contexts: /** @type {any} */ (window).__contexts,
    }));
    expect('the rows write kct.feedback. keys, as JSON', after.keys['kct.feedback.sound'] === '"full"' && after.keys['kct.feedback.vibration'] === 'true' && Object.keys(after.keys).every((k) => k.startsWith('kct.feedback.')), after.keys);
    expect('Sound in replays shows once Sound is on', after.replayHidden === false);
    expect('one playing AudioContext, made after the tap', after.contexts === 1, after.contexts);

    /* ---------- Rendering ---------- */
    console.log('Sounds');
    await page.evaluate(async () => { const t = /** @type {any} */ (window).KCTFeedback.test; t.renderCurrent(); await t.whenRendered(); });
    const rendered = await page.evaluate(() => {
      const t = /** @type {any} */ (window).KCTFeedback.test, P = /** @type {any} */ (window).KCTPalettes;
      return { classic: P.required.filter((n) => t.buffers.get('classic|' + n)).length, total: P.required.length };
    });
    expect('every required preset renders in Classic', rendered.classic === rendered.total, rendered);

    /* ---------- Playing ---------- */
    console.log('Playing');
    const wait = (ms) => page.waitForTimeout(ms);
    const counts = () => page.evaluate(() => ({ v: /** @type {any} */ (window).__vibrations.length, s: /** @type {any} */ (window).__starts.length,
      last: /** @type {any} */ (window).__vibrations.slice(-1)[0] }));
    let c0 = await counts();
    await page.evaluate(() => /** @type {any} */ (window).__send([{ type: 'trickWon', seat: 0, you: true }]));
    let c1 = await counts();
    expect('your trick: vibrates [35] and plays a sound', c1.v === c0.v + 1 && JSON.stringify(c1.last) === '[35]' && c1.s === c0.s + 1, { c0, c1 });
    await wait(200);
    c0 = await counts();
    await page.evaluate(() => /** @type {any} */ (window).__send([{ type: 'trickWon', seat: 1, you: false }]));
    c1 = await counts();
    expect('a bot\'s trick: sound only', c1.v === c0.v && c1.s === c0.s + 1, { c0, c1 });
    await wait(200);
    c0 = await counts();
    await page.evaluate(() => /** @type {any} */ (window).__send([{ type: 'trickWon', you: true }], { replay: true }));
    c1 = await counts();
    expect('the replay viewer: silent with Sound in replays off', c1.v === c0.v && c1.s === c0.s, { c0, c1 });
    await page.check('#setFbReplay');
    await page.evaluate(() => /** @type {any} */ (window).__send([{ type: 'trickWon', you: true }], { replay: true }));
    c1 = await counts();
    expect('the replay viewer with Sound in replays: sound, no vibration', c1.v === c0.v && c1.s === c0.s + 1, { c0, c1 });
    await wait(200);
    c0 = await counts();
    await page.evaluate(() => /** @type {any} */ (window).__send([{ type: 'trickWon', you: true }], { at: performance.now() - 500 }));
    c1 = await counts();
    expect('a late batch is dropped', c1.v === c0.v && c1.s === c0.s, { c0, c1 });
    await page.evaluate(() => /** @type {any} */ (window).__send([{ type: 'trickWon', you: true }], { v: 2 }));
    c1 = await counts();
    expect('a batch with another v is ignored', c1.v === c0.v && c1.s === c0.s, { c0, c1 });
    await page.evaluate(() => /** @type {any} */ (window).__control('speed', { speed: 'instant' }));
    await page.evaluate(() => /** @type {any} */ (window).__send([{ type: 'gameEnded', you: true }]));
    c1 = await counts();
    expect('Instant: nothing plays, and a running pattern stops', c1.s === c0.s && JSON.stringify(c1.last) === '0', { c0, c1 });
    await page.evaluate(() => /** @type {any} */ (window).__control('speed', { speed: 'normal' }));
    await wait(200);
    c0 = await counts();
    await page.evaluate(() => /** @type {any} */ (window).__send([{ type: 'skipPressed', youMediate: true }], { anchor: 'tap' }));
    await page.evaluate(() => /** @type {any} */ (window).__send([{ type: 'showdownScored', youMediate: true, you: false }], { anchor: 'result' }));
    c1 = await counts();
    expect('Skip ▶, then the Showdown result at once: the result replaces the tap', c1.v === c0.v + 2 && JSON.stringify(c1.last) === '[60,40,60]', { c0, c1 });
    await wait(200);

    /* A moment of interest without its own preset plays the ordinary cue's sound, without a SOUND_MISSING line. */
    c0 = await counts();
    const logs0 = await page.evaluate(() => /** @type {any} */ (window).__logs.length);
    await page.evaluate(() => /** @type {any} */ (window).__send([{ type: 'handScored', winner: 0, you: true, outcome: 'NON_NAMER_SWEEP', points: 3,
      scoresBefore: [1, 2, 3], scoresAfter: [4, 2, 3] }], { anchor: 'result' }));
    c1 = await counts();
    const newLogs = await page.evaluate((n) => /** @type {any} */ (window).__logs.slice(n), logs0);
    expect('a steal plays its pattern and the hand-win sound in place of its own, quietly', c1.s === c0.s + 1 && JSON.stringify(c1.last) === '[50,30,50,30,50,30,120]' && newLogs.length === 0, { c0, c1, newLogs });
    await wait(200);

    /* Fall, and its Showdown voice. */
    await page.evaluate(async () => {
      /** @type {any} */ (window).__control('theme', { felt: 'fall' });
      await /** @type {any} */ (window).KCTFeedback.test.whenRendered();
    });
    const fall = await page.evaluate(() => {
      const t = /** @type {any} */ (window).KCTFeedback.test, P = /** @type {any} */ (window).KCTPalettes;
      return { fall: P.required.filter((n) => t.buffers.get('fall|' + n)).length, showdown: P.required.filter((n) => t.buffers.get('fall/sd|' + n)).length,
        total: P.required.length, felt: t.state.felt };
    });
    expect('theme fall: Fall and its Showdown voice render', fall.felt === 'fall' && fall.fall === fall.total && fall.showdown === fall.total, fall);
    await page.evaluate(() => /** @type {any} */ (window).__send([{ type: 'showdownCalled', youPlay: true }], { anchor: 'result' }));
    const sdOn = await page.evaluate(() => /** @type {any} */ (window).KCTFeedback.test.state.showdown);
    await wait(200);
    await page.evaluate(() => /** @type {any} */ (window).__send([{ type: 'showdownScored', you: true }], { anchor: 'result' }));
    const sdOff = await page.evaluate(() => /** @type {any} */ (window).KCTFeedback.test.state.showdown);
    expect('the Showdown voice runs from the call to the result', sdOn === true && sdOff === false, { sdOn, sdOff });

    /* Reset this tab. */
    await page.evaluate(() => /** @type {any} */ (window).__control('reset'));
    const reset = await page.evaluate(() => ({ keys: Object.keys(localStorage), sound: /** @type {HTMLSelectElement} */ (document.getElementById('setFbSound')).value,
      vib: /** @type {HTMLInputElement} */ (document.getElementById('setFbVibration')).checked }));
    expect('reset: every setting Off, the keys removed, the rows updated', reset.keys.length === 0 && reset.sound === 'off' && !reset.vib, reset);

    const logs = await page.evaluate(() => /** @type {any} */ (window).__logs);
    expect('no log messages in normal play', logs.filter((l) => l.kind !== 'RENDER_SLOW').length === 0, logs);
    if (logs.some((l) => l.kind === 'RENDER_SLOW')) console.log('    note: ' + logs.filter((l) => l.kind === 'RENDER_SLOW').length + ' render(s) passed RENDER_BUDGET_MS on this machine');
    expect('no page errors or console warnings', errors.length === 0, errors);
    await ctx.close();

    /* ---------- The game's side: index.html sends batches at screen time ---------- */
    console.log('The game sends moments');
    const g = await browser.newContext({ serviceWorkers: 'block' });
    await g.addInitScript(() => {
      const w = /** @type {any} */ (window);
      w.__batches = [];
      /* With each batch, the cards the table shows face up at that moment: played this hand, or turned up. */
      document.addEventListener('kct:moment', (e) => {
        const st = w.KCT && w.KCT.App.app.state;
        w.__batches.push(Object.assign({ got: performance.now(), faceUp: st ? st.played.concat(st.flippedId ? [st.flippedId] : []) : [] }, /** @type {CustomEvent} */ (e).detail));
      });
    });
    const gp = await g.newPage();
    const gErrors = [];
    gp.on('pageerror', (e) => gErrors.push(String(e)));
    await gp.goto(server.url);
    await gp.waitForFunction(() => /** @type {any} */ (window).KCT && /** @type {any} */ (window).KCT.App.app.ui);
    /* One hand of wave 1 at Fast: the bots play by the game's own timers, and the test plays your seat. */
    const played = await gp.evaluate(async () => {
      const { App, Engine, AI } = /** @type {any} */ (window).KCT, a = App.app;
      const sel = /** @type {HTMLSelectElement} */ (document.getElementById('speedSel'));
      App.newGame(4242, 1);
      sel.value = 'fast'; sel.dispatchEvent(new Event('change'));
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const t0 = performance.now();
      while (performance.now() - t0 < 40000 && !a.state.gameOver && a.state.handNumber <= 1) {
        const st = a.state, ac = Engine.actors(st);
        if (ac.includes(0) && !a.ui.autoplay) App.act(AI.fastAction(st, 0));
        else if (!ac.length && !a.timerFn) { const sys = Engine.systemAction(st); if (sys) App.act(sys); }
        await sleep(30);
      }
      await sleep(1500);
      return { hand: a.state.handNumber, played: a.state.playLog ? a.state.playLog.length : null, flipped: a.state.flippedId };
    });
    const batches = await gp.evaluate(() => /** @type {any} */ (window).__batches);
    const ANCHOR = await gp.evaluate(() => /** @type {any} */ (window).KCT.Moments.ANCHOR);
    const data = batches.filter((b) => !b.control);
    const types = data.flatMap((b) => b.moments.map((m) => m.type));
    expect('the first hand plays through', played.hand >= 2, played);
    expect('every batch has v 1 and its moments their own anchor', data.length > 0 && data.every((b) => b.v === 1 && b.moments.every((m) => ANCHOR[m.type] === b.anchor)),
      data.filter((b) => b.v !== 1 || b.moments.some((m) => ANCHOR[m.type] !== b.anchor)).slice(0, 3));
    expect('a speed control message for Fast', batches.some((b) => b.control === 'speed' && b.speed === 'fast'));
    const count = (t) => types.filter((x) => x === t).length;
    expect('one deal, one flip and one trump call', count('deal') >= 1 && count('flip') >= 1 && count('trumpNamed') >= 1, { deal: count('deal'), flip: count('flip'), trump: count('trumpNamed') });
    expect('21 cards played and 7 tricks won in the hand', count('cardPlayed') === 21 && count('trickWon') === 7, { cards: count('cardPlayed'), tricks: count('trickWon') });
    expect('the hand ends with one result: a hand score or a Showdown call', count('handScored') + count('showdownCalled') === 1, { hand: count('handScored'), sd: count('showdownCalled') });
    /* Screen time: a card is heard after it lands, its trick after the sweep, the result after the last sweep. */
    const at = (pred) => data.findIndex((b) => b.moments.some(pred));
    /* The batch of each main-hand card, in play order: the trick's third card comes before its sweep. */
    const cardBatch = data.flatMap((b, i) => b.moments.filter((m) => m.type === 'cardPlayed' && !m.showdown).map(() => i));
    const late = [];
    for (let n = 1; n <= 7; n++) {
      const sweep = data.findIndex((b) => b.anchor === 'sweep' && b.moments.some((m) => m.type === 'trickWon' && m.trickNumber === n && !m.showdown));
      if (sweep < 0 || !(cardBatch[3 * n - 1] < sweep)) late.push({ trick: n, sweep, third: cardBatch[3 * n - 1] });
    }
    expect('each trick is swept after its third card lands', late.length === 0, late);
    const lastSweep = data.reduce((k, b, i) => (b.anchor === 'sweep' ? i : k), -1);
    const result = at((m) => m.type === 'handScored' || m.type === 'showdownCalled');
    expect('the result comes after the last sweep', result > lastSweep, { lastSweep, result });
    const landGaps = data.filter((b) => b.anchor === 'land' && b.moments.some((m) => m.type === 'cardPlayed')).map((b) => b.got - b.at);
    expect('a card\'s batch is sent once it lands, not before', landGaps.every((d) => d >= -1 && d < 300), landGaps.filter((d) => d < -1 || d >= 300).slice(0, 5));
    const hidden = data.flatMap((b) => b.moments.filter((m) => m.card && !b.faceUp.includes(m.card)).map((m) => m.type + ' ' + m.card));
    expect('every card in a moment is face up on the table when it is sent: nothing hidden', hidden.length === 0, hidden.slice(0, 5));
    /* Instant: nothing more is sent. */
    const instant = await gp.evaluate(async () => {
      const { App, Engine, AI } = /** @type {any} */ (window).KCT, a = App.app, w = /** @type {any} */ (window);
      const sel = /** @type {HTMLSelectElement} */ (document.getElementById('speedSel'));
      sel.value = 'instant'; sel.dispatchEvent(new Event('change'));
      const before = w.__batches.filter((b) => !b.control).length, v0 = a.state.version;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < 400 && !a.state.gameOver && a.state.version < v0 + 40; i++) {
        const st = a.state, ac = Engine.actors(st);
        if (ac.includes(0)) App.act(AI.fastAction(st, 0)); else await sleep(10);
      }
      await sleep(300);
      return { moves: a.state.version - v0, sent: w.__batches.filter((b) => !b.control).length - before };
    });
    expect('at Instant the game sends no batches', instant.moves > 10 && instant.sent === 0, instant);
    /* Phase 3: the game loads the module at idle and shows its card once it is ready. */
    const wired = await gp.evaluate(async () => {
      const w = /** @type {any} */ (window), card = document.getElementById('setFeedback');
      for (let i = 0; i < 100 && (card.hidden || !document.getElementById('setFbSound')); i++) await new Promise((r) => setTimeout(r, 50));
      const ctl = w.__batches.filter((b) => b.control);
      return {
        loaded: !!w.KCTFeedback, cardShown: !card.hidden && !document.getElementById('setFeedbackHead').hidden, rows: !!document.getElementById('setFbSound'),
        theme: ctl.some((b) => b.control === 'theme' && b.felt === w.KCT.App.app.ui.felt), speedAfterReady: ctl.some((b) => b.control === 'speed'),
        resetDesc: document.getElementById('setTableResetDesc').textContent,
      };
    });
    expect('the game loads feedback/feedback.js at idle', wired.loaded, wired);
    expect('the Sound and touch card shows once the module is ready, with its rows', wired.cardShown && wired.rows, wired);
    expect('the game tells the ready module the felt and the speed', wired.theme && wired.speedAfterReady, wired);
    expect('Reset this tab names Sound and touch while the module is loaded', /Sound and touch/.test(wired.resetDesc), wired.resetDesc);
    const keys = await gp.evaluate(async () => {
      const { Backup } = /** @type {any} */ (window).KCT;
      const sel = /** @type {HTMLSelectElement} */ (document.getElementById('setFbSound'));
      sel.value = 'half'; sel.dispatchEvent(new Event('change'));
      const env = Backup.create(localStorage);
      const backedUp = env.data['kct.feedback.sound'] === '"half"';
      Backup.wipe(localStorage);
      const erased = localStorage.getItem('kct.feedback.sound') === null;
      Backup.apply(localStorage, env);
      const restored = localStorage.getItem('kct.feedback.sound') === '"half"';
      return { backedUp, erased, restored };
    });
    expect('a backup carries the module\'s settings, an erase of every kct. key clears them, and a restore brings them back', keys.backedUp && keys.erased && keys.restored, keys);
    /* Reset this tab, through the game: the module's settings go Off. */
    const tabReset = await gp.evaluate(() => { /** @type {any} */ (window).KCT.App.tableReset(); return { sound: localStorage.getItem('kct.feedback.sound'), row: /** @type {HTMLSelectElement} */ (document.getElementById('setFbSound')).value }; });
    expect('Reset this tab turns the module\'s settings Off', tabReset.sound === null && tabReset.row === 'off', tabReset);
    expect('no page errors in the game', gErrors.length === 0, gErrors);
    await g.close();

    /* The game without its module, and with a module that lacks synth.js. */
    console.log('The game without the module');
    for (const which of ['feedback.js', 'synth.js']) {
      const c = await browser.newContext({ serviceWorkers: 'block' });
      await c.route('**/feedback/' + which, (route) => route.fulfill({ status: 404, body: '' }));
      const pg = await c.newPage();
      const errs = [];
      pg.on('pageerror', (e) => errs.push(String(e)));
      /* Playwright's own note about the blocked service worker isn't the game's. */
      pg.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource|Service Worker registration blocked by Playwright/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
      await pg.goto(server.url + '?settings=1');
      await pg.waitForTimeout(2500);
      const r = await pg.evaluate(() => ({
        loaded: !!(/** @type {any} */ (window).KCTFeedback), cardHidden: document.getElementById('setFeedback').hidden && document.getElementById('setFeedbackHead').hidden,
        resetDesc: document.getElementById('setTableResetDesc').textContent,
        logged: /** @type {any} */ (window).KCT.Logger.lines.filter((l) => / FEEDBACK_/.test(l)).map((l) => l.split(' ')[1]),
      }));
      if (which === 'feedback.js') {
        expect('no feedback.js: the card stays hidden and Reset this tab doesn\'t name it', !r.loaded && r.cardHidden && !/Sound and touch/.test(r.resetDesc), r);
      } else {
        expect('no synth.js: the card still shows, and the Event log records FEEDBACK_FILE_MISSING', r.loaded && !r.cardHidden && r.logged.includes('FEEDBACK_FILE_MISSING'), r);
      }
      expect('no page errors or console messages without ' + which, errs.length === 0, errs);
      await c.close();
    }

    /* ---------- Missing files ---------- */
    console.log('Missing files');
    const ctx2 = await browser.newContext({ serviceWorkers: 'block' });
    await ctx2.addInitScript(stubs);
    await ctx2.addInitScript(() => { localStorage.setItem('kct.feedback.sound', '"full"'); });
    await ctx2.route('**/feedback/synth.js', (route) => route.fulfill({ status: 404, body: '' }));
    const p2 = await ctx2.newPage();
    const errors2 = [];
    p2.on('pageerror', (e) => errors2.push(String(e)));
    p2.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource/.test(m.text())) errors2.push(m.type() + ': ' + m.text()); });
    await p2.goto(base + 'tests/page/feedback.html');
    await p2.evaluate(batchSrc);
    await p2.mouse.click(5, 5);
    await p2.waitForFunction(() => /** @type {any} */ (window).__logs.some((l) => l.kind === 'FILE_MISSING'), null, { timeout: 15000 }).catch(() => {});
    await p2.evaluate(() => /** @type {any} */ (window).__send([{ type: 'trickWon', you: true }]));
    const miss = await p2.evaluate(() => ({ logs: /** @type {any} */ (window).__logs, starts: /** @type {any} */ (window).__starts.length,
      rows: !!document.getElementById('setFbSound') }));
    expect('a missing synth.js is logged once as FILE_MISSING', miss.logs.filter((l) => l.kind === 'FILE_MISSING' && l.data.file === 'synth.js').length === 1, miss.logs);
    expect('a missing sound is logged as SOUND_MISSING and plays nothing', miss.starts === 0 && miss.logs.some((l) => l.kind === 'SOUND_MISSING'), miss);
    expect('the rows still work without the synth', miss.rows);
    expect('no page errors or console messages from the module', errors2.length === 0, errors2);
    await ctx2.close();
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failed ? failed + ' check(s) failed.' : 'All feedback checks passed.');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
