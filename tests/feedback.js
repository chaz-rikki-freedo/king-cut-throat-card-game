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
      trickYou: 'trickYou', trickBot: 'trickBot', kingOverTrick: 'kingYou', botKing: 'kingBot', gameEndMidTrick: 'gameWin',
      gameLoss: 'gameLoss', wave: 'waveCleared', showdownOverHand: 'showdownCalledYou', showdownWatch: 'showdownCalledOther',
      showdownMediated: 'showdownMediated', showdownLoss: 'showdownLoss', skipMediate: 'skip', skipOther: null, pick: 'pick',
      unknownOnly: null, unknownWithKnown: 'deal', empty: null, junk: null,
    };
    for (const k of Object.keys(want)) expect('cue for ' + k + ' is ' + want[k], cues[k] === want[k], cues[k]);

    const tables = await page.evaluate(() => {
      const { RULES, CUES } = /** @type {any} */ (window).KCTFeedback.core;
      return { missing: RULES.filter((r) => !CUES[r.cue]).map((r) => r.cue), sorted: RULES.every((r, i) => !i || RULES[i - 1].rank <= r.rank),
        vibrating: Object.keys(CUES).filter((k) => CUES[k].vibrate), unused: Object.keys(CUES).filter((k) => !RULES.some((r) => r.cue === k)) };
    });
    expect('every rule names a cue', tables.missing.length === 0, tables.missing);
    expect('the rules are in rank order', tables.sorted);
    expect('every cue has a rule', tables.unused.length === 0, tables.unused);
    expect('only your moments and results vibrate', tables.vibrating.every((k) => !/Bot$|Other$|^hand|^card|^deal|^flip|^discard|^trump/.test(k)), tables.vibrating);

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
    expect('the rows write kct.feedback. keys', after.keys['kct.feedback.sound'] === 'full' && after.keys['kct.feedback.vibration'] === 'on' && Object.keys(after.keys).every((k) => k.startsWith('kct.feedback.')), after.keys);
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
    expect('no page errors in the game', gErrors.length === 0, gErrors);
    await g.close();

    /* ---------- Missing files ---------- */
    console.log('Missing files');
    const ctx2 = await browser.newContext({ serviceWorkers: 'block' });
    await ctx2.addInitScript(stubs);
    await ctx2.addInitScript(() => { localStorage.setItem('kct.feedback.sound', 'full'); });
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
