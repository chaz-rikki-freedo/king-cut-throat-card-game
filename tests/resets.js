#!/usr/bin/env node
/* Defaults and resets through the real controls: Settings → Bots → Bot defaults, Settings → Game → Gameplay defaults
   and Settings → Tools → Client resets. Each reset asks first (Cancel focused, a red button). A settings reset applies
   at once; a reset of stored data reloads the page. Exit code 1 on a failed check. */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

let failed = 0;
function expect(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? '  ✔ ' : '  ✖ ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400)));
}

/* Stored data for every mode: wave progress, Dynamic's profile, results and replay codes. */
const SEED = {
  'kct.waves': JSON.stringify({ unlocked: 4, cleared: [1, 2, 3], tries: { 1: 1, 2: 1, 3: 2 } }),
  'kct.stats': JSON.stringify({ modes: { waves: { played: 4, won: 3 }, free: { played: 2, won: 1 } }, tables: { 'vex/doc': { played: 6, won: 4 } },
    opponents: { vex: { played: 6, won: 4 }, doc: { played: 6, won: 4 } }, modeOpponents: { waves: { vex: { played: 4, won: 3 }, doc: { played: 4, won: 3 } }, free: { vex: { played: 2, won: 1 }, doc: { played: 2, won: 1 } } },
    modeTables: { waves: { 'vex/doc': { played: 4, won: 3 } }, free: { 'vex/doc': { played: 2, won: 1 } } } }),
  'kct.replays': JSON.stringify([{ code: 'KCT3-AA', mode: 'waves' }, { code: 'KCT3-BB', mode: 'free' }, { code: 'KCT3-CC', mode: 'dynamic' }])
};

