/* Mockup: a trick where you play second (seed 4242), Advanced profile applied, to check the stacking order.
   Run: cd mockups && NODE_PATH=$(npm root -g) PW_CHROMIUM=/opt/pw-browsers/chromium node shot2.js */
const { serve, launch, openPage, run } = require('../tests/lib/browser');
const fs = require('fs'), ADV = fs.readFileSync(__dirname + '/advanced.js', 'utf8');
(async () => {
  const srv = await serve(), browser = await launch();
  try {
    const { page, errors } = await openPage(browser, srv.url);
    await page.setViewportSize({ width: 1280, height: 860 });
    const r = await run(page, `KCT.App.newGame(4242, 1); speed('fast');
      const why = await drive(() => { const t = app.state.trick; return app.state.phase === P.TRICK_PLAY && t && t.plays.length === 2 && t.plays[1].player === 0; });
      speed('slow'); app.timerFn && clearTimeout(app.timer); await sleep(300);
      return { why, plays: app.state.trick.plays.map(p => p.player + ':' + p.card) };`, null, ['drive.js']);
    console.log(r);
    await page.evaluate(src => { const st0 = KCT.App.app.state; window.__turn = KCT.Engine.actors(st0)[0]; window.__led = st0.trick.plays[0].player; new Function(src)(); }, ADV);
    await page.waitForTimeout(200);
    await page.screenshot({ path: __dirname + '/advanced-second-desktop.png' });
    if (errors.length) console.log(errors);
  } finally { await browser.close(); srv.close(); }
})();
