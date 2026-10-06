/* Mockup: plays seed 4242 once and snapshots the first moment of each phase below. Each snapshot is rendered with the
   Advanced layer (advanced.js): desktop with the Latest Scroll open and collapsed, phone with it collapsed:
   phases/<name>-desktop[-collapsed].png, phases/<name>-phone-collapsed.png
   Run: cd mockups && NODE_PATH=$(npm root -g) PW_CHROMIUM=/opt/pw-browsers/chromium node phases.js */
const { serve, launch, openPage, run } = require('../tests/lib/browser');
const fs = require('fs'), path = require('path'), ADV = fs.readFileSync(__dirname + '/advanced.js', 'utf8');
const OUT = path.join(__dirname, 'phases');

/* name → condition, checked in the page (app, P and KCT in scope). First match wins. */
const TARGETS = [
  ['1-discard', `s.phase === P.DISCARD && mine`],
  ['2-exchange', `s.phase === P.EXCHANGE && mine`],
  ['3-trick', `s.phase === P.TRICK_PLAY && mine && s.trick.plays.length === 2`],
  ['4-hand-score', `s.phase === P.HAND_SCORE`],
  ['5-bid1', `s.phase === P.BID1 && mine`],
  ['6-bid2', `s.phase === P.BID2 && mine`],
  ['7-showdown-setup', `s.phase === P.SHOWDOWN_SETUP`],
  ['8-showdown-play', `s.phase === P.SHOWDOWN_PLAY && s.trick && s.trick.plays.length === 1`],
  ['9-showdown-score', `s.phase === P.SHOWDOWN_SCORE`],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(), browser = await launch();
  try {
    const { page } = await openPage(browser, srv.url);
    await page.setViewportSize({ width: 1280, height: 860 });
    await run(page, `KCT.App.newGame(4242, 1); speed('fast'); window.__got = {};`, null, ['drive.js']);
    const snaps = [];
    for (;;) {
      const r = await run(page, `
        const T = ${JSON.stringify(TARGETS)};
        const hit = () => { const s = app.state, mine = KCT.Engine.actors(s).includes(0);
          return T.find(([n, c]) => !window.__got[n] && new Function('s', 'mine', 'P', 'return ' + c)(s, mine, P)); };
        const why = await drive(() => !!hit());
        if (why !== 'stop') return { why };
        const [name] = hit(); window.__got[name] = true;
        speed('slow'); await sleep(350);
        document.querySelectorAll('.toast').forEach(t => t.remove());
        const s = app.state, ac = KCT.Engine.actors(s), names = { 0: 'You', 1: 'Kit', 2: 'Tex' }, w = s.lastTrick && s.lastTrick.winner;
        const html = '<!doctype html>' + document.documentElement.outerHTML.replace(/<script[\\s\\S]*?<\\/script>/g, '').replace(/ enter"/g, '"');
        const vars = { turn: ac.length === 1 ? ac[0] : -1, led: s.trick && s.trick.plays.length ? s.trick.plays[0].player : -1,
          lastWinner: w == null ? '' : '<span style="background:var(--name' + w + ');color:#0b1a12;font-weight:800;border-radius:4px;padding:0 4px">' + names[w] + '</span> won',
          state: { trump: s.trump, handNumber: s.handNumber, trickNumber: s.trickNumber, trick: s.trick, phase: s.phase } };
        speed('fast');
        return { why, name, html, vars };`, null, ['drive.js']);
      if (r.why !== 'stop') { console.log('end:', r.why); break; }
      console.log('snapshot:', r.name);
      snaps.push(r);
    }
    const view = await browser.newPage();
    // A second discard view: both bots have discarded, so the outside pile holds 6.
    const d = snaps.find(x => x.name === '1-discard');
    if (d) snaps.push({ ...d, name: '1b-discard-bots-done', vars: { ...d.vars, outside: 6 } });
    for (const { name, html, vars } of snaps) {
      for (const [w, h, tag] of [[1280, 860, 'desktop'], [390, 844, 'phone']]) {
        for (const collapsed of tag === 'phone' ? [true] : [false, true]) {
          await view.setViewportSize({ width: w, height: h });
          await view.setContent(html.replace('<head>', '<head><base href="' + srv.url + '">'));
          await view.evaluate(([src, v, c]) => {
            window.KCT = { App: { app: { state: v.state } } };
            Object.assign(window, { __turn: v.turn, __led: v.led, __lastWinner: v.lastWinner, __collapsed: c, __outside: v.outside });
            new Function(src)();
          }, [ADV, vars, collapsed]);
          await view.waitForTimeout(150);
          await view.screenshot({ path: path.join(OUT, name + '-' + tag + (collapsed ? '-collapsed' : '') + '.png'), fullPage: tag === 'phone' });
        }
      }
    }
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
