/* Mockup: a moment where you have won two tricks this hand (seed 4242), Advanced profile applied.
   Run: cd mockups && NODE_PATH=$(npm root -g) PW_CHROMIUM=/opt/pw-browsers/chromium node shot3.js */
const { serve, launch, openPage, run } = require('../tests/lib/browser');
const fs = require('fs'), ADV = fs.readFileSync(__dirname + '/advanced.js', 'utf8');
(async () => {
  const srv = await serve(), browser = await launch();
  try {
    for (const [w, h, tag] of [[1280, 860, 'desktop'], [390, 844, 'phone']]) {
      const { page, errors } = await openPage(browser, srv.url);
      await page.setViewportSize({ width: w, height: h });
      const r = await run(page, `KCT.App.newGame(4242, 1); speed('fast');
        const won = () => [...document.querySelectorAll('.tricks b')].map(b => +b.textContent);
        const why = await drive(() => { const t = app.state.trick; return app.state.phase === P.TRICK_PLAY && t && t.plays.length >= 1 && won()[2] >= 2 && KCT.Engine.actors(app.state).includes(0); });
        speed('slow'); await sleep(2500);
        return { why, won: won(), plays: app.state.trick.plays.map(p => p.player + ':' + p.card) };`, null, ['drive.js']);
      console.log(tag, r);
      await page.evaluate(src => { const st = KCT.App.app.state, w = st.lastTrick && st.lastTrick.winner;
        window.__turn = KCT.Engine.actors(st)[0]; window.__led = st.trick.plays[0].player;
        const names = { 0: 'You', 1: 'Kit', 2: 'Tex' };
        window.__lastWinner = w == null ? '' : '<span style="background:var(--name' + w + ');color:#0b1a12;font-weight:800;border-radius:4px;padding:0 4px">' + names[w] + '</span> won';
        new Function(src)(); }, ADV);
      await page.waitForTimeout(200);
      await page.screenshot({ path: __dirname + '/advanced-youwon-' + tag + '.png', fullPage: tag === 'phone' });
      if (errors.length) console.log(errors);
      await page.context().close();
    }
  } finally { await browser.close(); srv.close(); }
})();
