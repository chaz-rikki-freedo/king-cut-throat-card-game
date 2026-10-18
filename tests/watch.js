#!/usr/bin/env node
/* The replay viewer (docs/ui/plan.md, phase 2), through the real controls: Watch at the end of a game, the step
   controls, Exit back to the results, the Watch icon in Your profile's Last games, and the ?replay= link.
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
      const pos = () => q('.watch-pos').textContent;
      const out = { overlay: overlayOpen(), chip: q('#modeChip').textContent, chipShown: !q('#modeChip').hidden, start: pos(),
        startOff: q('[data-action="watch-start"]').disabled, hand: q('#hand button:not([disabled])') ? 'clickable' : 'read-only',
        log: q('#gameLog').textContent.slice(0, 80), seed: app.state.seed, mode: app.mode };
      click('[data-action="watch-fwd"]'); await sleep(20);
      click('[data-action="watch-fwd"]'); await sleep(20);
      out.two = pos();
      click('[data-action="watch-back"]'); await sleep(20);
      out.back = pos();
      click('[data-action="watch-end"]'); await sleep(50);
      out.end = pos();
      out.endScores = app.state.scores.slice(); out.over = app.state.gameOver; out.endOff = q('[data-action="watch-fwd"]').disabled;
      out.congrats = /Congratulations/.test(q('#gameLog').textContent);
      out.dialog = overlayOpen();
      click('[data-action="watch-start"]'); await sleep(50);
      out.again = pos();
      /* Play: at instant speed, the steps run on their own. */
      click('[data-action="watch-play"]'); await sleep(400);
      out.played = pos(); out.pauseLabel = q('[data-action="watch-play"]').getAttribute('aria-label');
      click('[data-action="watch-play"]');
      out.saved = KCT.App.slots.get('free');
      return out;
    `);
    expect('the viewer covers the table, not a dialog', !r.overlay, r);
    expect('the mode chip says Replay', r.chipShown && r.chip === 'Replay', r.chip);
    expect('it opens at the start, with Start dimmed', /^0 \/ \d+$/.test(r.start) && r.startOff, r.start);
    expect('your hand cannot be played', r.hand === 'read-only');
    expect('the log names the replay', /^Replay: Free play, /.test(r.log), r.log);
    expect('the viewer runs no game mode', r.mode === null && r.seed === live.seed, r);
    expect('forward and back step one move', r.two.startsWith('2 /') && r.back.startsWith('1 /'), [r.two, r.back]);
    expect('End reaches the recorded result', r.over && JSON.stringify(r.endScores) === JSON.stringify(live.scores) && r.endOff, r);
    expect('the end shows the winner line, and no results dialog', r.congrats && !r.dialog);
    expect('Start goes back to the start', r.again.startsWith('0 /'), r.again);
    expect('Play steps on its own and shows Pause', !r.played.startsWith('0 /') && r.pauseLabel === 'Pause', r);
    expect('watching saves nothing', r.saved === null, r.saved);

    r = await step(`
      click('[data-action="watch-exit"]'); await sleep(50);
      return { dialog: !!q('#overlay .gameover') && overlayOpen(), version: app.state.version, scores: app.state.scores.slice(), mode: app.mode,
        chip: q('#modeChip').textContent, log: /Congratulations/.test(q('#gameLog').textContent) && !/^Replay:/.test(q('#gameLog').textContent) };
    `);
    expect('Exit brings back the results dialog', r.dialog);
    expect('Exit brings back the game and its log', r.version === live.version && JSON.stringify(r.scores) === JSON.stringify(live.scores) && r.mode === 'free' && r.chip === 'Free play' && r.log, r);

    r = await step(`
      click('#overlay [data-action="close-overlay"]');
      click('.actionbar [data-action="replay-watch"]'); await sleep(50);
      const watching = !!q('.watch-ctl');
      click('[data-action="watch-exit"]'); await sleep(50);
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
      click('[data-action="watch-exit"]'); await sleep(50);
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
      click('[data-action="watch-end"]'); await sleep(200);
      out.end = q('.watch-pos').textContent;
      return out;
    `);
    expect('the controls sit on the table', r.adv && r.ctl, r);
    expect('the deal shows your cards', r.cards > 0, r.cards);
    expect('End works in the Advanced UI', /^(\d+) \/ \1$/.test(r.end), r.end);
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
