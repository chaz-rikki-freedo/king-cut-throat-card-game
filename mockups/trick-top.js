/* Check, on the playable build: at every trick end the card played third is on top where it overlaps another card,
   whoever won (layering.js covers mid-trick moments from snapshots). Plays 4 games at Fast.
   Run: NODE_PATH=$(npm root -g) PW_CHROMIUM=/opt/pw-browsers/chromium node mockups/trick-top.js $PWD/mockups/advanced3-play.html */
const { launch, run } = require('../tests/lib/browser');
const FILE = process.argv[2];
(async () => {
  const browser = await launch(); let total = 0, bad = 0, youWonEarly = 0, mid = 0;
  for (const seed of [1, 2, 3, 4]) {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
    await page.goto('file://' + FILE);
    const r = await run(page, `
      KCT.App.newGame(${seed}, 1); speed('fast'); const res = [];
      for (let k = 0; k < 80; k++) {
        const why = await drive(() => /rickDone/.test(app.state.phase) || (/Play/.test(app.state.phase) && app.state.trick.plays.length === 2), 60000); if (why !== 'stop') break;
        if (/rickDone/.test(app.state.phase)) await sleep(400);   // let the slide and the lift finish
        const s = app.state, done = /rickDone/.test(s.phase), plays = (done ? s.lastTrick.plays : s.trick.plays).map(p => p.player), third = plays[plays.length - 1], w = done ? s.lastTrick.winner : null;
        const card = p => document.querySelector('.trick .slot-' + p + ' .card[data-card]');
        let ok = true, n = 0;
        for (const p of plays.slice(0, -1)) { const a = card(p), b = card(third); if (!a || !b) continue;
          const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          const x0 = Math.max(ra.left, rb.left), x1 = Math.min(ra.right, rb.right), y0 = Math.max(ra.top, rb.top), y1 = Math.min(ra.bottom, rb.bottom);
          if (x1 - x0 < 6 || y1 - y0 < 6) continue; n++;
          const hit = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2); if (!hit || hit.closest('.slot') !== b.closest('.slot')) ok = false; }
        res.push({ plays: plays.join('>'), w, n, ok, mid: !done });
        const v0 = s.version; await drive(() => app.state.version > v0, 60000);
      }
      return res;`, null, ['drive.js']);
    for (const x of r) { if (!x.n) continue; total++; if (x.mid) mid++; if (!x.ok) { bad++; console.log('BAD', seed, x); } if (x.w === 0 && x.plays.slice(-1) !== '0') youWonEarly++; }
    await page.context().close();
  }
  console.log({ momentsWithOverlap: total, youWonBeforeThird: youWonEarly, thirdNotOnTop: bad });
  await browser.close();
})();
