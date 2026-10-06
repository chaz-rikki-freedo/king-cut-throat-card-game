/* Mockup: plays to hand 1, trick 2 (seed 4242) and screenshots the table as now and with the Advanced UI profile applied (advanced.js).
   Run: cd mockups && NODE_PATH=$(npm root -g) PW_CHROMIUM=/opt/pw-browsers/chromium node shot.js */
const { serve, launch, openPage, run } = require('../tests/lib/browser');
const fs = require('fs'), ADV = fs.readFileSync(__dirname + '/advanced.js', 'utf8');
(async () => {
  const srv = await serve(), browser = await launch();
  try {
    for (const [w, h, tag] of [[1280, 860, 'desktop'], [390, 844, 'phone']]) {
      const { page, errors } = await openPage(browser, srv.url);
      await page.setViewportSize({ width: w, height: h });
      await run(page, `KCT.App.newGame(4242, 1); speed('fast');
        await drive(() => app.state.phase === P.TRICK_PLAY && app.state.trick && app.state.trick.plays.length >= 1 && app.state.trickNumber >= 2 && KCT.Engine.actors(app.state).includes(0));
        speed('slow'); await sleep(2500);`, null, ['drive.js']);
      await page.screenshot({ path: __dirname + '/before-' + tag + '.png', fullPage: tag === 'phone' });
      await page.evaluate(src => { window.__turn = 0; window.__led = 1; window.__trick = 'Trick 2/7'; window.__lastWinner = '<span class="p1" style="background:var(--name1);color:#0b1a12;font-weight:800;border-radius:4px;padding:0 4px">Kit</span> won';
        window.__turnedHTML = '<div class="card red trump" data-card="10H"><span class="c-tl">10<br>♥</span><span class="c-mid">♥</span><span class="c-br">10<br>♥</span></div>';
        new Function(src)(); }, ADV);
      await page.waitForTimeout(200);
      await page.screenshot({ path: __dirname + '/advanced-' + tag + '.png', fullPage: tag === 'phone' });
      await page.evaluate(() => document.querySelector('.logpanel').classList.add('collapsed'));
      await page.screenshot({ path: __dirname + '/advanced-collapsed-' + tag + '.png', fullPage: tag === 'phone' });
      if (errors.length) console.log(tag, errors);
      await page.context().close();
    }
  } finally { await browser.close(); srv.close(); }
})();
