#!/usr/bin/env node
/* UI scenarios, played through the real controls: the About screen, two full games (Free play and Waves), reload and resume,
   the questions the app asks, the Skip button, the seat-swap log colors, an old save and the Your seat setting.
   Your seat is played by the fast AI, by clicks. Exit code 1 on a failed check. */
'use strict';
const fs = require('fs'), path = require('path');
const { serve, launch, openPage, run, ROOT } = require('./lib/browser');

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
    console.log('The About screen');
    let r = await step(`
      const shown = id => !q('#' + id).hidden;
      const out = { launch: shown('about') && !shown('table') && !shown('info') };
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(20);
      out.idle = shown('about') && !shown('table') && !overlayOpen();
      out.build = q('#aboutBuild').textContent === q('#setBuild').textContent && /^Build /.test(q('#aboutBuild').textContent);
      out.credit = q('#about .about-credit').textContent.replace(/\\s+/g, ' ').trim();
      out.kings = document.querySelectorAll('#aboutKings .about-king').length;
      out.btns = [...document.querySelectorAll('#about .about-btns button')].map(b => [b.textContent, b.getAttribute('data-action'), b.disabled, b.classList.contains('primary')]);
      click('#about [data-action="menu"]'); await sleep(20);
      out.menu = !!q('#overlay .menu') && overlayOpen();
      const view = () => (q('#overlay .menu-card > .mview:not([hidden])') || {}).getAttribute('data-view');
      const go = v => click('#overlay .mview:not([hidden]) [data-action="menu-view"][data-view="' + v + '"]');
      const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const lines = () => [...document.querySelectorAll('#overlay .mview:not([hidden]) .mlist .mname')].map(x => x.textContent);
      out.home = { view: view(), title: q('#menuTitle').textContent, go: q('#overlay .mview:not([hidden]) .mgo').textContent.startsWith('New game'), lines: lines(),
        foot: [...document.querySelectorAll('#overlay .mfoot button')].map(b => b.textContent).filter(t => t !== 'Install'), drift: document.querySelectorAll('#overlay .about-kings .about-king.pip').length,
        build: (q('#overlay .menu-card .about-build') || {}).textContent === q('#setBuild').textContent };
      go('new'); out.newView = { view: view(), lines: lines() };
      go('mode-waves'); out.waves = { view: view(), sel: !!q('#overlay .mview:not([hidden]) #waveSel'), play: !!q('#overlay .mview:not([hidden]) [data-action="play-wave"]') };
      esc(); await sleep(20); out.escBack = view();
      esc(); await sleep(20); out.escHome = view();
      go('rules'); out.rules = { view: view(), rules: document.querySelectorAll('#overlay .mview:not([hidden]) .mrules dt').length, tutorialOff: q('#overlay .mview:not([hidden]) [data-action="tutorial"]').disabled };
      click('#overlay .mview:not([hidden]) .mback'); await sleep(20);
      go('lore'); out.lore = { view: view(), text: /Joker knew the conflict was intentional/.test(q('#overlay .mview:not([hidden]) .mlore').textContent) };
      click('#overlay .mview:not([hidden]) .mback'); await sleep(20);
      click('#overlay .mfoot [data-action="menu-profile"][data-mode="all"]'); await sleep(20);
      out.profile = !!q('#overlay .profile');
      click('#overlay .profile .sheet-top [data-action="menu-back"]'); await sleep(20);
      out.menuAgain = !!q('#overlay .menu') && view() === 'home';
      esc(); await sleep(20);
      out.escape = !overlayOpen() && !q('#about').hidden;
      click('#about [data-action="menu"]'); await sleep(20);
      return out;`);
    expect('at launch the menu opens over the About screen', r.launch, r);
    expect('closing the menu leaves the About screen, not an empty table', r.idle, r);
    expect('the About screen names the build, as Settings does', r.build, r);
    expect('the About screen credits the original design', r.credit === 'Original game design by C.R.F.B. 2009–2011', r.credit);
    expect('kings drift behind the About card', r.kings > 0, r.kings);
    expect('the About card has Tutorial (coming soon) on the left and Play, the main button, on the right',
      JSON.stringify(r.btns) === JSON.stringify([['Tutorial', 'tutorial', true, false], ['Play', 'menu', false, true]]), r.btns);
    expect('Play opens the menu', r.menu, r);
    expect('the menu is the About card: the title, New game (no game yet), How to play and Lore, then the small links and the build',
      r.home.view === 'home' && r.home.title === 'King Cut-Throat' && r.home.go && JSON.stringify(r.home.lines) === '["How to play","Lore"]' &&
      JSON.stringify(r.home.foot) === '["Your profile","Load a code","Settings"]' && r.home.build, r.home);
    expect('suit pips drift with the kings and crowns behind the menu', r.home.drift > 0, r.home.drift);
    expect('New game lists Dynamic, Waves and Free play; Waves has the wave list and Play wave', JSON.stringify(r.newView.lines) === '["Dynamic","Waves","Free play"]' && r.waves.view === 'mode-waves' && r.waves.sel && r.waves.play, r);
    expect('Escape goes back one view, then home', r.escBack === 'new' && r.escHome === 'home', r);
    expect('How to play: the tutorial (coming soon) and the quick rules', r.rules.view === 'rules' && r.rules.rules >= 8 && r.rules.tutorialOff, r.rules);
    expect('Lore tells the story', r.lore.view === 'lore' && r.lore.text, r.lore);
    expect('Your profile opens from the menu, and closes back to it', r.profile && r.menuAgain, r);
    expect('at home, Escape closes the menu (at launch, to the About screen)', r.escape, r);

    console.log('Game 1: Free play');
    r = await step(`
      const out = { launch: q('#overlay h2') && q('#overlay h2').textContent };
      speed('fast'); click('[data-action="new-free"]'); await sleep(50);
      while (!q('#overlay .swap')) await sleep(10);
      click('[data-action="swap-back"]'); await sleep(20);
      out.back = { menu: !!q('#overlay .menu'), mode: app.mode, saved: !!A.slots.get('free') };
      click('[data-action="new-free"]'); await sleep(50);
      while (!q('#overlay .swap')) await sleep(10);
      const first = app.ui.personas.slice(1);
      click('[data-action="swap-new"]'); await sleep(20);
      out.bots = app.ui.personas.slice(1);
      out.newOpponents = !!q('#overlay .swap') && !out.bots.some(x => first.includes(x));
      out.atSwap = { hand: app.state.handNumber, cards: app.state.hands[0].length, dealer: app.state.dealer, status: q('#liveStatus').textContent, about: !q('#about').hidden };
      click('[data-action="swap-preview"]'); await sleep(20);
      out.colors = Array.from(q('#gameLog li').querySelectorAll('span[class^="p"]')).every(x => app.state.players[Number(x.className.slice(1))].name === x.textContent);
      click('[data-action="swap-done"]');
      out.botsAfter = app.ui.personas.slice(1);
      out.stop = await drive(() => app.state.handNumber >= 2 && KCT.Engine.actors(app.state).includes(0));
      out.version = app.state.version;
      out.log = Array.from(document.querySelectorAll('#gameLog li')).map(li => li.outerHTML);
      return out;`);
    expect('launch menu shows', r.launch === 'King Cut-Throat', r.launch);
    expect('Back from the seat dialog opens the menu with no game and nothing saved', r.back.menu && r.back.mode === null && !r.back.saved, r.back);
    expect('New opponents seats two other opponents', r.newOpponents, r);
    expect('the seat dialog shows before the dealer is drawn: no dealer, no cards', r.atSwap.hand === 0 && r.atSwap.cards === 0 && r.atSwap.dealer === null, r.atSwap);
    expect('behind the seat dialog, the table says Choosing seats', r.atSwap.status === 'Choosing seats.' && !r.atSwap.about, r.atSwap);
    expect('seat swap changes the seats', r.botsAfter[0] === r.bots[1] && r.botsAfter[1] === r.bots[0], r);
    expect('after a swap, each name in the log has its seat color', r.colors);
    expect('play reaches hand 2', r.stop === 'stop', r.stop);
    const mid = r;
    await reload();
    r = await step(`
      const out = { go: (q('#overlay .mgo') || {}).getAttribute('data-action'), primary: !!q('[data-action="resume-free"].primary') };
      click('[data-action="resume-free"]'); await sleep(50); speed('fast');
      out.version = app.state.version;
      out.log = Array.from(document.querySelectorAll('#gameLog li')).map(li => li.outerHTML);
      click('[data-action="menu"]'); await sleep(20);
      click('[data-action="new-free"]'); await sleep(50);
      out.ask = askOpen() && q('#askTitle').textContent;
      click('[data-action="ask-cancel"]'); await sleep(50);
      out.keptGame = app.mode === 'free' && app.state.version === out.version && !!q('#overlay .menu');
      out.icons = Array.from(document.querySelectorAll('#overlay .mdel')).map(x => x.getAttribute('data-action'));
      click('[data-action="discard-free"]'); await sleep(50);
      out.discardAsk = askOpen() && q('#askTitle').textContent;
      click('[data-action="ask-cancel"]'); await sleep(50);
      out.discardKept = app.mode === 'free' && app.state.version === out.version && !!A.slots.get('free') && !!q('#overlay .menu');
      click('[data-action="close-menu"]'); await sleep(20);
      out.stop = await drive();
      const st = app.state, rep = A.replays.list()[0], run = KCT.Replay.run(rep.code);
      Object.assign(out, { winner: st.winner, scores: st.scores, buttons: Array.from(document.querySelectorAll('#overlay .row button')).map(b => b.textContent),
        slotCleared: !A.slots.get('free'), replayOk: run.ok && run.state.winner === st.winner && JSON.stringify(run.state.scores) === JSON.stringify(st.scores), stats: A.stats.get().modes.free });
      click('[data-action="close-overlay"]'); await sleep(20); click('#modeChip'); await sleep(20);
      out.popup = q('#overlay h2').textContent; click('[data-action="close-overlay"]');
      out.skip = skip;
      return out;`);
    expect('after a reload the menu\'s Continue resumes the saved game', r.go === 'resume-free' && r.primary, r);
    expect('the resumed game is at the saved move', r.version === mid.version, [r.version, mid.version]);
    expect('the resumed log is the same', JSON.stringify(r.log.slice(0, mid.log.length)) === JSON.stringify(mid.log) && r.log.length === mid.log.length + 1);
    expect('a new game asks first; Keep it keeps the game', r.ask === 'Start a new Free play game?' && r.keptGame, r);
    expect('Discard game shows only on the card with a game', JSON.stringify(r.icons) === JSON.stringify(['discard-free']), r.icons);
    expect('Discard game asks first; Keep it keeps the game', r.discardAsk === 'Discard your Free play game?' && r.discardKept, r);
    expect('the game ends', r.stop === 'game-over', r.stop);
    expect('the end buttons for Free play', JSON.stringify(r.buttons) === JSON.stringify(['Watch', 'Try again', 'New deal', 'Export']), r.buttons);
    expect('the save slot is cleared', r.slotCleared);
    expect('the replay code rebuilds the same end', r.replayOk);
    expect('the result is recorded', r.stats && r.stats.played === 1 && r.stats.won === (r.winner === 0 ? 1 : 0), r.stats);
    expect('the mode chip opens Free play wins', r.popup === 'Free play wins', r.popup);
    expect('Skip never shows outside a bot Showdown', r.skip.shownElsewhere === 0, r.skip);

    console.log('Discard game');
    r = await step(`
      const out = { stats: JSON.stringify(A.stats.get()), replays: A.replays.list().length };
      click('[data-action="menu"]'); await sleep(20);
      click('[data-action="new-free"]'); await sleep(50);
      while (!q('#overlay .swap')) await sleep(10);
      click('[data-action="swap-done"]'); await sleep(50);
      await drive(() => app.state.phase === P.TRICK_PLAY);
      click('[data-action="menu"]'); await sleep(20);
      click('[data-action="discard-free"]'); await sleep(50);
      click('[data-action="ask-ok"]'); await sleep(50);
      const won = A.stats.get().modeOpponents.free || {};
      out.beaten = [q('#overlay .mcard[data-mode="free"] .mtail').textContent, 'Beaten ' + KCT.PERSONAS.filter(x => won[x.id] && won[x.id].won > 0).length + ' of ' + KCT.PERSONAS.length];
      Object.assign(out, { mode: app.mode, slot: !!A.slots.get('free'), menu: !!q('#overlay .menu'), icons: document.querySelectorAll('#overlay .mdel').length,
        resume: q('[data-action="resume-free"]') && q('[data-action="resume-free"]').disabled, statsSame: JSON.stringify(A.stats.get()) === out.stats, replaysSame: A.replays.list().length === out.replays });
      return out;`);
    expect('Discard ends the game: no mode, no slot, the menu stays open', r.mode === null && !r.slot && r.menu, r);
    expect('after Discard the card has no icon and Resume is off', r.icons === 0 && r.resume === true, r);
    expect('a discarded game is not a result', r.statsSame && r.replaysSame, r);
    expect('the Free play card counts the opponents beaten', r.beaten[0] === r.beaten[1], r.beaten);
    r = await step(`
      const out = { order: Array.from(document.querySelectorAll('#overlay .mcard'), c => c.getAttribute('data-mode')), heading: (q('#menuTitle') || {}).textContent,
        menuExits: document.querySelectorAll('#overlay .menu [data-action="close-menu"]').length };
      click('#overlay .mcard[data-mode="free"] .mtail'); await sleep(20);
      out.profile = !!q('#overlay .profile');
      out.pressed = (q('#overlay .pf-filter [aria-pressed="true"]') || {}).textContent;
      out.exits = Array.from(document.querySelectorAll('#overlay .profile button[data-action="menu-back"], #overlay .profile button[data-action="close-overlay"]'), x => x.closest('.sheet-top') ? 'header' : 'body');
      click('#overlay .profile .sheet-top .set-close'); await sleep(20);
      out.back = !!q('#overlay .menu');
      return out;`);
    expect('the menu: the title, then a view each for Dynamic, Waves and Free play', r.heading === 'King Cut-Throat' && JSON.stringify(r.order) === '["dynamic","waves","free"]', r);
    expect('with no game being played, nothing in the menu says Continue to the table (Escape closes it)', r.menuExits === 0, r);
    expect("a card's goal opens Your profile for the mode; its header \u2715 returns to the menu", r.profile && r.pressed === 'Free play' && r.back, r);
    expect('Your profile has one way out, the \u2715 in its header', JSON.stringify(r.exits) === '["header"]', r);

    console.log('Game 2: Waves, wave 1');
    r = await step(`
      const out = {};
      click('[data-action="menu"]'); await sleep(20);
      q('#waveSel').value = '1'; click('[data-action="play-wave"]'); await sleep(50); speed('fast');
      out.chip = q('#modeChip').textContent; out.swap = !!q('#overlay .swap');
      await drive(() => app.state.phase === P.TRICK_PLAY);
      allowSeatAI(true);
      await waitFor('.seat-toggle'); click('.seat-toggle'); await sleep(50);
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
      expect('the wave note and buttons for a win', /Wave 1 cleared/.test(r.note) && JSON.stringify(r.buttons) === JSON.stringify(['Watch', 'Try again', 'New deal', 'Export', 'Next wave']), [r.note, r.buttons]);
    } else {
      expect('a loss counts a try and clears nothing', !r.waves.cleared.length && r.tries === 1, r.waves);
      expect('the wave note and buttons for a loss', /not cleared/.test(r.note) && JSON.stringify(r.buttons) === JSON.stringify(['Watch', 'Try again', 'New deal', 'Export']), [r.note, r.buttons]);
    }
    expect('the replay code is a Waves game, wave 1', r.replay);
    expect('the result is recorded', r.stats && r.stats.played === 1, r.stats);
    expect('the mode chip opens Wave tries', r.popup === 'Wave tries', r.popup);
    expect('Skip never shows outside a bot Showdown', r.skip.shownElsewhere === 0, r.skip);

    console.log('Seat settings: West and East apply in Free play; a wave seats its bots as themselves');
    r = await step(`
      const out = {}, set = (id, v) => { const s = q(id); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); };
      set('#seat1-courage', 'bold');
      click('[data-action="menu"]'); await sleep(20);
      click('[data-action="new-free"]'); await sleep(50);
      while (!q('#overlay .swap')) await sleep(10);
      click('[data-action="swap-done"]'); await sleep(50);
      await drive(() => app.state.phase === P.TRICK_PLAY, 20000);
      out.free = [JSON.stringify(app.ui.tunes[1]), A.botConfig(1).cfg.style.courage];
      click('[data-action="menu"]'); await sleep(20);
      q('#waveSel').value = '1'; click('[data-action="play-wave"]'); await sleep(50);
      if (askOpen()) { click('[data-action="ask-ok"]'); await sleep(50); }
      const own = KCT.PERSONAS.find(x => x.id === app.ui.personas[1]);
      out.wave = [app.ui.tunes[1], q('#setWaveNote').hidden, JSON.stringify(A.botConfig(1).cfg) === JSON.stringify(KCT.AI.personaConfig(own))];
      await drive(() => app.state.phase === P.TRICK_PLAY, 20000);
      click('[data-action="menu"]'); await sleep(20);
      click('[data-action="discard-waves"]'); await sleep(50); click('[data-action="ask-ok"]'); await sleep(50);
      click('[data-action="resume-free"]'); await sleep(50);
      out.after = JSON.stringify(app.ui.tunes[1]);
      out.saved = JSON.parse(localStorage.getItem('kct.settings') || '{}').seats[1];
      set('#seat1-courage', '');
      click('[data-action="menu"]'); await sleep(20);
      click('[data-action="discard-free"]'); await sleep(50); click('[data-action="ask-ok"]'); await sleep(50);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(20);
      return out;`);
    expect('Free play: West plays with its seat\'s change', JSON.stringify(r.free) === JSON.stringify(['{"courage":"bold"}', 'bold']), r.free);
    expect('in a wave the bots play their personalities, and the Bots tab says so', JSON.stringify(r.wave) === '[null,false,true]', r.wave);
    expect('back in Free play the game keeps its tune, and the settings keep it', r.after === '{"courage":"bold"}' && r.saved && r.saved.tune && r.saved.tune.courage === 'bold', r);

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
    r = await step(`return { note: q('#overlay .wave-note') && q('#overlay .wave-note').textContent, resume: !!q('[data-action="resume-free"]:not([disabled])') };`);
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

    console.log('Settings: Enter and Space work on the focused tab, and do not move the game');
    await step(`KCT.App.newGame(4343); speed('slow');
      while (!q('#overlay .swap')) await sleep(10);
      click('[data-action="swap-done"]');
      click('[data-action="toggle-settings"]'); await sleep(20);`);
    const keys = [];
    for (const [id, key] of [['setTabBots', 'Enter'], ['setTabTools', ' ']]) {
      await page.focus('#' + id);
      /* A spy in place of the game timer: a skip calls it, and no real move can happen meanwhile. */
      await step(`clearTimeout(app.timer); app.timer = 1; window.__skipped = false; app.timerFn = () => { window.__skipped = true; };`);
      await page.keyboard.press(key === ' ' ? 'Space' : key);
      await page.waitForTimeout(50);
      keys.push(await step(`return { open: q('#${id}').getAttribute('aria-selected') === 'true', moved: window.__skipped };`));
    }
    expect('Enter and Space on a Settings tab open that tab', keys.every(k => k.open), keys);
    expect('a key in Settings does not continue or skip the game', keys.every(k => !k.moved), keys);
    await step(`click('[data-action="toggle-settings"]');`);

    console.log('Console: every KCT command in the README and docs exists, and the bot setters move the panel');
    const docText = ['README.md', ...fs.readdirSync(path.join(ROOT, 'docs')).filter(f => f.endsWith('.md')).map(f => 'docs/' + f)]
      .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
    const refs = [...new Set(docText.match(/KCT(?:\.[A-Za-z_]+)+/g) || [])];
    /* A path counts once it reaches a property that is there but empty now: KCT.App.app.dyn is null outside a
       Dynamic game, so KCT.App.app.dyn.e cannot be followed here. */
    r = await step(`return arg.filter(ref => { let o = window; for (const k of ref.split('.')) { if (o == null) return false; if (!(k in Object(o))) return true; o = o[k]; } return false; });`, refs);
    expect('every KCT command named in the docs exists (' + refs.length + ')', refs.length > 20 && r.length === 0, r);
    r = await step(`
      const keep = JSON.parse(JSON.stringify(app.seats[2]));
      A.setSeat(2, { who: 'mei', tune: { courage: 'bold', worlds: 5 } });
      const shown = [q('#seat2-who').value, q('#seat2-courage').value, q('#seat2-worlds').value, q('#setSeatSum2').textContent];
      A.setSeat(2, keep);
      return { shown, back: JSON.stringify(app.seats[2]) === JSON.stringify(keep) };`);
    expect('KCT.App.setSeat moves the seat controls', JSON.stringify(r.shown) === JSON.stringify(['mei', 'bold', '5', 'Mei · 2 changes']) && r.back, r);

    console.log('Backup: the Settings tab is kept as JSON, so a backup works after Settings has opened');
    r = await step(`
      const out = { tab: localStorage.getItem('kct.setTab') };
      try { out.size = A.backup.toJSON().length; } catch (e) { out.err = e.message; }
      /* The plain name that older builds kept. */
      StorageGate.locked = true; localStorage.setItem('kct.setTab', 'Bots');
      return out;`);
    expect('the tab is kept as JSON and a backup works', r.tab === '"Tools"' && r.size > 0, r);
    await reload();
    r = await step(`
      const out = { tab: localStorage.getItem('kct.setTab') };
      try { out.size = A.backup.toJSON().length; } catch (e) { out.err = e.message; }
      click('[data-action="toggle-settings"]'); await sleep(20);
      out.open = q('#setTabBots').getAttribute('aria-selected') === 'true';
      click('[data-action="toggle-settings"]');
      return out;`);
    expect('a plain tab name from an older build is rewritten as JSON at load, and still opens its tab', r.tab === '"Bots"' && r.size > 0 && r.open, r);

    console.log('Links: ?wave= asks before it replaces a begun game, and is used once');
    r = await step(`
      const E = KCT.Engine, s = E.createGame(9090);
      while (!s.gameOver && s.handNumber < 2) { const ac = E.actors(s); E.dispatch(s, ac.length ? KCT.AI.fastAction(s, ac[0]) : E.systemAction(s)); }
      const w = KCT.Waves.get(1);
      StorageGate.locked = true;
      localStorage.setItem('kct.slots', JSON.stringify({ waves: { format: SAVE_FORMAT, mode: 'waves', state: s, personas: [null, w.west, w.east], wave: { n: 1, open: true }, swapDone: true, log: [['Link test.', 'h']] }, free: null, last: 'waves' }));
      return s.version;`);
    const savedVersion = r;
    await page.goto(srv.url + '?wave=1');
    r = await step(`
      while (!askOpen()) await sleep(10);
      const out = { title: q('#askTitle').textContent, search: location.search };
      click('[data-action="ask-cancel"]'); await sleep(50);
      const sl = A.slots.get('waves');
      out.kept = !!sl && sl.state.version === arg; out.menu = !!q('#overlay .menu'); out.mode = app.mode;
      return out;`, savedVersion);
    expect('a ?wave= link asks before it replaces a begun Waves game', r.title === 'Start a new Waves game?', r);
    expect('Keep it keeps the saved game and opens the menu', r.kept && r.menu && r.mode === null, r);
    expect('the link is removed from the address', r.search === '', r);
    await reload();
    r = await step(`await sleep(50); return { ask: askOpen(), menu: !!q('#overlay .menu') };`);
    expect('a reload after a link opens the menu and does not ask again', !r.ask && r.menu, r);
    await page.goto(srv.url + '?wave=1');
    r = await step(`
      while (!askOpen()) await sleep(10);
      click('[data-action="ask-ok"]'); await sleep(50);
      return { mode: app.mode, wave: app.wave.n, hand: app.state.handNumber };`);
    expect('Start new game starts the linked wave', r.mode === 'waves' && r.wave === 1 && r.hand <= 1, r);
    /* 4294967297 is 2^32 + 1: it used to wrap around to seed 1. */
    for (const bad of ['?seed=4294967297', '?seed=12abc', '?wave=99']) {
      await page.goto(srv.url + bad);
      r = await step(`await sleep(50); const n = q('#overlay .wave-note');
        return { note: n && n.textContent, menu: !!q('#overlay .menu'), mode: app.mode, ask: askOpen(), search: location.search };`);
      expect('a link that names no game (' + bad + ') opens the menu with a note, and starts nothing', /does not name a game/.test(r.note || '') && r.menu && r.mode === null && !r.ask && r.search === '', r);
    }
    await page.goto(srv.url + '?seed=4294967295');
    r = await step(`
      const t0 = Date.now();
      while (!q('#overlay .swap') && Date.now() - t0 < 10000) { if (askOpen()) click('[data-action="ask-ok"]'); await sleep(10); }
      return { seed: app.state.seed, mode: app.mode };`);
    expect('the largest seed, 4294967295, still starts its game', r.seed === 4294967295 && r.mode === 'free', r);

    console.log('Results: a reset clears the counts and the last games together');
    r = await step(`
      const before = { played: Object.values(A.stats.get().modes).reduce((a, m) => a + m.played, 0), games: A.replays.list().length };
      A.stats.reset();
      return { before, played: Object.keys(A.stats.get().modes).length, games: A.replays.list().length };`);
    expect('a reset leaves no results and no last games', r.before.played > 0 && r.before.games > 0 && r.played === 0 && r.games === 0, r);

    console.log('AI errors: a bot that fails falls back to a legal move, and the game goes on');
    r = await step(`
      KCT.App.newGame(5151); speed('fast');
      while (!q('#overlay .swap')) await sleep(10);
      click('[data-action="swap-done"]'); app.ui.autoplay = true;
      /* Broken bot settings: reading West's and East's tune throws, so the planner and the fallback move both fail. */
      const keep = app.ui.tunes, bad = new Proxy({}, { get: (o, k) => { if (k === 'courage') throw new Error('broken settings'); } });
      app.ui.tunes = [null, bad, bad];
      const v = app.state.version, t0 = Date.now();
      while (Date.now() - t0 < 40000 && !app.state.gameOver && app.state.handNumber < 2) await sleep(20);
      const out = { moved: app.state.version - v, hand: app.state.handNumber, audit: KCT.Engine.audit(app.state) };
      app.ui.tunes = keep; app.ui.autoplay = false;
      return out;`);
    expect('the game plays on past AI errors, with legal moves', r.hand >= 2 && r.audit.length === 0, r);

    console.log('Page errors: an uncaught error is logged, and the player is told once');
    r = await step(`
      /* From an inline script, as the game's own code would throw: an error from elsewhere (an extension) is ignored. */
      const boom = () => { const el = document.createElement('script'); el.textContent = "setTimeout(() => { throw new Error('scenario page error'); });"; document.body.appendChild(el); el.remove(); };
      boom(); await sleep(50);
      const out = { ask: askOpen(), title: q('#askTitle') && q('#askTitle').textContent };
      click('[data-action="ask-cancel"]'); await sleep(20);
      boom(); await sleep(50);
      out.again = askOpen();
      out.logged = KCT.Logger.lines.filter(l => l.includes('PAGE_ERROR')).length;
      return out;`);
    errors.splice(0, errors.length, ...errors.filter(e => !e.includes('scenario page error')));
    expect('an uncaught error asks the player to reload', r.ask && r.title === 'Something went wrong', r);
    expect('a second error is logged but does not ask again', !r.again && r.logged === 2, r);

    console.log('Your seat: the Human/AI tag works only with the switch on, for one game');
    await reload();
    r = await step(`
      KCT.App.newGame(77, 1); await sleep(20);
      const off = { tag: !!q('.seat-toggle'), label: !!q('#seat0 .tag.you') };
      allowSeatAI(true); await sleep(20);
      await waitFor('.seat-toggle'); click('.seat-toggle'); await sleep(20); if (askOpen()) click('[data-action="ask-ok"]'); await sleep(20);
      const handed = app.ui.autoplay && app.humanSeatWasAutoplayed;
      allowSeatAI(false); await sleep(20);
      const back = { autoplay: app.ui.autoplay, assisted: app.humanSeatWasAutoplayed, tag: !!q('.seat-toggle') };
      allowSeatAI(true); await waitFor('.seat-toggle'); click('.seat-toggle'); await sleep(20);
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
      const pick = id => { const s = q('#seat0-who'); s.value = id; s.dispatchEvent(new Event('change', { bubbles: true })); };
      // A free-play game handed to the AI at once, played for up to 120 moves or to its end.
      async function run(seed) {
        KCT.App.newGame(seed);
        await waitFor('.seat-toggle'); click('.seat-toggle');
        const v = app.state.version, t0 = Date.now();
        while (Date.now() - t0 < 60000 && !app.state.gameOver && app.state.version < v + 120) await sleep(20);
        const st = app.state;
        return { seat: app.ui.personas[0], table: app.ui.personas.slice(1), auto: app.ui.autoplay,
          /* The same game: the same first decisions. The loop checks every 20 ms, so a fast game can stop a move or two
             later; the state there is not a fair test. */
          game: JSON.stringify(st.decisions.slice(0, 50)), moves: st.decisions.length };
      }
      pick('');
      const a = await run(31337), b = await run(31337);
      const atTable = a.table[0], free = [...q('#seat0-who').options].map(o => o.value).filter(Boolean).find(id => !a.table.includes(id) && id !== a.seat);
      pick(atTable); const c = await run(31337);
      pick(free); const d = await run(31337);
      return { a, b, c, d, free, saved: JSON.parse(localStorage.getItem('kct.settings') || '{}').seats[0].who };`);
    expect('From the seed: the AI has your seat, as a personality not at the table', r.a.auto && r.a.seat && !r.a.table.includes(r.a.seat), r.a);
    expect('From the seed: a replayed seed gives the same personality and the same game', r.a.moves >= 50 && r.a.seat === r.b.seat && r.a.game === r.b.game, { a: r.a, b: r.b });
    expect('a chosen personality that sits West or East: the seed picks, as with From the seed', r.c.seat === r.a.seat && r.c.game === r.a.game, r.c);
    expect('a chosen personality that is free: your seat gets it', r.d.seat === r.free, { d: r.d, free: r.free });
    expect('the settings keep the chosen personality', r.saved === r.free, r.saved);
    await reload();
    r = await step(`return { value: q('#seat0-who').value, saved: JSON.parse(localStorage.getItem('kct.settings') || '{}').seats[0].who };`);
    expect('after a reload, Settings shows the chosen personality', r.value && r.value === r.saved, r);

    console.log('In your Showdown, the Outside cell shows the discards as mini cards');
    r = await step(`
      const want = () => { const sd = app.state.showdown; return !!sd && sd.active && sd.participants.includes(0) && !sd.pendingDiscard[0] && app.state.phase === P.SHOWDOWN_PLAY; };
      /* Instant: no motion, so the search is quick. */
      speed('instant');
      for (let seed = 1; seed < 40 && !want(); seed++) { KCT.App.newGame(seed); await drive(() => want() || app.state.gameOver, 60000); }
      const out = { found: want() };
      if (out.found) {
        app.timerFn = null; await sleep(400);
        const val = q('#info .out .val');
        out.minis = val ? val.querySelectorAll('.micro, .mc').length : -1;
        out.mine = val && val.querySelector('.micro') ? val.querySelector('.micro').getAttribute('aria-label') || val.querySelector('.micro [aria-label]').getAttribute('aria-label') : null;
        out.count = !!q('#info .val[data-count]');
      }
      return out;`);
    expect('the Outside cell keeps the mini cards (not the rank as a count)', r.found && r.minis === 2 && !!r.mine && !r.count, r);

    console.log('The Shark run: hidden until wave 18 is cleared, then the same tables with both bots at Shark');
    r = await step(`
      const out = {}, options = () => Array.from(document.querySelectorAll('#waveSel option')).map(o => o.textContent);
      A.showMenu(); await sleep(20);
      out.before = options().some(t => /Shark/.test(t));
      for (let n = 1; n <= 18; n++) KCT.Waves.record(n, true);
      A.showMenu(); await sleep(20);
      out.after = options().filter(t => /^Shark/.test(t)); out.tail = q('[data-action="play-wave"]').textContent;
      /* From a Wave 18 game: the list starts on wave 18 (Resume's game); picking Shark 1 makes Play table the main button. */
      speed('fast'); KCT.App.newGame(undefined, 18); await sleep(50);
      A.showMenu(); await sleep(20);
      out.listStart = q('#waveSel').value;
      const sel = q('#waveSel'); sel.value = '19'; sel.dispatchEvent(new Event('change', { bubbles: true })); await sleep(20);
      out.mainButtons = Array.from(document.querySelectorAll('.mcard[data-mode="waves"] .btn.primary')).map(b => b.textContent);
      click('[data-action="play-wave"]'); await sleep(50);
      if (askOpen()) { click('[data-action="ask-ok"]'); await sleep(50); }
      out.chip = q('#modeChip').textContent;
      out.seats = app.ui.personas.slice(1);
      out.tiers = [1, 2].map(p => KCT.AI.skillTierOf(A.botConfig(p).cfg));
      out.style = A.botConfig(2).cfg.style.courage;
      click('#modeChip'); await sleep(20); out.popup = q('#overlay h2').textContent; click('[data-action="close-overlay"]');
      click('[data-action="me-profile"]'); await sleep(20); click('[data-action="profile-mode"][data-mode="waves"]'); await sleep(20);
      out.profile = Array.from(document.querySelectorAll('#overlay h3')).map(h => h.textContent).filter(t => /tries/.test(t));
      out.sharkRows = document.querySelectorAll('#overlay .pf-tries')[0].querySelectorAll('tr').length - 1;
      click('[data-action="close-overlay"]');
      return out;`);
    expect('the menu shows no Shark table before wave 18 is cleared', r.before === false, r);
    expect('clearing wave 18 lists Shark 1 in the menu', JSON.stringify(r.after) === JSON.stringify(['Shark 1 · Kit / Tex']) && r.tail === 'Play table', r);
    expect('Shark 1 seats wave 1\'s bots at Shark, keeping their courage', r.chip === 'Shark 1 of 18' && JSON.stringify(r.seats) === '["kit","tex"]' && JSON.stringify(r.tiers) === '["shark","shark"]' && r.style === 'bold', r);
    expect('during a Wave 18 game, the list starts on wave 18; picking Shark 1 makes Play table the main button', r.listStart === '18' && JSON.stringify(r.mainButtons) === '["Play table"]', r);
    expect('the mode chip opens Shark tries', r.popup === 'Shark tries', r.popup);
    expect('Your profile, Waves: Shark tries, then Wave tries', JSON.stringify(r.profile) === '["Shark tries","Wave tries"]' && r.sharkRows === 1, r);

    console.log('The play area explains itself on your move');
    r = await step(`
      const title = () => q('#table > .panel .ptitle') && q('#table > .panel .ptitle').textContent;
      const mine = () => KCT.Engine.actors(app.state).includes(0);
      speed('fast');
      KCT.App.newGame(4242);
      const out = {};
      out.discard = await drive(() => app.state.phase === P.DISCARD && mine());
      out.kitty = !!q('#center .kpile[data-action="adv-info"]') && !!q('#center .outpile[data-action="adv-info"]');
      click('#center .kpile'); out.kittyTitle = title();
      click('#center .outpile'); out.outsideTitle = title();
      const first = q('#hand button[data-card]').getAttribute('data-card');
      click('#hand button[data-card="' + first + '"]');
      out.picked = !q('#center [data-action="adv-info"]');
      click('#hand button[data-card="' + first + '"]');
      out.unpicked = !!q('#center .kpile[data-action="adv-info"]');
      out.play = await drive(() => app.state.phase === P.TRICK_PLAY && mine() && app.state.trick.plays.length > 0 && app.state.hands[0].some(id => !KCT.Rules.canPlayCard(id, app.state.hands[0], KCT.Rules.getLeadSuit(app.state.trick.plays, app.state.trump), app.state.trump)));
      if (out.play === 'stop') {
        const v = app.state.version, bad = q('#hand button[data-card][aria-disabled="true"]');
        bad.click(); out.illegalTitle = title(); out.illegalKept = app.state.version === v && app.state.hands[0].includes(bad.getAttribute('data-card'));
        click('#center .slot-0'); out.slotTitle = title();
        out.slots = document.querySelectorAll('#center .slot[data-action="adv-info"]').length;
        click('#hand button[data-card]:not([aria-disabled])');
        /* Your card flies first; the table is redrawn when it lands. A click on the old table opens nothing. */
        const slots = () => document.querySelectorAll('#center .slot[data-action="adv-info"]').length;
        const stale = q('#center .slot[data-action="adv-info"]');
        if (stale) { stale.click(); out.staleTitle = title(); }
        const t0 = Date.now(); while (slots() && Date.now() - t0 < 5000) await sleep(20);
        out.afterPlay = slots();
      }
      return out;`);
    expect('your discard: the kitty and the outside pile open what they are', r.discard === 'stop' && r.kitty && /^Kitty/.test(r.kittyTitle) && /^Outside pile/.test(r.outsideTitle), r);
    expect('a picked card turns the explanations off; unpicking it turns them on', r.picked && r.unpicked, r);
    expect('your play: an unplayable card says why and stays in your hand', r.play === 'stop' && /^You can.t play/.test(r.illegalTitle) && r.illegalKept, r);
    expect('your play: the trick slots open what they are', /^Trick \d+ of 7$/.test(r.slotTitle) && r.slots === 3, r);
    expect('after you play, the trick slots only show', r.afterPlay === 0 && !r.staleTitle, r);

    console.log('One tab: a newer tab stops the older one');
    r = await step(`
      KCT.App.newGame(777, 1); speed('fast'); app.ui.autoplay = true;
      /* The table's motion paces the moves: wait until a few have been made. */
      const v = app.state.version, t0 = Date.now();
      while (app.state.version - v <= 3 && Date.now() - t0 < 6000) await sleep(50);
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
