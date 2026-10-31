#!/usr/bin/env node
/* Resets through the real controls: Reset this tab in Settings → Bots and Settings → Table, and Erase in Settings →
   Tools → Your data. Each asks first (Cancel focused, a red button). A tab reset applies at once and keeps all
   progress; Erase deletes stored data and reloads the page. Exit code 1 on a failed check. */
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
  /* Presses a tab's Reset this tab; returns the question shown. */
  const press = btn => step(`
    click('[data-action="' + arg + '"]'); await waitFor('#askLayer .modal');
    return { open: askOpen(), title: q('#askTitle').textContent, danger: q('[data-action="ask-ok"]').classList.contains('danger'),
      focus: document.activeElement && document.activeElement.getAttribute('data-action') };
  `, btn);
  /* Confirms a reset that reloads the page, and waits for the new page. */
  const confirmReload = async () => {
    await Promise.all([page.waitForEvent('load'), page.click('[data-action="ask-ok"]')]);
    await page.waitForFunction(() => window.KCT && window.KCT.App);
  };
  try {
    console.log('Bots → Reset this tab');
    await openTab('Bots');
    const bots = await step(`const p = q('#setPaneBots'); return { heads: [...p.querySelectorAll('.set-head')].map(h => h.textContent), reset: !!p.querySelector('#setBotDefaults [data-action="settings-reset"]') };`);
    expect('the Bots tab ends with Bot defaults and its Reset this tab', bots.heads[bots.heads.length - 1] === 'Bot defaults' && bots.reset, bots);
    await step(`const c = q('#seat1-who'); c.value = 'doc'; c.dispatchEvent(new Event('change', { bubbles: true })); return 1;`);
    let a = await press('settings-reset');
    expect('Reset asks first, on Cancel, with a red button', a.open && a.title === 'Reset the Bots tab?' && a.danger && a.focus === 'ask-cancel', a);
    await page.click('[data-action="ask-cancel"]');
    expect('Cancel changes nothing', json(await stored(), 'kct.settings').seats[1].who === 'doc');
    await press('settings-reset');
    await page.click('[data-action="ask-ok"]');
    expect('every seat goes back to the seed\'s pick, at once', json(await stored(), 'kct.settings').seats.every(x => x.who === '' && x.tune === null));

    console.log('Table → Reset this tab');
    await seed();
    await openTab('Table');
    const table = await step(`const p = q('#setPaneTable'), h = [...p.querySelectorAll('.set-head')];
      return { heads: h.map(x => x.textContent), reset: !!p.querySelector('#setTableDefaults [data-action="table-reset"]'), old: !!q('#setGameReset') };`);
    expect('the Table tab: Table memory, House rules, Theme, then Table defaults with its Reset this tab',
      table.heads.join('|') === 'Table memory|House rules|Theme|Table defaults' && table.reset && !table.old, table);

    await page.click('#setFelt .felt-tile:has(input[value="winter"])');
    await page.click('label.set-row:has(#setColorBlind)');
    await step(`q('#setMemEach').open = true; q('#setMemAdds').open = true; q('#setMemShows').open = true; return 1;`);
    await page.click('label.set-row:has(#setMemTrumps)');
    await page.click('label.set-row:has(#setMemVoids)');
    await page.click('label.set-row:has(#setMediatorLead)');
    await page.selectOption('#setJokerFlip', 'H');
    await page.click('label.set-row:has(#setPolitePlay)');
    const changed = json(await stored(), 'kct.settings');
    expect('the settings are changed first', changed.felt === 'winter' && changed.memory.trumps && !changed.mediatorLead && changed.jokerFlip === 'H' && !changed.politePlay, changed);

    a = await press('table-reset');
    expect('Reset asks first, on Cancel, with a red button', a.open && a.title === 'Reset the Table tab?' && a.danger && a.focus === 'ask-cancel', a);
    await page.click('[data-action="ask-cancel"]');
    expect('Cancel changes nothing', json(await stored(), 'kct.settings').felt === 'winter');
    await press('table-reset');
    await page.click('[data-action="ask-ok"]');
    let s = await step(`return { felt: q('#setFelt input:checked').value, cb: q('#setColorBlind').checked, preset: q('#setMemPreset').value,
      ml: q('#setMediatorLead').checked, jf: q('#setJokerFlip').value, pp: q('#setPolitePlay').checked, saved: JSON.parse(localStorage.getItem('kct.settings')) };`);
    expect('Theme goes back to Classic, color pack off, at once', s.felt === 'classic' && !s.cb && s.saved.felt === 'classic' && s.saved.colors === '', s);
    expect('Table memory goes back to Standard', s.preset === 'standard' &&
      JSON.stringify(s.saved.memory) === JSON.stringify({ trumps: false, kings: false, turned: false, voids: false, showTurned: true, showDiscards: true, showPlays: true }), s.saved.memory);
    expect('House rules go back to their defaults', s.ml && s.jf === '' && s.pp && s.saved.mediatorLead && s.saved.jokerFlip === '' && s.saved.politePlay, s);
    let d = await stored();
    expect('progress stays', json(d, 'kct.waves').unlocked === 4 && json(d, 'kct.replays').length === 3, d['kct.waves']);

    console.log('Tools → Your data → Erase');
    await openTab('Tools');
    const tools = await step(`const p = q('#setPaneTools'), h = [...p.querySelectorAll('.set-head')];
      return { last: h[h.length - 1].textContent, inData: !!q('#setData #setClientReset'), options: [...q('#setClientReset').options].map(o => o.text) };`);
    expect('the Tools tab ends with Your data, which holds Erase', tools.last === 'Your data' && tools.inData, tools);
    expect('its choices, from one mode to everything', tools.options.join('|') === 'Waves progress|Dynamic progress|Free play history|All progress|Progress + settings|Everything + game files', tools.options);

    await seed();
    await page.reload();
    await openTab('Tools');
    a = await pick('#setClientReset', 'waves', 'client-reset');
    expect('Waves progress asks first, on Cancel, with a red button', a.title === 'Erase Waves progress?' && a.ok === 'Erase Waves progress' && a.danger && a.focus === 'ask-cancel', a);
    await confirmReload();
    d = await stored();
    expect('Waves lock again from wave 1', json(d, 'kct.waves').unlocked === 1 && json(d, 'kct.waves').cleared.length === 0, d['kct.waves']);
    const st = json(d, 'kct.stats');
    expect('its results leave every total', !st.modes.waves && st.modes.free.played === 2 && st.tables['vex/doc'].played === 2 && st.opponents.vex.played === 2 && !st.modeTables.waves, st);
    expect('its replay codes go, the others stay', json(d, 'kct.replays').map(e => e.code).join() === 'KCT3-BB,KCT3-CC', d['kct.replays']);
    expect('the settings stay', !!d['kct.settings']);

    await seed();
    await step(`const s = JSON.parse(localStorage.getItem('kct.settings')); s.felt = 'spring'; localStorage.setItem('kct.settings', JSON.stringify(s)); return 1;`);
    await openTab('Tools');
    a = await pick('#setClientReset', 'profile', 'client-reset');
    expect('All progress asks first', a.title === 'Erase all progress?' && a.ok === 'Erase all progress' && a.danger, a);
    await confirmReload();
    d = await stored();
    expect('progress, results and replay codes go; settings stay',
      !d['kct.stats'] && !d['kct.replays'] && (!d['kct.waves'] || json(d, 'kct.waves').unlocked === 1) && json(d, 'kct.settings').felt === 'spring', d);

    await seed();
    await openTab('Tools');
    await pick('#setClientReset', 'all', 'client-reset');
    await confirmReload();
    d = await stored();
    expect('Progress + settings removes every key, settings too', !d['kct.stats'] && !d['kct.replays'] && !d['kct.settings'], Object.keys(d));

    await seed();
    await step(`await caches.open('kct-shell'); await caches.open('kct-pending'); await caches.open('other-app'); return 1;`);
    await openTab('Tools');
    a = await pick('#setClientReset', 'full', 'client-reset');
    expect('Everything + game files asks first', a.title === 'Erase everything and the game files?' && a.ok === 'Erase everything', a);
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
