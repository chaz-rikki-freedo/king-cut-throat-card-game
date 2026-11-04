#!/usr/bin/env node
/* Your profile tells the truth about the games kept (kct.replays): the Games list holds every game kept, with its
   count; the chart reads the latest 20; the streak stops where a mode has dropped older games and then reads N+.
   Seeds 60 Waves wins (50 kept, 70 played) and 30 Free play games (all kept). Exit code 1 on a failed check. */
'use strict';
const { serve, launch, openPage } = require('./lib/browser');

let failed = 0;
function expect(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? '  ✔ ' : '  ✖ ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400)));
}

(async () => {
  const srv = await serve(), browser = await launch();
  const { page, errors } = await openPage(browser, srv.url);
  try {
    await page.evaluate(() => {
      const list = [];
      let t = 2e12;
      for (let i = 0; i < 60; i++) list.push({ code: 'KCT3-AA', mode: 'waves', wave: 3, west: 'doc', east: 'vex', winner: 0, scores: [10, 4, 3], at: t-- });
      for (let i = 0; i < 30; i++) list.push({ code: 'KCT3-AA', mode: 'free', west: 'doc', east: 'vex', winner: i ? 1 : 0, scores: [5, 10, 3], at: t-- });
      localStorage.setItem('kct.replays', JSON.stringify(list));
      localStorage.setItem('kct.stats', JSON.stringify({ modes: { waves: { played: 70, won: 60 }, free: { played: 30, won: 1 } }, tables: {}, opponents: {} }));
    });
    await page.reload(); await page.waitForTimeout(500);
    const read = m => page.evaluate(async m => {
      const q = s => document.querySelector(s), wait = () => new Promise(r => setTimeout(r, 60));
      if (!q('#overlay .profile')) { q('[data-action="menu-profile"]').click(); await wait(); }
      q('[data-action="profile-mode"][data-mode="' + m + '"]').click(); await wait();
      const tile = name => { const t = [...document.querySelectorAll('#overlay .pf-tile')].find(x => x.querySelector('span').textContent === name); return t && t.querySelector('b').textContent; };
      return { streak: tile('Streak'), games: q('#overlay .pf-games summary span').textContent, rows: document.querySelectorAll('#overlay .pf-games li').length,
        chart: document.querySelectorAll('#overlay .pf-col').length, stored: JSON.parse(localStorage.getItem('kct.replays')).length };
    }, m);
    console.log('Your profile and the games kept');
    const all = await read('all'), waves = await read('waves'), free = await read('free');
    /* The trim is saved with the next finished game, so a lower !dev saves= deletes nothing until then. */
    expect('each mode keeps its last 50: 50 Waves and 30 Free play games stay; storage is not rewritten on load', all.rows === 80 && all.stored === 90, all);
    expect('All lists every game kept, with its count', all.rows === 80 && all.games === '80 kept, newest first', all);
    expect('a mode lists every game it kept', waves.rows === 50 && waves.games === '50 kept, newest first' && free.rows === 30 && free.games === '30 kept, newest first', [waves, free]);
    expect('the chart reads the latest 20', [all, waves, free].every(x => x.chart === 20), [all.chart, waves.chart, free.chart]);
    expect('a streak that reaches games a mode dropped reads N+, in the mode and under All', waves.streak === '50+ wins' && all.streak === '50+ wins', [waves.streak, all.streak]);
    expect('a streak with nothing dropped reads its number', free.streak === '1 win', free.streak);
    expect('no page errors', !errors.length, errors);
  } finally {
    await browser.close(); srv.close();
  }
  console.log(failed ? 'FAILED: ' + failed : 'OK');
  process.exit(failed ? 1 : 0);
})();
