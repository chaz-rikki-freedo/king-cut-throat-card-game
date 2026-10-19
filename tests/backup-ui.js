#!/usr/bin/env node
/* Your data (docs/ui/plan.md, phase 4), through the real controls in Settings → Tools: Save file writes a .kct
   file, and Restore reads it back after a confirm that shows this device and the backup side by side.
   Cancel, a file that is not a backup, and an older .json backup are checked too. Exit code 1 on a failed check. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { serve, launch, openPage, run } = require('./lib/browser');

let failed = 0;
function expect(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? '  ✔ ' : '  ✖ ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400)));
}

(async () => {
  const srv = await serve(), browser = await launch();
  const { page, errors } = await openPage(browser, srv.url);
  const step = (src, arg) => run(page, src, arg, ['drive.js']);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kct-backup-'));
  /* The time a game was saved changes with each save of the same game. */
  const norm = o => Object.keys(o).sort().map(k => k + '=' + o[k].replace(/"savedAt":\d+/g, '')).join('\n');
  const same = (a, b) => norm(a) === norm(b);
  const kct = () => step(`const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('kct.')) o[k] = localStorage.getItem(k); } return o;`);
  const openData = () => step(`if (q('#settingsPanel').hidden) click('[data-action="toggle-settings"]'); click('#setTabTools'); await sleep(20); return true;`);
  try {
    console.log('Back up: Save file');
    await step(`speed('instant'); KCT.App.newGame(424242); await drive(); q('#overlay').hidden = true; KCT.App.newGame(5); await drive(() => app.state.handNumber >= 2); return true;`);
    await openData();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="backup-save"]')]);
    const file = path.join(dir, dl.suggestedFilename());
    await dl.saveAs(file);
    const text = fs.readFileSync(file, 'utf8');
    expect('the file name ends in .kct', /^king-cut-throat-backup-\d{4}-\d\d-\d\d-[\d-]+\.kct$/.test(dl.suggestedFilename()), dl.suggestedFilename());
    expect('the file holds the backup code, not JSON', text.startsWith('KCTS1-'), text.slice(0, 20));
    const before = await step(`return (await KCT.Backup.parse(arg)).data;`, text);
    expect('the backup holds the game in progress', JSON.parse(before['kct.slots']).free !== null);
    await page.waitForFunction(() => !document.querySelector('#setDataNote').hidden);
    expect('a note names the saved file', (await page.textContent('#setDataNote')).includes(dl.suggestedFilename()));

    console.log('Restore: confirm, Cancel');
    await step(`click('[data-action="toggle-settings"]'); q('#overlay').hidden = true; KCT.App.newGame(77); await drive(); q('#overlay').hidden = true; return true;`);
    const changed = await kct();
    expect('a later game changed the data', changed['kct.stats'] !== before['kct.stats']);
    await openData();
    await page.setInputFiles('#backupFile', file);
    await page.waitForSelector('#askLayer:not([hidden]) table.data-cmp');
    const dlg = await step(`
      const rows = [...document.querySelectorAll('#askLayer table.data-cmp tr')].map(tr => [...tr.children].map(c => c.textContent));
      return { title: q('#askTitle').textContent, rows, focus: document.activeElement.dataset.action, ok: q('[data-action="ask-ok"]').className, okText: q('[data-action="ask-ok"]').textContent };
    `);
    expect('the confirm asks to replace all data', dlg.title === 'Replace all data?', dlg.title);
    expect('it shows this device and the backup side by side', dlg.rows[0].join('|') === '|This device|Backup' && dlg.rows.length === 6, dlg.rows);
    const games = dlg.rows.find(r => r[0] === 'Games played');
    expect('the two sides differ where the data differs', games && Number(games[1]) === Number(games[2]) + 1, games);
    expect('the saved game of the backup shows', dlg.rows.find(r => r[0] === 'Saved games')[2] === 'Free play', dlg.rows);
    expect('Cancel has the focus, and the OK button is red', dlg.focus === 'ask-cancel' && /\bdanger\b/.test(dlg.ok) && dlg.okText === 'Replace all data', dlg);
    await page.click('[data-action="ask-cancel"]');
    const kept = await kct();
    expect('Cancel changes nothing', same(kept, changed), Object.keys(kept).filter(k => kept[k] !== changed[k]).map(k => [k, (changed[k] || '').slice(0, 300), (kept[k] || '').slice(0, 300)]));

    console.log('Restore: Replace all data');
    await page.setInputFiles('#backupFile', file);
    await page.waitForSelector('#askLayer:not([hidden]) table.data-cmp');
    await Promise.all([page.waitForEvent('load'), page.click('[data-action="ask-ok"]')]);
    const after = await kct();
    expect('the page reloads with the backup data', same(after, before), [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(k => after[k] !== before[k]).map(k => [k, String(before[k]).slice(0, 200), String(after[k]).slice(0, 200)]));
    const resumed = await step(`return { hasSave: !!(KCT.App.slots && JSON.parse(localStorage.getItem('kct.slots') || '{}').free) };`);
    expect('the saved game is back', resumed.hasSave);

    console.log('Restore: a file that is not a backup');
    await openData();
    const junk = path.join(dir, 'notes.kct');
    fs.writeFileSync(junk, 'hello');
    const keep = await kct();
    await page.setInputFiles('#backupFile', junk);
    await page.waitForFunction(() => !document.querySelector('#setDataNote').hidden);
    expect('a note says that nothing changed, and no confirm opens', (await page.textContent('#setDataNote')).includes('Nothing changed') && await page.$eval('#askLayer', el => el.hidden));
    expect('the data is unchanged', same(await kct(), keep));

    console.log('Restore: an older .json backup');
    const json = await step(`return KCT.App.backup.toJSON();`);
    const old = path.join(dir, 'king-cut-throat-backup-old.json');
    fs.writeFileSync(old, json);
    await page.setInputFiles('#backupFile', old);
    await page.waitForSelector('#askLayer:not([hidden]) table.data-cmp');
    expect('a .json backup opens the confirm too', true);
    await page.click('[data-action="ask-cancel"]');

    expect('no page errors', errors.length === 0, errors);
  } catch (e) {
    failed++;
    console.log('  ✖ ' + (e && e.stack || e));
  } finally {
    await browser.close(); srv.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log(failed ? 'FAILED: ' + failed + ' check(s)' : 'OK: all checks passed');
  process.exit(failed ? 1 : 0);
})();
