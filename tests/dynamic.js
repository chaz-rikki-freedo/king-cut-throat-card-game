#!/usr/bin/env node
/* Dynamic mode (issue #117), through the real controls. Exit code 1 on a failed check.
   - The fitted hand estimate in index.html matches data/handvalue-fit.json.
   - A Dynamic game from the menu: the seat dialog, the header, a reload and Resume (the easing is worked out again
     from the moves), the end: results, the replay code (mode 3 and its META), the review and the profile, backups.
   - Replay Seed plays the same game from the old game's snapshot, also after the review changed the profile.
   - A game where the AI played your seat adds nothing to the profile.
   Your seat is played by the fast AI, by clicks.
   Usage: node dynamic.js            the checks above (about 1-2 min)
          node dynamic.js rates [games-per-setting=60] [workers=4]
                                     not a check by default: plays bot games and prints how often the fast path
                                     catches a player who throws away their best cards within 3 visible hands, and how
                                     often it fires for players at ladder rows 4, 6 and 8. Exit code 1 when the catch
                                     rate is under 80% or a false-alarm rate is over 3% of 3-hand windows. */
'use strict';
const fs = require('fs'), path = require('path');
const { serve, launch, openPage, run } = require('./lib/browser');

let failed = 0;
function expect(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? '  ✔ ' : '  ✖ ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400)));
}

