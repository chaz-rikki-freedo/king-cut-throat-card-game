/* Check: cards layer in play order. For many trick moments across seeds (mid-trick, trick end, Showdown), render the
   v3 layer and sample the pixel where each pair of cards overlaps: the card on top there must be the one played later.
   At a trick's end the winning card is lifted above all. Your empty slot, still to play, sits above every card.
   Run: cd mockups && NODE_PATH=$(npm root -g) PW_CHROMIUM=/opt/pw-browsers/chromium node layering.js */
const { serve, launch, openPage, run } = require('../tests/lib/browser');
const fs = require('fs'), ADV = fs.readFileSync(__dirname + '/' + (process.env.LAYER || 'advanced3.js'), 'utf8');
(async () => {
  const srv = await serve(), browser = await launch(); let fails = 0, checks = 0, moments = 0;
  try {
    const { page } = await openPage(browser, srv.url);
    const view = await browser.newPage(); await view.setViewportSize({ width: 1280, height: 860 });
    for (let seed = 1; seed <= 6; seed++) {
      await run(page, `KCT.App.newGame(${seed}, 1); speed('instant');`, null, ['drive.js']);
      for (let k = 0; k < 14; k++) {
        const r = await run(page, `
          const ok = () => { const s = app.state; return (s.phase === P.TRICK_PLAY || s.phase === P.SHOWDOWN_PLAY) && s.trick.plays.length >= 1
            || s.phase === P.TRICK_DONE || s.phase === P.SHOWDOWN_TRICK_DONE; };
          const why = await drive(ok, 60000); if (why !== 'stop') return { why };
          speed('slow'); await sleep(250);
          const s = app.state, html = '<!doctype html>' + document.documentElement.outerHTML.replace(/<script[\\s\\S]*?<\\/script>/g, '').replace(/ enter"/g, '"');
          const done = /rickDone/.test(s.phase), plays = done ? s.lastTrick.plays : s.trick.plays;
          const out = { why, phase: s.phase, plays: plays.map(p => p.player), winner: done ? s.lastTrick.winner : null, html,
            state: { trump: s.trump, handNumber: s.handNumber, trickNumber: s.trickNumber, trick: s.trick, lastTrick: s.lastTrick, phase: s.phase, myOut: [], sdDiscards: 0 } };
          speed('instant'); const v0 = s.version; await drive(() => app.state.version > v0 + 1, 60000);
          return out;`, null, ['drive.js']);
        if (r.why !== 'stop') break;
        await view.setContent(r.html.replace('<head>', '<head><base href="' + srv.url + '">'));
        const res = await view.evaluate(([src, st, plays, winner]) => {
          window.KCT = { App: { app: { state: st } } }; window.__collapsed = true; new Function(src)();
          const el = p => { const e = document.querySelector('.trick .slot-' + p + ' .card') || document.querySelector('.trick .slot-' + p + ' .empty');
            return e && getComputedStyle(e).visibility !== 'hidden' && e.offsetWidth ? e : null; };
          // Expected stacking: play order; the winner (trick end) on top; an empty slot (still to play) on top.
          const order = plays.slice(); if (winner != null) { order.splice(order.indexOf(winner), 1); order.push(winner); }
          for (const p of [0, 1, 2]) if (!order.includes(p) && el(p)) order.push(p);
          const bad = []; let n = 0;
          for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) {
            const a = el(order[i]), b = el(order[j]); if (!a || !b) continue;
            const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
            const x0 = Math.max(ra.left, rb.left), x1 = Math.min(ra.right, rb.right), y0 = Math.max(ra.top, rb.top), y1 = Math.min(ra.bottom, rb.bottom);
            if (x1 - x0 < 6 || y1 - y0 < 6) continue;
            const pts = [[(x0 + x1) / 2, (y0 + y1) / 2], [x0 + 3, y0 + 3], [x1 - 3, y1 - 3]];
            for (const [x, y] of pts) { const hit = document.elementFromPoint(x, y); const top = hit && hit.closest('.slot');
              if (!top || !(a.closest('.slot') === top || b.closest('.slot') === top)) continue; n++;
              if (top !== b.closest('.slot')) { bad.push('seat ' + order[i] + ' over seat ' + order[j]); break; } }
          }
          return { n, bad };
        }, [ADV, r.state, r.plays, r.winner]);
        moments++; checks += res.n; if (res.bad.length) { fails++; console.log('seed', seed, r.phase, 'plays', r.plays.join('>'), 'winner', r.winner, 'BAD:', res.bad.join('; ')); }
      }
    }
    console.log(moments + ' trick moments, ' + checks + ' overlap samples, ' + fails + ' moments with a wrong layer');
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
