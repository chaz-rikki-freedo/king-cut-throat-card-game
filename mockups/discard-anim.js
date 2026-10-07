/* Mockup: the discard phase with the layered outside pile. Stills of the pile building (0, 1, 2, 3 players) and a
   video of the animation at Normal speed, desktop and phone.
   Run: cd mockups && NODE_PATH=$(npm root -g) PW_CHROMIUM=/opt/pw-browsers/chromium node discard-anim.js */
const { serve, launch, openPage, run } = require('../tests/lib/browser');
const fs = require('fs'), path = require('path'), ADV = fs.readFileSync(__dirname + '/advanced3.js', 'utf8');
const OUT = path.join(__dirname, 'discard'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const srv = await serve(), browser = await launch();
  try {
    const { page } = await openPage(browser, srv.url);
    const html = await run(page, `KCT.App.newGame(4242, 1); speed('fast');
      await drive(() => app.state.phase === P.DISCARD && KCT.Engine.actors(app.state).includes(0));
      speed('normal'); await sleep(300); document.querySelectorAll('.toast').forEach(t => t.remove());
      return '<!doctype html>' + document.documentElement.outerHTML.replace(/<script[\\s\\S]*?<\\/script>/g, '').replace(/ enter"/g, '"');`, null, ['drive.js']);
    const st = { trump: null, handNumber: 1, trickNumber: 0, trick: null, phase: 'discard', myOut: [], sdDiscards: 0 };
    for (const [w, h, tag] of [[1280, 860, 'desktop'], [390, 844, 'phone']]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, recordVideo: { dir: OUT, size: { width: w, height: h } } });
      const v = await ctx.newPage();
      await v.setContent(html.replace('<head>', '<head><base href="' + srv.url + '">'));
      await v.evaluate(([src, st]) => { window.KCT = { App: { app: { state: st } } }; Object.assign(window, { __outside: 0, __collapsed: true }); new Function(src)(); }, [ADV, st]);
      const cell = n => v.evaluate(n => { const c = [...document.querySelectorAll('.info .cell')].find(x => /Outside/i.test(x.textContent)); if (c) c.querySelector('.val').textContent = String(n); }, n);
      await v.waitForTimeout(600);
      await v.screenshot({ path: path.join(OUT, '0-empty-' + tag + '.png'), fullPage: tag === 'phone' });
      const order = [[1, 'kit'], [2, 'tex'], [0, 'you']];
      for (let i = 0; i < order.length; i++) {
        await v.evaluate(s => window.__addDiscard(s), order[i][0]); await cell((i + 1) * 3);
        if (i === 1) { await v.waitForTimeout(140); await v.screenshot({ path: path.join(OUT, '2-tex-midflight-' + tag + '.png'), fullPage: tag === 'phone' }); }
        await v.waitForTimeout(900);
        await v.screenshot({ path: path.join(OUT, (i + 1) + '-' + order[i][1] + '-' + tag + '.png'), fullPage: tag === 'phone' });
      }
      await v.waitForTimeout(400);
      const vid = v.video(); await ctx.close();
      fs.renameSync(await vid.path(), path.join(OUT, 'discard-' + tag + '.webm'));
    }
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
