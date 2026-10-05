#!/usr/bin/env node
/* UI soak: W pages, each plays G full games through the app at Instant speed. Each game takes a random mode
   (Free play or the highest open wave), and sometimes the AI plays your seat. Reloads at random points, then resume.
   Checks: the resume is exact, every game ends, the replay code rebuilds the end, results and waves
   change only for games you played, the Skip rule, no page errors.
   Usage: node soak.js [workers=4] [games=5]. Exit code 1 on a failure. */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

async function worker(browser, url, w, games) {
  const { page, errors } = await openPage(browser, url);
  const step = (src, arg) => run(page, src, arg, ['drive.js']);
  const out = { games: 0, waves: 0, free: 0, assisted: 0, reloads: 0, resumes: 0, youWon: 0, fails: [] };
  let seed = (w + 1) * 9973;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let g = 0; g < games; g++) {
    const mode = rnd() < 0.5 ? 'waves' : 'free', assist = rnd() < 0.4;
    const start = await step(`
      if (askOpen()) click('[data-action="ask-cancel"]');
      A.showMenu(false); await sleep(10);
      sessionStorage.setItem('soak.before', JSON.stringify({ stats: JSON.stringify(A.stats.get()), waves: JSON.stringify(KCT.Waves.progress()) }));
      if (arg.mode === 'waves') { q('#waveSel').value = String(KCT.Waves.progress().unlocked); click('[data-action="play-wave"]'); }
      else click('[data-action="new-free"]');
      await sleep(20);
      if (askOpen()) click('[data-action="ask-ok"]');
      await sleep(20);
      speed('instant');
      if (arg.assist) { if (q('#overlay .swap')) click('[data-action="swap-done"]'); click('.seat-toggle'); await sleep(20); if (askOpen()) click('[data-action="ask-ok"]'); }
      return { mode: app.mode, autoplay: app.ui.autoplay };`, { mode, assist });
    if (start.mode !== mode || start.autoplay !== assist) out.fails.push({ g, start, mode, assist });
    for (let leg = 0; leg < 40; leg++) {
      const n = rnd() < 0.35 ? 30 + Math.floor(rnd() * 300) : 0;
      const res = await step(`const v0 = app.state.version; return await drive(arg.n ? () => app.state.version >= v0 + arg.n : null, 600000);`, { n });
      if (res === 'game-over') break;
      if (res !== 'stop') { out.fails.push({ g, stopped: res, phase: await step('return [app.state.phase, app.mode, app.menuOpen, q("#overlay").hidden ? "" : q("#overlay").textContent.slice(0, 120), askOpen() && q("#askTitle").textContent];') }); break; }
      await page.reload(); out.reloads++;
      const rs = await step(`
        const raw = JSON.parse(localStorage.getItem('kct.slots'))[arg.mode];
        const ok = A.resumeGame(arg.mode); await sleep(20); speed('instant');
        const strip = x => JSON.stringify(Object.assign({}, x, { players: 0 }));
        return { ok, same: ok && strip(app.state) === strip(raw.state), log: document.querySelectorAll('#gameLog li').length === raw.log.length + 1, autoplay: app.ui.autoplay };`, { mode });
      if (rs.ok && rs.same && rs.log && rs.autoplay === assist) out.resumes++; else out.fails.push({ g, resume: rs });
    }
    const end = await step(`
      const st = app.state, before = JSON.parse(sessionStorage.getItem('soak.before'));
      const rep = A.replays.list()[0] || { code: '' }, r = KCT.Replay.run(rep.code);
      const res = { over: st.gameOver, winner: st.winner, replay: r.ok && r.state.winner === st.winner && JSON.stringify(r.state.scores) === JSON.stringify(st.scores),
        slotCleared: !A.slots.get(app.mode), assisted: rep.assisted, skip: JSON.parse(JSON.stringify(skip)),
        statsChanged: JSON.stringify(A.stats.get()) !== before.stats, wavesChanged: JSON.stringify(KCT.Waves.progress()) !== before.waves };
      click('[data-action="close-overlay"]');
      return res;`);
    out.games++; out[mode]++; if (assist) out.assisted++; if (end.winner === 0) out.youWon++;
    const counted = assist ? !end.statsChanged && !end.wavesChanged : end.statsChanged && (mode === 'free' || end.wavesChanged);
    if (!end.over || !end.replay || !end.slotCleared || end.assisted !== assist || !counted || end.skip.shownElsewhere || end.skip.missingInBotSd) out.fails.push({ g, mode, assist, end });
  }
  out.pageErrors = errors;
  return out;
}

(async () => {
  const workers = Number(process.argv[2] || 4), games = Number(process.argv[3] || 5);
  const srv = await serve(), browser = await launch(), t0 = Date.now();
  try {
    const all = await Promise.all(Array.from({ length: workers }, (_, w) => worker(browser, srv.url, w, games)));
    const sum = {};
    for (const o of all) for (const [k, v] of Object.entries(o)) sum[k] = Array.isArray(v) ? (sum[k] || []).concat(v) : (sum[k] || 0) + v;
    sum.seconds = Math.round((Date.now() - t0) / 1000);
    const bad = sum.fails.length || sum.pageErrors.length;
    console.log((bad ? 'FAIL ' : 'OK   ') + JSON.stringify(Object.assign({}, sum, { fails: sum.fails.length, pageErrors: sum.pageErrors.length })));
    for (const f of sum.fails.concat(sum.pageErrors)) console.log('  ✖ ' + JSON.stringify(f).slice(0, 600));
    process.exitCode = bad ? 1 : 0;
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