async function checks() {
  const srv = await serve(), browser = await launch();
  const { page, errors } = await openPage(browser, srv.url, { uiMode: 'flat' });
  const step = (src, arg) => run(page, src, arg, ['drive.js']);
  try {
    console.log('Fitted hand estimate');
    const fit = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'handvalue-fit.json'), 'utf8'));
    let r = await run(page, `
      const R = KCT.Rules, rng = { s: 4711 }, out = { n: 0, worst: 0 };
      for (let k = 0; k < 3000; k++) {
        const hand = KCT.RNG.shuffle(R.ALL_IDS.slice(), rng).slice(0, 7);
        for (const s of R.SUITS) { out.n++; out.worst = Math.max(out.worst, Math.abs(KCT.Dynamic.handEstimate(hand, s) - heValue(arg, hand, s))); }
      }
      return out;`, fit, ['handest.js']);
    expect('Dynamic.handEstimate equals the fitted weights in data/handvalue-fit.json on ' + r.n + ' hands', r.worst < 1e-9, r);

    console.log('A Dynamic game from the menu');
    /* A profile with the gross-mistake mark: the game starts at full easing (the bots at the floor). */
    await page.evaluate(() => localStorage.setItem('kct.profile', JSON.stringify({ v: 1, hands: 40, games: 4, mark: true, share: { me: 3, all: 20 }, calls: { n: 4, failed: 3, value: 8 }, bids: { n: 30, errors: 2 }, discards: { n: 30, loss: 40 }, habits: { calls: 4, made: 1, value: 8 } })));
    await page.reload();
    r = await step(`
      const out = { card: !!q('[data-action="new-dynamic"]'), resumeOff: !!q('[data-action="resume-dynamic"][disabled]') };
      out.profileBefore = A.profile.get();
      speed('instant'); click('[data-action="new-dynamic"]'); await sleep(50);
      out.swap = !!q('#overlay .swap'); out.mode = app.mode; out.chip = q('#modeChip').textContent;
      out.e0 = app.dyn.e; out.snap = app.dyn.snap;
      out.personasLocked = q('#setPersonas').disabled && !q('#setWaveNote').hidden;
      out.stop = await drive(() => app.state.handNumber >= 3 && KCT.Engine.actors(app.state).includes(0));
      out.version = app.state.version; out.e = app.dyn.e; out.hands = app.dyn.hands;
      out.slot = A.slots.get('dynamic'); out.slotSnap = out.slot && out.slot.dynamic; out.slot = !!out.slot;
      /* No bot decision reads the profile: changing it now changes nothing in this game. */
      const cfg = [1, 2].map(p => JSON.stringify(A.botConfig(p).cfg));
      localStorage.setItem('kct.profile', '{"v":1}');
      out.sameCfg = [1, 2].every((p, i) => JSON.stringify(A.botConfig(p).cfg) === cfg[i]);
      out.cfgFromEase = [1, 2].every(p => JSON.stringify(A.botConfig(p).cfg) === JSON.stringify(KCT.Dynamic.ease(KCT.PERSONAS.find(x => x.id === app.ui.personas[p]), app.dyn.e)));
      return out;`);
    expect('the menu has a Dynamic card with New game, and Resume off with no saved game', r.card && r.resumeOff, r);
    expect('Dynamic opens the seat dialog, and the header says Dynamic', r.swap && r.mode === 'dynamic' && r.chip === 'Dynamic', r);
    expect('a marked profile starts the game at full easing, from a snapshot of the profile', r.e0 === 1 && r.snap.mark === true && r.snap.h === 40, [r.e0, r.snap]);
    expect('in Dynamic, the Personalities switch is locked on, with the note', r.personasLocked);
    expect('play reaches hand 3 and saves the game with its snapshot', r.stop === 'stop' && r.slot && JSON.stringify(r.slotSnap) === JSON.stringify(r.snap), r);
    expect('no bot decision reads the profile during a game: both bots follow the game\'s one easing amount', r.sameCfg && r.cfgFromEase && r.e < 1, [r.sameCfg, r.cfgFromEase, r.e]);
    const mid = r;
    await page.reload();
    r = await step(`
      const out = { primary: !!q('[data-action="resume-dynamic"].primary') };
      click('[data-action="resume-dynamic"]'); await sleep(50); speed('instant');
      out.version = app.state.version; out.e = app.dyn.e; out.hands = app.dyn.hands; out.mode = app.mode;
      out.stop = await drive();
      const st = app.state, rep = A.replays.list()[0], rec = KCT.Replay.decode(rep.code), run = KCT.Replay.run(rep.code);
      Object.assign(out, { winner: st.winner, mode: app.mode, buttons: Array.from(document.querySelectorAll('#overlay .row button')).map(b => b.textContent),
        slotCleared: !A.slots.get('dynamic'), stats: A.stats.get().modes.dynamic, recMode: rec.mode, meta: rec.meta, replayOk: run.ok && run.state.winner === st.winner,
        decisions: JSON.stringify(st.decisions), seed: st.seed, eEnd: app.dyn.e });
      await sleep(300);
      out.profile = A.profile.get();
      out.backup = Object.keys(A.backup.create().data).includes('kct.profile');
      click('[data-action="close-overlay"]'); await sleep(20); click('#modeChip'); await sleep(20);
      out.popup = q('#overlay h2').textContent; click('[data-action="close-overlay"]');
      click('[data-action="me-profile"]'); await sleep(20);
      out.profileTab = !!q('[data-action="profile-mode"][data-mode="dynamic"]'); out.habits = (q('#overlay .profile') || { textContent: '' }).textContent.includes('Your bidding');
      click('[data-action="close-overlay"]');
      return out;`);
    expect('after a reload, Resume continues the Dynamic game at the saved move', r.primary && r.mode === 'dynamic' && r.version === mid.version, [r.version, mid.version]);
    expect('the easing worked out again after the reload equals the easing before it', r.e === mid.e && r.hands === mid.hands, [r.e, mid.e]);
    expect('the game ends with Watch, Try again, New deal and Export', r.stop === 'game-over' && JSON.stringify(r.buttons) === '["Watch","Try again","New deal","Export"]', r.buttons);
    expect('the end counts a Dynamic result and clears the slot', r.slotCleared && r.stats && r.stats.played === 1, r.stats);
    expect('the replay code has mode dynamic, replays, and holds the snapshot and the easing in META',
      r.recMode === 'dynamic' && r.replayOk && r.meta['dyn.e0'] === 1000 && r.meta['dyn.ease'] === Math.round(r.eEnd * 1000) && JSON.stringify(JSON.parse(r.meta['dyn.snap'])) === JSON.stringify(mid.snap), r.meta);
    expect('the review added the game to the profile, from the stored profile (the change made during play is kept apart)', r.profile.games === 1 && r.profile.hands > 0 && r.profile.at > 0, r.profile);
    expect('a backup holds kct.profile', r.backup);
    expect('the header button shows Dynamic wins', r.popup === 'Dynamic wins', r.popup);
    expect('Your profile has a Dynamic filter and, with calls on record, Your bidding', r.profileTab && (r.habits || r.profile.habits.calls === 0), r);
    const first = r;

    console.log('Replay Seed');
    r = await step(`
      /* The review changed the profile: a new game would start from another snapshot. Replay Seed keeps the old one. */
      const out = { fresh: JSON.stringify(KCT.Dynamic.snapshotOf(A.profile.get())) };
      /* The game-over box was closed (✕, Back): its buttons again. */
      q('#overlay').innerHTML = '<div class="modal"><div class="row">' + app.ui.endButtons + '</div></div>'; q('#overlay').hidden = false;
      click('[data-action="replay-seed"]'); await sleep(50);
      out.snap = JSON.stringify(app.dyn.snap); out.seed = app.state.seed; out.mode = app.mode;
      out.stop = await drive();
      out.decisions = JSON.stringify(app.state.decisions);
      return out;`);
    expect('Replay Seed starts a Dynamic game with the same seed and the old game\'s snapshot', r.mode === 'dynamic' && r.seed === first.seed && r.snap === JSON.stringify(mid.snap) && r.fresh !== r.snap, r);
    expect('Replay Seed plays the same game, move for move', r.stop === 'game-over' && r.decisions === first.decisions, [r.decisions.length, first.decisions.length]);

    console.log('The AI in your seat');
    r = await step(`
      await sleep(300);
      const before = A.profile.get();
      click('[data-action="close-overlay"]'); await sleep(20);
      click('[data-action="new-deal"]'); await sleep(50);
      allowSeatAI(true); await sleep(20);
      click('[data-action="swap-done"]'); await sleep(20);
      click('.seat-toggle'); await sleep(20); if (askOpen()) click('[data-action="ask-ok"]'); await sleep(20);
      const out = { handed: app.ui.autoplay && app.humanSeatWasAutoplayed };
      out.stop = await drive();
      await sleep(300);
      allowSeatAI(false);
      out.same = JSON.stringify(A.profile.get()) === JSON.stringify(before);
      out.stats = A.stats.get().modes.dynamic;
      return out;`);
    expect('a Dynamic game where the AI played your seat adds nothing to the profile or the results', r.handed && r.stop === 'game-over' && r.same && r.stats.played === 2, r);
    expect('no page errors', errors.length === 0, errors);
  } finally {
    await browser.close(); srv.close();
  }
}

