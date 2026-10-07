/* Mockup: the kitty animated like the discards. The dealer's 3 kitty cards slide out from under the dealer's seat;
   after the call, the turned card slides under the receiver's seat and the other 2 square into the outside pile.
   Stills and a video at Normal speed, desktop and phone.
   Run: cd mockups && NODE_PATH=$(npm root -g) PW_CHROMIUM=/opt/pw-browsers/chromium node kitty-anim.js */
const { serve, launch, openPage, run } = require('../tests/lib/browser');
const fs = require('fs'), path = require('path'), ADV = fs.readFileSync(__dirname + '/advanced3.js', 'utf8');
const OUT = path.join(__dirname, 'kitty'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const srv = await serve(), browser = await launch();
  try {
    const { page } = await openPage(browser, srv.url);
    const r = await run(page, `KCT.App.newGame(4242, 1); speed('fast');
      await drive(() => app.state.phase === P.BID1 && KCT.Engine.actors(app.state).includes(0));
      speed('normal'); await sleep(300); document.querySelectorAll('.toast').forEach(t => t.remove());
      const s = app.state;
      return { dealer: s.dealer, html: '<!doctype html>' + document.documentElement.outerHTML.replace(/<script[\\s\\S]*?<\\/script>/g, '').replace(/ enter"/g, '"'),
        st: { trump: null, handNumber: s.handNumber, trickNumber: 0, trick: null, phase: s.phase, myOut: [], sdDiscards: 0 } };`, null, ['drive.js']);
    const receiver = 1;   // if you accept, the turned card goes left of you: Kit
    for (const [w, h, tag] of [[1280, 860, 'desktop'], [390, 844, 'phone']]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, recordVideo: { dir: OUT, size: { width: w, height: h } } });
      const v = await ctx.newPage();
      await v.setContent(r.html.replace('<head>', '<head><base href="' + srv.url + '">'));
      await v.evaluate(([src, st]) => { window.KCT = { App: { app: { state: st } } }; Object.assign(window, { __collapsed: true }); new Function(src)(); }, [ADV, r.st]);
      const shot = n => v.screenshot({ path: path.join(OUT, n + '-' + tag + '.png'), fullPage: tag === 'phone' });
      await v.waitForTimeout(500);
      await v.evaluate(d => window.__kittyDeal(d), r.dealer);
      await v.waitForTimeout(260); await shot('1-dealing');
      await v.waitForTimeout(900); await shot('2-dealt');
      await v.evaluate(x => window.__kittyTake(x), receiver);
      await v.waitForTimeout(280); await shot('3-taking');
      await v.waitForTimeout(1200); await shot('4-taken');
      await v.waitForTimeout(400);
      const vid = v.video(); await ctx.close();
      fs.renameSync(await vid.path(), path.join(OUT, 'kitty-' + tag + '.webm'));
    }
    console.log('dealer', r.dealer);
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
