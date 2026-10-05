#!/usr/bin/env node
/* UI scenarios, played through the real controls: two full games (Free play and Waves), reload and resume,
   the questions the app asks, the Skip button, the seat-swap log colors, an old save and the Your seat setting.
   Your seat is played by the fast AI, by clicks. Exit code 1 on a failed check. */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

let failed = 0;
function expect(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? '  ✔ ' : '  ✖ ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400)));
}

(async () => {
  const srv = await serve(), browser = await launch();
  const { page, errors } = await openPage(browser, srv.url);
  const step = (src, arg) => run(page, src, arg, ['drive.js']);
  const reload = () => page.reload();
  try {
    console.log('Game 1: Free play');
    let r = await step(`
      const out = { launch: q('#overlay h2') && q('#overlay h2').textContent };
      speed('fast'); click('[data-action="new-free"]'); await sleep(50);
      out.bots = app.ui.personas.slice(1);
      while (!q('#overlay .swap')) await sleep(10);
      click('[data-action="swap-preview"]'); await sleep(20);
      out.colors = Array.from(q('#gameLog li').querySelectorAll('span[class^="p"]')).every(x => app.state.players[Number(x.className.slice(1))].name === x.textContent);
      click('[data-action="swap-done"]');
      out.botsAfter = app.ui.personas.slice(1);
      out.stop = await drive(() => app.state.handNumber >= 2 && KCT.Engine.actors(app.state).includes(0));
      out.version = app.state.version;
      out.log = Array.from(document.querySelectorAll('#gameLog li')).map(li => li.outerHTML);
      return out;`);
    expect('launch menu shows', r.launch === 'King Cut-Throat', r.launch);
    expect('seat swap changes the seats', r.botsAfter[0] === r.bots[1] && r.botsAfter[1] === r.bots[0], r);
    expect('after a swap, each name in the log has its seat color', r.colors);
    expect('play reaches hand 2', r.stop === 'stop', r.stop);
    const mid = r;
    await reload();
    r = await step(`
      const out = { title: q('#overlay h2').textContent, primary: !!q('[data-action="resume-free"].primary') };
      click('[data-action="resume-free"]'); await sleep(50); speed('fast');
      out.version = app.state.version;
      out.log = Array.from(document.querySelectorAll('#gameLog li')).map(li => li.outerHTML);
      click('[data-action="menu"]'); await sleep(20);
      click('[data-action="new-free"]'); await sleep(50);
      out.ask = askOpen() && q('#askTitle').textContent;
      click('[data-action="ask-cancel"]'); await sleep(50);
      out.keptGame = app.mode === 'free' && app.state.version === out.version && !!q('#overlay .menu');
      click('[data-action="close-menu"]'); await sleep(20);
      out.stop = await drive();
      const st = app.state, rep = A.replays.list()[0], run = KCT.Replay.run(rep.code);
      Object.assign(out, { winner: st.winner, scores: st.scores, buttons: Array.from(document.querySelectorAll('#overlay .row button')).map(b => b.textContent),
        slotCleared: !A.slots.get('free'), replayOk: run.ok && run.state.winner === st.winner && JSON.stringify(run.state.scores) === JSON.stringify(st.scores), stats: A.stats.get().modes.free });
      click('[data-action="close-overlay"]'); await sleep(20); click('#modeChip'); await sleep(20);
      out.popup = q('#overlay h2').textContent; click('[data-action="close-overlay"]');
      out.skip = skip;
      return out;`);
    expect('after a reload the menu says Welcome back, Resume is the main button', r.title === 'Welcome back' && r.primary, r);
    expect('the resumed game is at the saved move', r.version === mid.version, [r.version, mid.version]);
    expect('the resumed log is the same', JSON.stringify(r.log.slice(0, mid.log.length)) === JSON.stringify(mid.log) && r.log.length === mid.log.length + 1);
    expect('a new game asks first; Keep it keeps the game', r.ask === 'Start a new Free play game?' && r.keptGame, r);
    expect('the game ends', r.stop === 'game-over', r.stop);
    expect('the end buttons for Free play', JSON.stringify(r.buttons) === JSON.stringify(['View table', 'New Game', 'Replay Seed', 'Menu']), r.buttons);
    expect('the save slot is cleared', r.slotCleared);
    expect('the replay code rebuilds the same end', r.replayOk);
    expect('the result is recorded', r.stats && r.stats.played === 1 && r.stats.won === (r.winner === 0 ? 1 : 0), r.stats);
    expect('the mode chip opens Free play wins', r.popup === 'Free play wins', r.popup);
    expect('Skip never shows outside a bot Showdown', r.skip.shownElsewhere === 0, r.skip);

    console.log('Game 2: Waves, wave 1');
    r = await step(`
      const out = {};
      click('[data-action="menu"]'); await sleep(20);
      q('#waveSel').value = '1'; click('[data-action="play-wave"]'); await sleep(50); speed('fast');
      out.chip = q('#modeChip').textContent; out.swap = !!q('#overlay .swap');
      await drive(() => app.state.phase === P.TRICK_PLAY);
      allowSeatAI(true);
      click('.seat-toggle'); await sleep(50);
      out.ask = askOpen() && q('#askTitle').textContent;
      click('[data-action="ask-cancel"]'); await sleep(50);
      allowSeatAI(false);
      out.kept = !app.ui.autoplay && !app.humanSeatWasAutoplayed;
      out.stop = await drive();
      const st = app.state, won = st.winner === 0, rep = A.replays.list()[0], d = KCT.Replay.decode(rep.code);
      Object.assign(out, { won, note: q('#overlay .wave-note') && q('#overlay .wave-note').textContent, buttons: Array.from(document.querySelectorAll('#overlay .row button')).map(b => b.textContent),
        waves: KCT.Waves.progress(), tries: KCT.Waves.tries(1), replay: KCT.Replay.run(rep.code).ok && d.mode === 'waves' && d.wave === 1, stats: A.stats.get().modes.waves });
      click('[data-action="close-overlay"]'); await sleep(20); click('#modeChip'); await sleep(20);
      out.popup = q('#overlay h2').textContent; click('[data-action="close-overlay"]');
      out.skip = skip;
      return out;`);
    expect('the mode chip shows the wave', r.chip === 'Wave 1 of 18', r.chip);
    expect('Waves has no seat swap', !r.swap);
    expect('handing your seat to the AI asks first; Keep my seat keeps it', r.ask === 'Let the AI play your seat?' && r.kept, r);
    expect('the game ends', r.stop === 'game-over', r.stop);
    if (r.won) {
      expect('a win clears wave 1 and opens wave 2', r.waves.cleared.includes(1) && r.waves.unlocked === 2 && r.tries === 1, r.waves);
      expect('the wave note and buttons for a win', /Wave 1 cleared/.test(r.note) && r.buttons.includes('Next wave'), [r.note, r.buttons]);
    } else {
      expect('a loss counts a try and clears nothing', !r.waves.cleared.length && r.tries === 1, r.waves);
      expect('the wave note and buttons for a loss', /not cleared/.test(r.note) && r.buttons.includes('Try again'), [r.note, r.buttons]);
    }
    expect('the replay code is a Waves game, wave 1', r.replay);
    expect('the result is recorded', r.stats && r.stats.played === 1, r.stats);
    expect('the mode chip opens Wave tries', r.popup === 'Wave tries', r.popup);
    expect('Skip never shows outside a bot Showdown', r.skip.shownElsewhere === 0, r.skip);

    console.log('Skip: a Showdown between the two bots');
    r = await step(`
      const E = KCT.Engine; let found = null;
      for (let seed = 1; seed < 3000 && !found; seed++) {
        const s = E.createGame(seed);
        for (let g = 0; g < 3000 && !s.gameOver; g++) {
          if (s.phase === P.SHOWDOWN_SETUP && s.showdown.mediator === 0) { found = s; break; }
          const ac = E.actors(s); E.dispatch(s, ac.length ? KCT.AI.fastAction(s, ac[0]) : E.systemAction(s));
        }
      }
      localStorage.setItem('kct.slots', JSON.stringify({ free: { format: SAVE_FORMAT, mode: 'free', state: found, personas: [null, 'kit', 'tex'], wave: { n: null }, swapDone: true, log: [['Showdown test.', 'h']] }, waves: null, last: 'free' }));
      return !!found;`);
    expect('a game with you as the Showdown mediator is found', r);
    await reload();
    r = await step(`
      for (const k of Object.keys(skip)) skip[k] = Array.isArray(skip[k]) ? [] : 0;
      click('[data-action="resume-free"]'); await sleep(50); speed('slow');
      click('[data-action="continue"]');
      const t0 = Date.now();
      while (Date.now() - t0 < 20000 && !q('[data-action="skip"]')) await sleep(10);
      const out = { shown: !!q('[data-action="skip"]') };
      const v = app.state.version; click('[data-action="skip"]'); out.atOnce = app.state.version === v + 1;
      out.stop = await drive(() => !(app.state.showdown && app.state.showdown.active), 120000);
      out.skip = skip;
      return out;`);
    expect('Skip shows while the bots play their Showdown', r.shown);
    expect('Skip makes the next move at once', r.atOnce);
    expect('Skip shows at every bot wait in the Showdown, and nowhere else', r.skip.missingInBotSd === 0 && r.skip.shownElsewhere === 0 && r.skip.botSdWaits > 0, r.skip);

    console.log('An old save without its moves');
    await step(`
      const s = KCT.Engine.createGame(5); KCT.Engine.dispatch(s, { type: 'START_GAME' }); KCT.Engine.dispatch(s, { type: 'DEAL' }); delete s.decisions;
      StorageGate.locked = true;
      localStorage.setItem('kct.slots', JSON.stringify({ free: { format: SAVE_FORMAT, mode: 'free', state: s, personas: [null, 'kit', 'tex'], wave: { n: null } }, waves: null, last: 'free' }));`);
    await reload();
    r = await step(`return { note: q('#overlay .wave-note') && q('#overlay .wave-note').textContent, resume: !!q('[data-action="resume-free"]') };`);
    expect('the menu says once that the game could not be loaded', /could not be loaded/.test(r.note || '') && !r.resume, r);
    await reload();
    r = await step(`return !!q('#overlay .wave-note');`);
    expect('the message does not show again', !r);

    console.log('Console: a new game while the launch menu is open');
    await reload();
    r = await step(`
      const menu = app.menuOpen;
      KCT.App.newGame(4242, 1); speed('fast');
      app.ui.autoplay = true;
      const v = app.state.version, t0 = Date.now();
      while (Date.now() - t0 < 15000 && app.state.version < v + 10) await sleep(20);
      const out = { menu, moved: app.state.version - v, menuNow: app.menuOpen };
      app.ui.autoplay = false;
      return out;`);
    expect('KCT.App.newGame from the console plays (the menu state closes)', r.menu && !r.menuNow && r.moved >= 10, r);

    console.log('Your seat: the Human/AI tag works only with the switch on, for one game');
    await reload();
    r = await step(`
      KCT.App.newGame(77, 1); await sleep(20);
      const off = { tag: !!q('.seat-toggle'), label: !!q('#seat0 .tag.you') };
      allowSeatAI(true); await sleep(20);
      click('.seat-toggle'); await sleep(20); if (askOpen()) click('[data-action="ask-ok"]'); await sleep(20);
      const handed = app.ui.autoplay && app.humanSeatWasAutoplayed;
      allowSeatAI(false); await sleep(20);
      const back = { autoplay: app.ui.autoplay, assisted: app.humanSeatWasAutoplayed, tag: !!q('.seat-toggle') };
      allowSeatAI(true); click('.seat-toggle'); await sleep(20);
      KCT.App.newGame(78, 1); await sleep(20);
      const next = { autoplay: app.ui.autoplay, assisted: app.humanSeatWasAutoplayed };
      return { off, handed, back, next };`);
    expect('switch off: the Human tag is a label only', !r.off.tag && r.off.label, r.off);
    expect('switch on: the tag hands your seat to the AI', r.handed, r);
    expect('switch off again: you take your seat back, the game stays assisted', !r.back.autoplay && r.back.assisted && !r.back.tag, r.back);
    expect('the next game starts with you in your seat', !r.next.autoplay && !r.next.assisted, r.next);
    await reload();
    r = await step(`return { on: q('#setSeatAI').checked, saved: /seatAI/.test(localStorage.getItem('kct.settings') || '') };`);
    expect('a reload turns the switch off, and the settings do not keep it', !r.on && !r.saved, r);

    console.log('Your seat: the AI personality comes from the setting or the seed, so a replayed seed gives the same game');
    r = await step(`
      allowSeatAI(true); speed('fast');
      const pick = id => { const s = q('#setSeatPersona'); s.value = id; s.dispatchEvent(new Event('change')); };
      // A free-play game handed to the AI at once, played for up to 120 moves or to its end.
      async function run(seed) {
        KCT.App.newGame(seed);
        click('.seat-toggle');
        const v = app.state.version, t0 = Date.now();
        while (Date.now() - t0 < 60000 && !app.state.gameOver && app.state.version < v + 120) await sleep(20);
        const st = app.state;
        return { seat: app.ui.personas[0], table: app.ui.personas.slice(1), auto: app.ui.autoplay,
          game: JSON.stringify([st.version, st.handNumber, st.scores, st.hands, st.gameOver, st.winner]) };
      }
      pick('');
      const a = await run(31337), b = await run(31337);
      const atTable = a.table[0], free = [...q('#setSeatPersona').options].map(o => o.value).filter(Boolean).find(id => !a.table.includes(id) && id !== a.seat);
      pick(atTable); const c = await run(31337);
      pick(free); const d = await run(31337);
      return { a, b, c, d, free, saved: JSON.parse(localStorage.getItem('kct.settings') || '{}').seatPersona };`);
    expect('From the seed: the AI has your seat, as a personality not at the table', r.a.auto && r.a.seat && !r.a.table.includes(r.a.seat), r.a);
    expect('From the seed: a replayed seed gives the same personality and the same game', r.a.seat === r.b.seat && r.a.game === r.b.game, { a: r.a, b: r.b });
    expect('a chosen personality that sits West or East: the seed picks, as with From the seed', r.c.seat === r.a.seat && r.c.game === r.a.game, r.c);
    expect('a chosen personality that is free: your seat gets it', r.d.seat === r.free, { d: r.d, free: r.free });
    expect('the settings keep the chosen personality', r.saved === r.free, r.saved);
    await reload();
    r = await step(`return { value: q('#setSeatPersona').value, saved: JSON.parse(localStorage.getItem('kct.settings') || '{}').seatPersona };`);
    expect('after a reload, Settings shows the chosen personality', r.value && r.value === r.saved, r);

    console.log('One tab: a newer tab stops the older one');
    r = await step(`
      KCT.App.newGame(777, 1); speed('fast'); app.ui.autoplay = true;
      const v = app.state.version; await sleep(1500);
      return app.state.version - v;`);
    expect('the game plays before a second tab opens', r > 3, r);
    const tab2 = await page.context().newPage();
    tab2.on('pageerror', e => errors.push(String(e)));
    await tab2.goto(srv.url);
    await page.waitForSelector('#staleLayer:not([hidden])', { timeout: 10000 }).catch(() => null);
    r = await step(`
      const v = app.state.version, before = localStorage.getItem('kct.slots');
      await sleep(1500);
      localStore('kct.slots').set('{}');
      return { stale: KCT.TabLock.stale, title: q('#staleTitle') && q('#staleTitle').textContent,
        buttons: Array.from(document.querySelectorAll('#staleLayer button')).map(b => b.getAttribute('data-action')),
        inert: q('#topbar').hasAttribute('inert') && q('.layout').hasAttribute('inert'),
        stopped: app.state.version === v, wrote: localStorage.getItem('kct.slots') !== before };`);
    expect('the older tab shows "Another tab is more current"', r.stale && r.title === 'Another tab is more current', r);
    expect('the pop-up has Update and Quit only', JSON.stringify(r.buttons.sort()) === '["stale-quit","stale-update"]', r.buttons);
    expect('the older tab stops its game and writes nothing', r.inert && r.stopped && !r.wrote, r);
    r = await run(tab2, `return { stale: KCT.TabLock.stale, shown: !document.getElementById('staleLayer').hidden };`);
    expect('the newer tab plays on', !r.stale && !r.shown, r);
    await Promise.all([page.waitForNavigation(), page.click('[data-action="stale-update"]')]);
    await tab2.waitForSelector('#staleLayer:not([hidden])', { timeout: 10000 }).catch(() => null);
    r = await run(tab2, `return KCT.TabLock.stale;`);
    const r2 = await step(`return { stale: KCT.TabLock.stale, shown: !q('#staleLayer').hidden };`);
    expect('Update makes the older tab active, and the other tab stops', r && !r2.stale && !r2.shown, { tab2: r, tab1: r2 });
    await tab2.close();

    expect('no page errors', errors.length === 0, errors);
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? 'FAIL: ' + failed + ' check(s) failed' : 'OK: all checks passed');
  process.exitCode = failed ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