/* The fast path's rates (decision 19), with a player seat against two Casual bots. */
const OFF = { bids: false, turnedCard: false, ownDiscards: false, voids: false, scoreAware: false, showdownPlans: false };
const SETTINGS = [
  { name: 'row 4 (5 hunches, knowledge off)', thinking: { worlds: 5, playoutSkill: 1 }, knowledge: OFF },
  { name: 'row 6 (Novice)', thinking: { worlds: 3, playoutSkill: 0.4 }, knowledge: OFF },
  { name: 'row 8 (floor)', thinking: { worlds: 1, playoutSkill: 0.4 }, knowledge: OFF },
  { name: 'new player (floor, throws best cards)', thinking: { worlds: 1, playoutSkill: 0.4 }, knowledge: OFF, throwsBest: true }
];
const PAGE = `
  const { Engine, AI, Rules: R, buildView, Dynamic: DY } = KCT, P = Engine.P, out = [];
  const casual = AI.personaConfig({ tier: 'casual', courage: 'normal', realTable: false, leadPick: 'fair' });
  for (const job of arg.jobs) {
    const me = job.seat, base = AI.personaConfig({ tier: 'shark', courage: 'normal', realTable: false, leadPick: 'fair' });
    const cfg = AI.config(base, { thinking: job.setting.thinking, knowledge: job.setting.knowledge });
    const s = Engine.createGame(job.seed); Engine.dispatch(s, { type: 'START_GAME' });
    const weak = [];
    for (let g = 0; g < 8000 && !s.gameOver; g++) {
      const ac = Engine.actors(s);
      let a;
      if (ac.length) {
        const p = ac[0], v = buildView(s, p), c = p === me ? cfg : casual;
        if (p === me && job.setting.throwsBest && s.phase === P.DISCARD) {
          const h = s.hands[me], bs = R.SUITS.reduce((x, y) => DY.handEstimate(h, y) > DY.handEstimate(h, x) ? y : x);
          a = { type: 'DISCARD', player: me, cards: h.slice().sort((x, y) => R.getCardStrength(y, bs) - R.getCardStrength(x, bs)).slice(0, Engine.C.INITIAL_DISCARD) };
        } else { a = AI.decide(v, c); if (Engine.validate(s, a)) a = AI.fallbackAction(v, c); }
      } else a = Engine.systemAction(s);
      const res = Engine.dispatch(s, a);
      if (!res.ok) break;
      if (DY.handEnded(res.events, s)) { const r = DY.readHand(buildView(s, (me + 1) % 3), me); if (r.visible) weak.push(r.value < DY.WEAK); }
    }
    out.push({ name: job.setting.name, weak });
  }
  return out;`;
