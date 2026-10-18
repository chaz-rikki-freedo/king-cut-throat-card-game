#!/usr/bin/env node
/* The replay viewer (docs/ui/plan.md, phase 2), through the real controls: Watch at the end of a game, the step
   controls, the seat change, Exit (the Replay chip) back to the results, the Watch icon in Your profile's Last games, and the ?replay= link.
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
  const { page, errors } = await openPage(browser, srv.url, { uiMode: 'flat' });
  const step = (src, arg) => run(page, src, arg, ['drive.js']);
  try {
    console.log('Watch at the end of a game');
    let r = await step(`
      speed('instant'); KCT.App.newGame(777001);
      const why = await drive();
      const live = { seed: app.state.seed, version: app.state.version, scores: app.state.scores.slice(), winner: app.state.winner };
      const watch = q('#overlay [data-action="replay-watch"]');
      return { why, live, enabled: !!watch && !watch.disabled };
    `);
    expect('the game ends', r.why === 'game-over', r.why);
    expect('Watch is on in the results', r.enabled);
    const live = r.live;

    r = await step(`
      click('#overlay [data-action="replay-watch"]'); await sleep(50);
      /* The viewer's position: the replayed game's step count (one Engine action a step). */
      const pos = () => app.state.version, hand = () => app.state.handNumber + (app.state.phase === P.HAND_START ? 1 : 0) - (app.state.redeals || 0);
      const out = { overlay: overlayOpen(), chip: q('#modeChip').textContent, chipShown: !q('#modeChip').hidden, start: pos(),
        startOff: q('[data-action="watch-prev"]').disabled, count: !!q('.watch-pos'), buttons: [...document.querySelectorAll('.watch-ctl button')].map(b => b.dataset.action), hand: q('#hand button:not([disabled])') ? 'clickable' : 'read-only',
        log: q('#gameLog').textContent.slice(0, 80), seed: app.state.seed, mode: app.mode };
      click('[data-action="watch-fwd"]'); await sleep(20);
      click('[data-action="watch-fwd"]'); await sleep(20);
      out.two = pos();
      click('[data-action="watch-back"]'); await sleep(20);
      out.back = pos();
      /* Next hand: after the next deal, one hand on each time, then the end. */
      out.hands = [hand()];
      click('[data-action="watch-next"]'); await sleep(30); out.hands.push(hand()); out.dealt = q('#hand button') ? 'cards' : 'none';
      click('[data-action="watch-next"]'); await sleep(30); out.hands.push(hand());
      out.atDeal = pos();
      click('[data-action="watch-fwd"]'); click('[data-action="watch-fwd"]'); await sleep(30);
      click('[data-action="watch-prev"]'); await sleep(30); out.prevToStart = pos() === out.atDeal && hand() === out.hands[2];
      click('[data-action="watch-prev"]'); await sleep(30); out.prevAgain = hand() < out.hands[2];
      for (let k = 0; k < 60 && !q('[data-action="watch-next"]').disabled; k++) { click('[data-action="watch-next"]'); await sleep(5); }
      out.endScores = app.state.scores.slice(); out.over = app.state.gameOver; out.endOff = q('[data-action="watch-fwd"]').disabled;
      out.congrats = /Congratulations/.test(q('#gameLog').textContent);
      out.dialog = overlayOpen();
      for (let k = 0; k < 60 && !q('[data-action="watch-prev"]').disabled; k++) { click('[data-action="watch-prev"]'); await sleep(5); }
      out.again = pos() === out.start;
      /* Play: at instant speed, the steps run on their own. */
      click('[data-action="watch-play"]'); await sleep(400);
      out.played = pos() > out.start; out.pauseLabel = q('[data-action="watch-play"]').getAttribute('aria-label');
      click('[data-action="watch-play"]');
      out.saved = KCT.App.slots.get('free');
      return out;
    `);
    expect('the viewer covers the table, not a dialog', !r.overlay, r);
    expect('the mode chip says Replay, with ✕', r.chipShown && r.chip === 'Replay✕', r.chip);
    expect('it opens at the start, with Previous hand dimmed', r.startOff, r);
    expect('five controls, Play in the middle, and no move count', JSON.stringify(r.buttons) === JSON.stringify(['watch-prev', 'watch-back', 'watch-play', 'watch-fwd', 'watch-next']) && !r.count, r.buttons);
    expect('your hand cannot be played', r.hand === 'read-only');
    expect('the log names the replay', /^Replay: Free play, /.test(r.log), r.log);
    expect('the viewer runs no game mode', r.mode === null && r.seed === live.seed, r);
    expect('forward and back step one move', r.two === r.start + 2 && r.back === r.start + 1, [r.start, r.two, r.back]);
    expect('Next hand goes to the next deal, one hand at a time', r.dealt === 'cards' && r.hands[1] === 1 && r.hands[2] === 2, r.hands);
    expect('Previous hand goes to this hand\'s start, then the hand before', r.prevToStart && r.prevAgain, r);
    expect('Next hand in the last hand reaches the recorded result', r.over && JSON.stringify(r.endScores) === JSON.stringify(live.scores) && r.endOff, r);
    expect('the end shows the winner line, and no results dialog', r.congrats && !r.dialog);
    expect('Previous hand reaches the start', r.again);
    expect('Play steps on its own and shows Pause', r.played && r.pauseLabel === 'Pause', r);
    expect('watching saves nothing', r.saved === null, r.saved);

    r = await step(`
      click('#modeChip'); await sleep(50);
      return { dialog: !!q('#overlay .gameover') && overlayOpen(), version: app.state.version, scores: app.state.scores.slice(), mode: app.mode,
        chip: q('#modeChip').textContent, log: /Congratulations/.test(q('#gameLog').textContent) && !/^Replay:/.test(q('#gameLog').textContent) };
    `);
    expect('Exit brings back the results dialog', r.dialog);
    expect('Exit brings back the game and its log', r.version === live.version && JSON.stringify(r.scores) === JSON.stringify(live.scores) && r.mode === 'free' && r.chip === 'Free play' && r.log, r);

    r = await step(`
      click('#overlay [data-action="close-overlay"]');
      click('.actionbar [data-action="replay-watch"]'); await sleep(50);
      const watching = !!q('.watch-ctl');
      click('#modeChip'); await sleep(50);
      return { watching, dialog: overlayOpen(), ends: !!q('.actionbar [data-action="replay-watch"]') };
    `);
    expect('Watch from the action bar returns to the table, not the results', r.watching && !r.dialog && r.ends, r);

    console.log('Your profile: the Watch icon');
    r = await step(`
      click('[data-action="me-profile"]'); await sleep(50);
      const icon = q('#overlay .pf-acts [data-action="replay-watch"]');
      if (!icon) return { icon: false };
      q('#overlay details').open = true;
      icon.click(); await sleep(50);
      const out = { icon: true, watching: !!q('.watch-ctl'), overlay: overlayOpen() };
      /* Escape exits too. */
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(50);
      out.back = !!q('#overlay .profile') && overlayOpen() && !q('.watch-ctl');
      out.open = !!q('#overlay details[open]');
      click('#overlay [data-action="close-overlay"]');
      return out;
    `);
    expect('a Last games row has a Watch icon', r.icon);
    expect('the icon opens the viewer', r.watching && !r.overlay, r);
    expect('Escape returns to Your profile, as it was', r.back && r.open, r);

    console.log('The ?replay= link');
    const code = await page.evaluate(() => KCT.App.replays.list()[0].code);
    await page.goto(srv.url + '?replay=' + encodeURIComponent(code));
    r = await step(`
      await sleep(50);
      const out = { watching: !!q('.watch-ctl'), url: location.search, menu: overlayOpen() };
      click('#modeChip'); await sleep(50);
      out.menuAfter = overlayOpen() && !!q('#overlay .mcard');
      return out;
    `);
    expect('the link opens the viewer', r.watching && !r.menu, r);
    expect('the link is used once', r.url === '', r.url);
    expect('Exit opens the menu', r.menuAfter);
    await page.goto(srv.url + '?replay=KCT3-nope');
    r = await step(`await sleep(50); return { menu: overlayOpen() && !!q('#overlay .mcard'), note: (q('#overlay .wave-note') || {}).textContent || '' };`);
    expect('a code that does not decode opens the menu with a note', r.menu && /replay link/.test(r.note), r);

    console.log('The Advanced UI');
    await page.goto(srv.url + '?replay=' + encodeURIComponent(code));
    r = await step(`
      await sleep(50);
      const s = JSON.parse(localStorage.getItem('kct.settings')); s.uiMode = 'advanced'; localStorage.setItem('kct.settings', JSON.stringify(s));
      return true;
    `);
    await page.goto(srv.url + '?replay=' + encodeURIComponent(code));
    r = await step(`
      await sleep(100);
      const out = { adv: document.body.classList.contains('adv'), ctl: !!q('#center .pile-act .watch-ctl') };
      speed('fast');
      click('[data-action="watch-fwd"]'); await sleep(30); click('[data-action="watch-fwd"]'); await sleep(30); click('[data-action="watch-fwd"]');
      await sleep(1500);
      out.cards = document.querySelectorAll('#hand .card').length;
      for (let k = 0; k < 60 && !q('[data-action="watch-next"]').disabled; k++) { click('[data-action="watch-next"]'); await sleep(5); }
      await sleep(200);
      out.end = app.state.gameOver;
      return out;
    `);
    expect('the controls sit on the table', r.adv && r.ctl, r);
    expect('the deal shows your cards', r.cards > 0, r.cards);
    expect('Next hand reaches the end in the Advanced UI', r.end === true, r.end);

    console.log('Discards: raised first, then sent');
    await page.goto(srv.url + '?replay=' + encodeURIComponent(code));
    r = await step(`
      await sleep(100); speed('instant');
      const raised = () => document.querySelectorAll('#hand .card.selected').length, cards = () => document.querySelectorAll('#hand .card[data-card]').length;
      let k = 0;
      for (; k < 80 && !raised(); k++) { click('[data-action="watch-fwd"]'); await sleep(10); }
      const out = { raised: raised(), cards: cards(), v: app.state.version, phase: app.state.phase };
      click('[data-action="watch-back"]'); await sleep(20);
      out.lowered = raised() === 0 && app.state.version === out.v;
      click('[data-action="watch-fwd"]'); await sleep(20);
      out.again = raised();
      click('[data-action="watch-fwd"]'); await sleep(50);
      out.after = { raised: raised(), cards: cards(), v: app.state.version };
      /* Play holds the raised cards, then sends them. */
      click('[data-action="watch-prev"]'); await sleep(20);
      speed('fast'); click('[data-action="watch-play"]');
      let sawRaised = false;
      for (let i = 0; i < 400 && app.state.handNumber < 3; i++) { if (raised()) sawRaised = true; await sleep(10); }
      click('[data-action="watch-play"]');
      out.sawRaised = sawRaised;
      return out;
    `);
    expect('a discard from the bottom seat first raises its cards, with no move made', [3, 2, 1].includes(r.raised) && r.cards >= r.raised, r);
    expect('Back lowers them, at the same move', r.lowered);
    expect('the next Forward sends them to the pile', r.again === r.raised && r.after.raised === 0 && r.after.cards === r.cards - r.raised && r.after.v === r.v + 1, r);
    expect('Play shows the raised cards before they go', r.sawRaised);

    console.log('Watch from another seat');
    const seatCheck = `
      const name = sel => (q(sel + ' .seat-name') || {}).textContent;
      const read = () => ({ bottom: name('#table .me'), left: name('#table .seat-west'), right: name('#table .seat-east'),
        ids: ['.me', '.seat-west', '.seat-east'].map(c => q('#table ' + c).id), hand: [...document.querySelectorAll('#hand .card[data-card]')].map(c => c.dataset.card).sort().join() });
      const west = app.state.players[1].name, east = app.state.players[2].name;
      const out = { west, east, start: read() };
      click('[data-action="watch-next"]'); await sleep(400);
      out.you = read();
      out.eastHand = app.state.hands[2].slice().sort().join();
      click('#table .seat-east [data-action="watch-seat"]'); await sleep(400);
      out.asEast = read();
      out.playFocus = document.activeElement && document.activeElement.dataset.action;
      /* Moves, with the cards in motion, from East's seat. */
      speed('fast');
      for (let k = 0; k < 12; k++) { click('[data-action="watch-fwd"]'); await sleep(120); }
      out.moved = read();
      click('#table [data-action="watch-seat"][data-seat="1"]'); await sleep(400);
      out.asWest = read();
      out.westHand = app.state.hands[1].slice().sort().join();
      click('#table [data-action="watch-seat"][data-seat="0"]'); await sleep(400);
      out.back = read();
      return out;
    `;
    for (const ui of ['flat', 'advanced']) {
      await page.goto(srv.url);
      await run(page, `const s = JSON.parse(localStorage.getItem('kct.settings')); s.uiMode = '${ui}'; localStorage.setItem('kct.settings', JSON.stringify(s));`, null, []);
      await page.goto(srv.url + '?replay=' + encodeURIComponent(code));
      r = await step('await sleep(100);' + seatCheck);
      expect(ui + ': from your seat, West on the left and East on the right', r.you.bottom === 'You' && r.you.left === r.west && r.you.right === r.east && r.you.ids.join() === 'seat0,seat1,seat2', r.you);
      expect(ui + ': East\'s seat moves to the bottom, you to the left, West to the right', r.asEast.bottom === r.east && r.asEast.left === 'You' && r.asEast.right === r.west && r.asEast.ids.join() === 'seat2,seat0,seat1', r.asEast);
      expect(ui + ': the bottom shows East\'s own hand', r.asEast.hand === r.eastHand && r.asEast.hand !== r.you.hand, [r.asEast.hand, r.eastHand]);
      expect(ui + ': West\'s seat: West at the bottom, East on the left, you on the right', r.asWest.bottom === r.west && r.asWest.left === r.east && r.asWest.right === 'You' && r.asWest.hand === r.westHand, r.asWest);
      expect(ui + ': tapping your seat brings you back', r.back.bottom === 'You' && r.back.ids.join() === 'seat0,seat1,seat2', r.back);
      expect(ui + ': the focus goes to Play after a seat change', r.playFocus === 'watch-play', r.playFocus);
    }
  } catch (e) {
    failed++;
    console.log('  ✖ ' + (e && e.message || e));
  } finally {
    if (errors.length) { failed++; console.log('  ✖ page errors: ' + errors.join(' | ')); }
    await browser.close();
    srv.close();
  }
  console.log(failed ? failed + ' failed' : 'All passed');
  process.exit(failed ? 1 : 0);
})();