(async () => {
  const srv = await serve(), browser = await launch();
  const { page, errors } = await openPage(browser, srv.url);
  const step = (src, arg) => run(page, src, arg, ['drive.js']);
  const openTab = tab => step(`if (q('#settingsPanel').hidden) click('[data-action="toggle-settings"]'); click('#setTab' + arg); await sleep(20); return 1;`, tab);
  const seed = () => step(`for (const [k, v] of Object.entries(arg)) localStorage.setItem(k, v); return 1;`, SEED);
  const stored = () => step(`const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o;`);
  const json = (o, k) => (o[k] ? JSON.parse(o[k]) : null);
  /* Picks a choice and presses Reset; returns the question shown. */
  const pick = (sel, value, btn) => step(`
    const s = q(arg[0]); s.value = arg[1]; s.dispatchEvent(new Event('change'));
    click('[data-action="' + arg[2] + '"]'); await waitFor('#askLayer .modal');
    return { open: askOpen(), title: q('#askTitle').textContent, ok: q('[data-action="ask-ok"]').textContent,
      danger: q('[data-action="ask-ok"]').classList.contains('danger'), focus: document.activeElement && document.activeElement.getAttribute('data-action') };
  `, [sel, value, btn]);
  /* Confirms a reset that reloads the page, and waits for the new page. */
  const confirmReload = async () => {
    await Promise.all([page.waitForEvent('load'), page.click('[data-action="ask-ok"]')]);
    await page.waitForFunction(() => window.KCT && window.KCT.App);
  };
  try {
    console.log('Bot defaults');
    await openTab('Bots');
    const bots = await step(`const p = q('#setPaneBots'); return { heads: [...p.querySelectorAll('.set-head')].map(h => h.textContent), reset: !!p.querySelector('[data-action="settings-reset"]') };`);
    expect('the Bots tab ends with Bot defaults and its Reset', bots.heads[bots.heads.length - 1] === 'Bot defaults' && bots.reset, bots);

    console.log('Gameplay defaults');
    await openTab('Game');
    const game = await step(`const p = q('#setPaneGame'), h = [...p.querySelectorAll('.set-head')];
      return { last: h[h.length - 1].textContent, options: [...q('#setGameReset').options].map(o => o.text) };`);
    expect('the Game tab ends with Gameplay defaults', game.last === 'Gameplay defaults', game);
    expect('its choices', game.options.join('|') === 'All settings and modes|Theme|Table memory|House rules|Waves progress|Dynamic progress|Free play history', game.options);

    await page.click('#setFelt .felt-tile:has(input[value="winter"])');
    await page.click('label.set-row:has(#setColorBlind)');
    await page.click('label.set-row:has(#setMemTrumps)');
    await page.click('label.set-row:has(#setMemVoids)');
    await page.click('label.set-row:has(#setMediatorLead)');
    await page.selectOption('#setJokerFlip', 'H');
    await page.click('label.set-row:has(#setPolitePlay)');
    const changed = json(await stored(), 'kct.settings');
    expect('the settings are changed first', changed.felt === 'winter' && changed.memory.trumps && !changed.mediatorLead && changed.jokerFlip === 'H', changed);

    let a = await pick('#setGameReset', 'theme', 'game-reset');
    expect('Reset asks first, on Cancel, with a red button', a.open && a.title === 'Reset the theme?' && a.danger && a.focus === 'ask-cancel', a);
    await page.click('[data-action="ask-cancel"]');
    expect('Cancel changes nothing', json(await stored(), 'kct.settings').felt === 'winter');
    await pick('#setGameReset', 'theme', 'game-reset');
    await page.click('[data-action="ask-ok"]');
    let s = await step(`return { felt: q('#setFelt input:checked').value, cb: q('#setColorBlind').checked, saved: JSON.parse(localStorage.getItem('kct.settings')) };`);
    expect('Theme goes back to Classic, color pack off, at once', s.felt === 'classic' && !s.cb && s.saved.felt === 'classic' && s.saved.colors === '', s);
    expect('and Table memory stays', s.saved.memory.trumps && s.saved.memory.voids, s.saved.memory);

    await pick('#setGameReset', 'memory', 'game-reset');
    await page.click('[data-action="ask-ok"]');
    s = await step(`return { sw: ['#setMemTrumps', '#setMemKings', '#setMemTurned', '#setMemVoids'].map(x => q(x).checked), saved: JSON.parse(localStorage.getItem('kct.settings')) };`);
    expect('Table memory switches all turn off', s.sw.every(x => !x) && Object.values(s.saved.memory).every(x => !x), s);

    await pick('#setGameReset', 'house', 'game-reset');
    await page.click('[data-action="ask-ok"]');
    s = await step(`return { ml: q('#setMediatorLead').checked, jf: q('#setJokerFlip').value, pp: q('#setPolitePlay').checked, saved: JSON.parse(localStorage.getItem('kct.settings')) };`);
    expect('House rules go back to their defaults', s.ml && s.jf === '' && s.pp && s.saved.mediatorLead && s.saved.jokerFlip === '' && s.saved.politePlay, s);

    console.log('A mode reset');
    await seed();
    await page.reload();
    await openTab('Game');
    a = await pick('#setGameReset', 'waves', 'game-reset');
    expect('Waves asks first', a.title === 'Reset Waves progress?', a);
    await confirmReload();
    let d = await stored();
    expect('Waves lock again from wave 1', json(d, 'kct.waves').unlocked === 1 && json(d, 'kct.waves').cleared.length === 0, d['kct.waves']);
    const st = json(d, 'kct.stats');
    expect('its results leave every total', !st.modes.waves && st.modes.free.played === 2 && st.tables['vex/doc'].played === 2 && st.opponents.vex.played === 2 && !st.modeTables.waves, st);
    expect('its replay codes go, the others stay', json(d, 'kct.replays').map(e => e.code).join() === 'KCT3-BB,KCT3-CC', d['kct.replays']);
    expect('the settings stay', !!d['kct.settings']);

    console.log('All gameplay');
    await seed();
    await page.reload();
    await openTab('Game');
    await page.click('#setFelt .felt-tile:has(input[value="fall"])');
    await pick('#setGameReset', 'all', 'game-reset');
    await confirmReload();
    d = await stored();
    expect('every mode loses its data', json(d, 'kct.waves').unlocked === 1 && Object.keys(json(d, 'kct.stats').modes).length === 0 && json(d, 'kct.replays').length === 0, d);
    expect('and the theme is Classic', json(d, 'kct.settings').felt === 'classic', d['kct.settings']);

    console.log('Client resets');
    await openTab('Tools');
    const tools = await step(`const p = q('#setPaneTools'), h = [...p.querySelectorAll('.set-head')];
      return { last: h[h.length - 1].textContent, options: [...q('#setClientReset').options].map(o => o.text) };`);
    expect('the Tools tab ends with Client resets', tools.last === 'Client resets', tools);
    expect('its choices', tools.options.join('|') === 'Your progress|All data|All data and the offline copy', tools.options);

    await seed();
    await step(`const s = JSON.parse(localStorage.getItem('kct.settings')); s.felt = 'spring'; localStorage.setItem('kct.settings', JSON.stringify(s)); return 1;`);
    a = await pick('#setClientReset', 'profile', 'client-reset');
    expect('Your progress asks first', a.title === 'Erase your progress?' && a.ok === 'Erase progress' && a.danger, a);
    await confirmReload();
    d = await stored();
    expect('progress, results and replay codes go; settings stay',
      !d['kct.stats'] && !d['kct.replays'] && (!d['kct.waves'] || json(d, 'kct.waves').unlocked === 1) && json(d, 'kct.settings').felt === 'spring', d);

    await seed();
    await openTab('Tools');
    await pick('#setClientReset', 'all', 'client-reset');
    await confirmReload();
    d = await stored();
    expect('All data removes every key, settings too', !d['kct.stats'] && !d['kct.replays'] && !d['kct.settings'], Object.keys(d));

    await seed();
    await step(`await caches.open('kct-shell'); await caches.open('kct-pending'); await caches.open('other-app'); return 1;`);
    await openTab('Tools');
    a = await pick('#setClientReset', 'full', 'client-reset');
    expect('All data and the offline copy asks first', a.title === 'Erase all data and the offline copy?' && a.ok === 'Erase and reload', a);
    await confirmReload();
    d = await stored();
    const left = await step(`return (await caches.keys()).sort();`);
    expect('it wipes the data and the game\'s caches only', !d['kct.stats'] && !d['kct.settings'] && left.join() === 'other-app', { keys: Object.keys(d), caches: left });

    expect('no page errors', errors.length === 0, errors);
  } catch (e) {
    failed++;
    console.log('  ✖ ' + (e && e.stack || e));
  } finally {
    await browser.close(); srv.close();
  }
  console.log(failed ? 'FAILED: ' + failed + ' check(s)' : 'OK: all checks passed');
  process.exit(failed ? 1 : 0);
})();