async function rates(games, workers) {
  const jobs = [];
  SETTINGS.forEach(setting => { for (let i = 0; i < games; i++) jobs.push({ setting, seat: i % 3, seed: (117 * 1000003 + i * 7919) >>> 0 }); });
  const srv = await serve(), browser = await launch(), t0 = Date.now();
  const res = (await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const mine = jobs.filter((_, i) => i % workers === k), { page } = await openPage(browser, srv.url), r = [];
    for (let i = 0; i < mine.length; i += 5) r.push(...await run(page, PAGE, { jobs: mine.slice(i, i + 5) }));
    await page.context().close(); return r;
  }))).flat();
  await browser.close(); srv.close();
  const out = SETTINGS.map(({ name, throwsBest }) => {
    const G = res.filter(x => x.name === name);
    let windows = 0, fired = 0, caught = 0, had3 = 0;
    for (const g of G) {
      for (let i = 2; i < g.weak.length; i++) { windows++; if (g.weak.slice(i - 2, i + 1).filter(Boolean).length >= 2) fired++; }
      if (g.weak.length >= 3) { had3++; if (g.weak.slice(0, 3).filter(Boolean).length >= 2) caught++; }
    }
    return { name, games: G.length, throwsBest: !!throwsBest, windowRate: Math.round(1000 * fired / Math.max(1, windows)) / 10, caughtWithin3: had3 ? Math.round(1000 * caught / had3) / 10 : null };
  });
  console.log(JSON.stringify({ gamesPerSetting: games, seconds: Math.round((Date.now() - t0) / 1000), settings: out }, null, 1));
  for (const x of out) {
    if (x.throwsBest) expect('the fast path catches a player who throws away their best cards within 3 visible hands in at least 80% of games', x.caughtWithin3 >= 80, x);
    else expect('the fast path fires on at most 3% of windows for ' + x.name, x.windowRate <= 3, x);
  }
}

(async () => {
  const [mode, g = '60', w = '4'] = process.argv.slice(2);
  if (mode === 'rates') await rates(Number(g), Number(w));
  else await checks();
  console.log(failed ? 'FAILED: ' + failed + ' check(s)' : 'OK');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
