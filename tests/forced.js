#!/usr/bin/env node
/* Forced plays: with the switch on, your only legal card in a trick plays itself; with it off, the game waits for you.
   The switch is in Settings → Bots → Your seat and in the Human tag's popup, and it is kept. Exit code 1 on a failed check. */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

let failed = 0;
function expect(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? '  ✔ ' : '  ✖ ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail)));
}

/* Plays wave 1 at Instant speed until the game ends or `hands` hands are done. You play every move but a forced card;
   a forced card waits up to 1.5 s to play itself. Returns the forced cards seen and how many played themselves. */
const PLAY = `
  const { App, Engine, AI } = KCT, a = App.app, P = Engine.P;
  App.newGame(arg.seed, 1);
  a.ui.speed = 'instant';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let seen = 0, played = 0, waited = 0;
  for (let i = 0; i < 4000 && !a.state.gameOver && a.state.handNumber <= arg.hands; i++) {
    const st = a.state, ac = Engine.actors(st);
    if (ac.includes(0)) {
      const card = App.forcedCard(st);
      if (card) {
        seen++;
        const v = st.version;
        for (let t = 0; t < 75 && a.state.version === v; t++) await sleep(20);
        if (a.state.version !== v && !a.state.hands[0].includes(card)) played++;
        else { waited++; App.act({ type: 'PLAY', player: 0, card }); }
        continue;
      }
      App.act(AI.fastAction(st, 0));
    } else if (!ac.length && !a.timerFn) {
      const sys = Engine.systemAction(st); if (sys) App.act(sys); else await sleep(20);
    } else await sleep(10);
  }
  return { seen, played, waited, hand: a.state.handNumber };
`;

(async () => {
  const srv = await serve(), browser = await launch();
  try {
    /* On: every forced card plays itself. */
    {
      const { page, errors } = await openPage(browser, srv.url, { forced: true });
      const r = await run(page, PLAY, { seed: 4242, hands: 3 });
      expect('on: forced cards came up', r.seen > 0, r);
      expect('on: each forced card played itself', r.seen > 0 && r.played === r.seen && r.waited === 0, r);
      expect('on: no page errors', errors.length === 0, errors);
    }
    /* Off (the default): the game waits for you. */
    {
      const { page, errors } = await openPage(browser, srv.url);
      const r = await run(page, PLAY, { seed: 4242, hands: 2 });
      expect('off: forced cards came up', r.seen > 0, r);
      expect('off: no forced card played itself', r.played === 0 && r.waited === r.seen, r);
      expect('off: no page errors', errors.length === 0, errors);
    }
    /* The Human tag's popup has the switch; it changes the setting, the Settings row and what is kept. */
    {
      const { page, errors } = await openPage(browser, srv.url);
      await page.evaluate(() => KCT.App.newGame(77, 1));
      await page.click('#seat0 .tag.you');
      await page.waitForSelector('#table > .panel #panelForced');
      const before = await page.evaluate(() => ({ on: document.getElementById('panelForced').checked, text: document.querySelector('#table > .panel').textContent }));
      expect('popup: the Human tag\'s popup shows Forced plays, off', !before.on && before.text.includes('Forced plays'), before);
      await page.click('#table > .panel .pswitch');
      const after = await page.evaluate(() => ({ on: KCT.App.app.ui.forced, row: document.getElementById('setForced').checked, kept: JSON.parse(localStorage.getItem('kct.settings')).forced, open: !!document.querySelector('#table > .panel') }));
      expect('popup: the switch turns it on, in Settings too, and it is kept', after.on && after.row && after.kept === true, after);
      expect('popup: stays open after the switch', after.open, after);
      await page.reload();
      const reload = await page.evaluate(() => ({ on: KCT.App.app.ui.forced, row: document.getElementById('setForced').checked }));
      expect('reload: Forced plays is still on', reload.on && reload.row, reload);
      await page.evaluate(() => KCT.App.newGame(77, 1));
      await page.evaluate(() => { const s = /** @type {HTMLInputElement} */ (document.getElementById('setForced')); s.checked = false; s.dispatchEvent(new Event('change')); });
      expect('settings: the row turns it off', await page.evaluate(() => KCT.App.app.ui.forced === false && JSON.parse(localStorage.getItem('kct.settings')).forced === false));
      expect('no page errors', errors.length === 0, errors);
    }
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? 'FAILED: ' + failed : 'OK');
  process.exit(failed ? 1 : 0);
})();
