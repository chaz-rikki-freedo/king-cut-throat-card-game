#!/usr/bin/env node
/* A full restart: every setting changed and two games left mid-play, then the browser is closed and opened again on the
   same profile (as closing and opening the installed app does). Every setting must come back as set, the theme before
   the game draws, the Settings tab where it was, and both saved games must resume at the same move with the same
   seats, tunes and rules, and play on. Speed and AI can play your seat last for one page load only, by design. A second
   restart checks that defaults, once set back, also stay. Exit code 1 on a failed check. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');
const { serve, run } = require('./lib/browser');

let failed = 0;
function expect(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? '  ✔ ' : '  ✖ ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500)));
}

/* Each seat's changes: [your seat, West, East], as control id -> value. */
const SEATS = [
  { who: 'zen', tier: 'shark', courage: 'timid' },
  { who: 'doc', courage: 'bold', 'k-bids': 'off', slack: '3', winHabit: 'duck' },
  { who: 'vex', leadHabit: 'kings', worlds: '12', credulity: '25', realTable: 'on' }
];

(async () => {
  const srv = await serve();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kct-restart-'));
  const opts = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {};
  let ctx = null;
  const errors = [];
  /* Opens the browser on the profile, as a cold start. */
  const start = async () => {
    ctx = await chromium.launchPersistentContext(dir, opts);
    const page = ctx.pages()[0] || await ctx.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(srv.url);
    await page.waitForFunction(() => window.KCT && window.KCT.App);
    return page;
  };
  const stop = async () => { await ctx.close(); ctx = null; };
  try {
    console.log('First run: change everything, leave two games mid-play');
    let page = await start();
    let step = (src, arg) => run(page, src, arg, ['drive.js']);
    await step(`
      const set = (id, v) => { const c = q('#' + id); if (c.type === 'checkbox') { if (c.checked !== v) c.click(); } else { c.value = String(v); c.dispatchEvent(new Event('change', { bubbles: true })); } };
      click('[data-action="toggle-settings"]'); click('#setTabGame'); await sleep(20);
      q('#setFelt input[value="winter"]').click();
      set('setColorBlind', true);
      for (const id of ['setMemTrumps', 'setMemKings', 'setMemTurned', 'setMemVoids']) set(id, true);
      for (const id of ['setMemShowTurned', 'setMemShowDiscards', 'setMemShowPlays']) set(id, false);
      set('setMediatorLead', false); set('setJokerFlip', 'random'); set('setPolitePlay', false); set('setSeatAI', true);
      click('#setTabTools'); set('setEnable', true);
      click('#setTabBots'); await sleep(20);
      arg.forEach((fields, p) => { for (const [f, v] of Object.entries(fields)) set('seat' + p + '-' + f, v); });
      return 1;`, SEATS);
    const before = await step(`return { settings: JSON.parse(localStorage.getItem('kct.settings')), seats: JSON.parse(JSON.stringify(app.seats)) };`);
    /* A Free play game to hand 2, then a Waves game a few moves in. Free play starts with the settings above. */
    const games = await step(`
      click('[data-action="toggle-settings"]');
      A.newGame(4242); speed('fast');
      const out = {};
      out.freeStop = await drive(() => app.state.handNumber >= 2 && KCT.Engine.actors(app.state).includes(0), 120000);
      const f = app.state;
      out.free = { version: f.version, seed: f.seed, personas: app.ui.personas.slice(), tunes: JSON.stringify(app.ui.tunes), mediatorLead: !!f.mediatorLead, jokerFlip: f.jokerFlip || '',
        log: document.querySelectorAll('#gameLog li').length };
      A.newGame(99, 1); speed('fast');
      out.wavesStop = await drive(() => app.state.handNumber >= 1 && app.state.trick && app.state.trick.plays && app.state.trick.plays.length > 0 && KCT.Engine.actors(app.state).includes(0), 120000);
      const w = app.state;
      out.waves = { version: w.version, personas: app.ui.personas.slice(), wave: app.wave.n };
      out.slots = { free: !!A.slots.get('free'), waves: !!A.slots.get('waves') };
      click('[data-action="toggle-settings"]'); click('#setTabBots');
      return out;`);
    expect('both games are saved mid-play', games.freeStop === 'stop' && games.wavesStop === 'stop' && games.slots.free && games.slots.waves, games);
    await stop();

    console.log('Restart');
    page = await start();
    step = (src, arg) => run(page, src, arg, ['drive.js']);
    const boot = await step(`const css = getComputedStyle(document.documentElement);
      return { felt: css.getPropertyValue('--felt').trim().toLowerCase(), vex: css.getPropertyValue('--bot-vex').trim().toLowerCase() };`);
    expect('the theme is applied at start: Winter felt with the color-blind pack', boot.felt === '#2d4560' && boot.vex === '#fe7f9d', boot);
    const shown = await step(`
      click('[data-action="toggle-settings"]'); await sleep(20);
      const tab = q('.set-tab[aria-selected="true"]').getAttribute('data-tab');
      const g = { felt: q('#setFelt input:checked').value, cb: q('#setColorBlind').checked,
        mem: ['setMemTrumps', 'setMemKings', 'setMemTurned', 'setMemVoids', 'setMemShowTurned', 'setMemShowDiscards', 'setMemShowPlays'].map(id => q('#' + id).checked).join(), preset: q('#setMemPreset').value,
        ml: q('#setMediatorLead').checked, jf: q('#setJokerFlip').value, pp: q('#setPolitePlay').checked, seatAI: q('#setSeatAI').checked, log: q('#setEnable').checked };
      const seats = arg.map((fields, p) => Object.keys(fields).filter(f => q('#seat' + p + '-' + f).value !== fields[f]));
      return { tab, g, seats, app: JSON.parse(JSON.stringify(app.seats)), speed: app.ui.speed, speedSel: q('#speedSel').value };`, SEATS);
    expect('Settings opens on the tab it was on (Bots)', shown.tab === 'Bots', shown.tab);
    expect('every Game setting is back', shown.g.felt === 'winter' && shown.g.cb && shown.g.mem === 'true,true,true,true,false,false,false' && shown.g.preset === 'custom' && !shown.g.ml && shown.g.jf === 'random' && !shown.g.pp, shown.g);
    expect('Event log is still on', shown.g.log === true);
    expect('every seat control shows its value', shown.seats.every(x => x.length === 0), shown.seats);
    expect('the seats are the same as before the restart', JSON.stringify(shown.app) === JSON.stringify(before.seats), [shown.app, before.seats]);
    expect('AI can play your seat is off again (one page load only)', shown.g.seatAI === false);
    expect('speed is back at Normal (one page load only)', shown.speed === 'normal' && shown.speedSel === 'normal', shown);

    const resumed = await step(`
      click('[data-action="toggle-settings"]');
      if (!app.menuOpen) { click('[data-action="menu"]'); await sleep(20); }
      const out = { free: !!q('[data-action="resume-free"]:not([disabled])'), waves: !!q('[data-action="resume-waves"]:not([disabled])') };
      click('[data-action="resume-free"]'); await sleep(50); speed('fast');
      const f = app.state;
      out.f = { version: f.version, seed: f.seed, personas: app.ui.personas.slice(), tunes: JSON.stringify(app.ui.tunes), mediatorLead: !!f.mediatorLead, jokerFlip: f.jokerFlip || '',
        log: document.querySelectorAll('#gameLog li').length };
      out.fPlay = await drive(() => app.state.version >= out.f.version + 6, 60000);
      click('[data-action="menu"]'); await sleep(20);
      click('[data-action="resume-waves"]'); await sleep(50); speed('fast');
      out.w = { version: app.state.version, personas: app.ui.personas.slice(), wave: app.wave.n };
      out.wPlay = await drive(() => app.state.version >= out.w.version + 6, 60000);
      return out;`);
    expect('the menu offers both saved games', resumed.free && resumed.waves, resumed);
    const f = games.free, rf = resumed.f;
    expect('Free play resumes at the same move, with its seats, tunes and rules', rf.version === f.version && rf.seed === f.seed && JSON.stringify(rf.personas) === JSON.stringify(f.personas) &&
      rf.tunes === f.tunes && rf.mediatorLead === f.mediatorLead && rf.jokerFlip === f.jokerFlip, [rf, f]);
    expect('its log comes back', rf.log >= f.log, [rf.log, f.log]);
    expect('Free play plays on after the restart', resumed.fPlay === 'stop', resumed.fPlay);
    expect('Waves resumes at the same move and wave, with the wave\'s table', resumed.w.version === games.waves.version && resumed.w.wave === 1 &&
      JSON.stringify(resumed.w.personas) === JSON.stringify(games.waves.personas), [resumed.w, games.waves]);
    expect('Waves plays on after the restart', resumed.wPlay === 'stop', resumed.wPlay);

    console.log('Defaults set back, then a second restart');
    await step(`
      click('[data-action="toggle-settings"]'); click('#setTabBots'); await sleep(20);
      click('[data-action="settings-reset"]');
      KCT.App.gameReset('theme'); KCT.App.gameReset('memory'); KCT.App.gameReset('house');
      const e = q('#setEnable'); if (e.checked) e.click();
      return 1;`);
    await stop();
    page = await start();
    step = (src, arg) => run(page, src, arg, ['drive.js']);
    const again = await step(`
      click('[data-action="toggle-settings"]'); click('#setTabGame'); await sleep(20);
      return { felt: q('#setFelt input:checked').value, cb: q('#setColorBlind').checked, mem: q('#setMemPreset').value,
        ml: q('#setMediatorLead').checked, jf: q('#setJokerFlip').value, pp: q('#setPolitePlay').checked, log: q('#setEnable').checked,
        seats: app.seats.every(s => s.who === '' && s.tune === null), free: !!A.slots.get('free'), waves: !!A.slots.get('waves') };`);
    expect('the defaults stay after a restart', again.felt === 'classic' && !again.cb && again.mem === 'standard' && again.ml && again.jf === '' && again.pp && !again.log && again.seats, again);
    expect('the saved games are still there', again.free && again.waves, again);

    expect('no page errors', errors.length === 0, errors);
  } catch (e) {
    failed++;
    console.log('  ✖ ' + (e && e.stack || e));
  } finally {
    if (ctx) await ctx.close();
    srv.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log(failed ? 'FAILED: ' + failed + ' check(s)' : 'OK: all checks passed');
  process.exit(failed ? 1 : 0);
})();
