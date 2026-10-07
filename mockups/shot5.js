/* Mockup: finds a wave 1 game where you and Kit (West) are in a Showdown, Tex mediates, every player has scored,
   and both you and Kit have won a Showdown trick; captures your turn there with the Advanced layer.
   Run: cd mockups && NODE_PATH=$(npm root -g) PW_CHROMIUM=/opt/pw-browsers/chromium node shot5.js */
const { serve, launch, openPage, run } = require('../tests/lib/browser');
const fs = require('fs'), path = require('path'), ADV = fs.readFileSync(__dirname + '/' + (process.env.LAYER || 'advanced.js'), 'utf8');
(async () => {
  const srv = await serve(), browser = await launch();
  try {
    const { page } = await openPage(browser, srv.url);
    await page.setViewportSize({ width: 1280, height: 860 });
    const r = await run(page, `
      const ok = () => { const s = app.state, sd = s.showdown;
        return !!(sd && sd.active && s.phase === P.SHOWDOWN_PLAY && sd.mediator === 2 && s.scores.every(x => x > 0)
          && sd.tricksWon[0] >= 1 && sd.tricksWon[1] >= 1 && KCT.Engine.actors(s).includes(0)); };
      let seed = 0, why;
      for (seed = 1; seed < 400; seed++) {
        KCT.App.newGame(seed, 1); speed('instant');
        why = await drive(ok, 60000);
        if (why === 'stop') break;
      }
      if (why !== 'stop') return { why, seed };
      speed('slow'); await sleep(400);
      document.querySelectorAll('.toast').forEach(t => t.remove());
      const s = app.state, ac = KCT.Engine.actors(s), names = { 0: 'You', 1: 'Kit', 2: 'Tex' }, w = s.lastTrick && s.lastTrick.winner;
      const html = '<!doctype html>' + document.documentElement.outerHTML.replace(/<script[\\s\\S]*?<\\/script>/g, '').replace(/ enter"/g, '"');
      const vars = { turn: ac.length === 1 ? ac[0] : -1, led: s.trick && s.trick.plays.length ? s.trick.plays[0].player : -1,
        lastWinner: w == null ? '' : names[w] + ' won',
        info: (() => { const R = KCT.Render, v = KCT.buildView(s, 0), sym = { S: '♠', H: '♥', D: '♦', C: '♣' };
            const won = [[], [], []]; const pl = v.playLog || []; (v.trickWinners || []).forEach((w, i) => won[w].push({ n: i + 1, cards: pl.slice(i * 3, i * 3 + 3).map(x => x.card) }));
            return { flippedHTML: s.flippedId ? R.cardHTML(s.flippedId, null) : '', flipped: s.flippedId, flippedBlocked: s.flippedBlocked,
              bids: [0, 1, 2].map(p => v.bidLog.filter(b => b.player === p).map(b => b.round === 1 ? (b.action === 'accept' ? 'accepted' : 'passed') + ' round 1' : (b.action === 'name' ? 'named ' + sym[b.suit] : 'passed') + ' round 2')),
              voids: v.voids.map(x => x.map(c => sym[c] || c)), myOut: v.myOut, won,
              cardHTML: Object.fromEntries([].concat(v.myOut, pl.map(x => x.card)).map(id => [id, R.cardHTML(id, s.trump)])) }; })(), state: { trump: s.trump, handNumber: s.handNumber, trickNumber: s.trickNumber, trick: s.trick, phase: s.phase,
          myOut: KCT.buildView(s, 0).myOut, sdDiscards: s.showdown.discards.length } };
      return { why, seed, html, vars, scores: s.scores, sd: s.showdown.tricksWon };`, null, ['drive.js']);
    console.log('seed', r.seed, r.why, 'scores', r.scores, 'sd tricks', r.sd);
    if (r.why !== 'stop') return;
    const view = await browser.newPage();
    for (const [w, h, tag] of [[1280, 860, 'desktop'], [390, 844, 'phone']]) {
      await view.setViewportSize({ width: w, height: h });
      await view.setContent(r.html.replace('<head>', '<head><base href="' + srv.url + '">'));
      await view.evaluate(([src, v]) => {
        window.KCT = { App: { app: { state: Object.assign({}, v.state, { info: v.info }) } } };
        Object.assign(window, { __turn: v.turn, __led: v.led, __lastWinner: v.lastWinner, __collapsed: true });
        new Function(src)();
      }, [ADV, r.vars]);
      await view.waitForTimeout(150);
      await view.screenshot({ path: path.join(__dirname, process.env.OUT || 'phases', '8b-showdown-you-vs-kit-' + tag + '.png'), fullPage: true });
    }
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
