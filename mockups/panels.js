/* Mockup (panels.js): the information panels opened on tap, mid-hand. Derived from rare.js; finds the rarer moments across wave 1 seeds and renders them with the v3 layer:
   round 2 bid (turned suit blocked), the 2-card kitty exchange, a Joker turn-up, an abandoned hand, game over.
   Run: cd mockups && NODE_PATH=$(npm root -g) PW_CHROMIUM=/opt/pw-browsers/chromium node rare.js */
const { serve, launch, openPage, run } = require('../tests/lib/browser');
const fs = require('fs'), path = require('path'), ADV = fs.readFileSync(__dirname + '/advanced3.js', 'utf8');
const OUT = path.join(__dirname, 'phases-v3'); fs.mkdirSync(OUT, { recursive: true });
const TARGETS = [['15-panels', `s.phase === P.TRICK_PLAY && mine && s.trickNumber >= 5 && s.voids.some(v => v.length) && s.tricksWon[1] > 0`]];
(async () => {
  const srv = await serve(), browser = await launch();
  try {
    const { page } = await openPage(browser, srv.url);
    const got = {}, snaps = [];
    for (let seed = 1; seed < 80 && Object.keys(got).length < TARGETS.length; seed++) {
      await run(page, `KCT.App.newGame(${seed}, 1); speed('instant');`, null, ['drive.js']);
      for (;;) {
        const r = await run(page, `
          const T = ${JSON.stringify(TARGETS.filter(t => !got[t[0]]))};
          const hit = () => { const s = app.state, mine = KCT.Engine.actors(s).includes(0);
            return T.find(([n, c]) => new Function('s', 'mine', 'P', 'return ' + c)(s, mine, P)); };
          const why = await drive(() => !!hit() || app.state.phase === P.GAME_OVER, 120000);
          const h = hit(); if (!h) return { why };
          speed('slow'); await sleep(300); document.querySelectorAll('.toast').forEach(t => t.remove());
          const s = app.state, ac = KCT.Engine.actors(s);
          const html = '<!doctype html>' + document.documentElement.outerHTML.replace(/<script[\\s\\S]*?<\\/script>/g, '').replace(/ enter"/g, '"');
          speed('instant');
          return { why, name: h[0], html, vars: { turn: ac.length === 1 ? ac[0] : -1, led: -1,
            info: (() => { const R = KCT.Render, v = KCT.buildView(s, 0), sym = { S: '♠', H: '♥', D: '♦', C: '♣' };
            const won = [[], [], []]; const pl = v.playLog || []; (v.trickWinners || []).forEach((w, i) => won[w].push({ n: i + 1, cards: pl.slice(i * 3, i * 3 + 3).map(x => x.card) }));
            return { flippedHTML: s.flippedId ? R.cardHTML(s.flippedId, null) : '', flipped: s.flippedId, flippedBlocked: s.flippedBlocked,
              bids: [0, 1, 2].map(p => v.bidLog.filter(b => b.player === p).map(b => b.round === 1 ? (b.action === 'accept' ? 'accepted' : 'passed') + ' round 1' : (b.action === 'name' ? 'named ' + sym[b.suit] : 'passed') + ' round 2')),
              voids: v.voids.map(x => x.map(c => sym[c] || c)), myOut: v.myOut, won,
              cardHTML: Object.fromEntries([].concat(v.myOut, pl.map(x => x.card)).map(id => [id, R.cardHTML(id, s.trump)])) }; })(), state: { trump: s.trump, handNumber: s.handNumber, trickNumber: s.trickNumber, trick: s.trick, phase: s.phase, myOut: KCT.buildView(s, 0).myOut, sdDiscards: 0 } } };`, null, ['drive.js']);
        if (!r.name) break;
        got[r.name] = true; snaps.push(r); console.log('seed', seed, r.name);
        break;
      }
    }
    const view = await browser.newPage();
    for (const { name, html, vars } of snaps) for (const [w, h, tag] of [[1280, 860, 'desktop'], [390, 844, 'phone']]) {
      await view.setViewportSize({ width: w, height: h });
      await view.setContent(html.replace('<head>', '<head><base href="' + srv.url + '">'));
      await view.evaluate(([src, v]) => { window.KCT = { App: { app: { state: Object.assign({}, v.state, { info: v.info }) } } }; Object.assign(window, { __turn: v.turn, __led: v.led, __collapsed: true }); new Function(src)(); }, [ADV, vars]);
      await view.waitForTimeout(150);
      for (const [k, seat, lab] of [['outside', 0, 'outside'], ['seat', 1, 'seat-kit'], ['tricks', 1, 'tricks-kit']]) {
        await view.evaluate(([k, seat]) => window.__panel(k, seat), [k, seat]); await view.waitForTimeout(80);
        await view.screenshot({ path: path.join(OUT, name + '-' + lab + '-' + tag + '.png'), fullPage: tag === 'phone' }); }
    }
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
