#!/usr/bin/env node
/* Theme (docs/ui/plan.md, phase 5), through the real controls in Settings → Game: the felt tiles and the
   Color-blind safe colors switch. Each choice sets the tokens at once and is kept, and the head script applies it
   again on a reload, before the game starts. An unknown saved theme falls back to Classic. Exit code 1 on a failed
   check. tests/palette.js checks the colors of every pack. */
'use strict';
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
  /* The theme as the page has it: the felt and a bot color the color pack changes, and the browser bar color. */
  const now = () => step(`
    const css = getComputedStyle(document.documentElement), v = k => css.getPropertyValue(k).trim().toLowerCase();
    const checked = q('#setFelt input:checked');
    return { felt: v('--felt'), vex: v('--bot-vex'), bar: q('meta[name="theme-color"]').content.toLowerCase(), tile: checked && checked.value,
      cb: q('#setColorBlind').checked, saved: JSON.parse(localStorage.getItem('kct.settings') || '{}') };
  `);
  try {
    console.log('Theme in Settings → Game');
    const first = await step(`
      click('[data-action="toggle-settings"]'); click('#setTabGame'); await sleep(20);
      const pane = q('#setPaneGame');
      return { head: pane.querySelector('.set-head').textContent, firstCard: pane.querySelector('.set-card').id,
        tiles: [...document.querySelectorAll('#setFelt .felt-tile')].map(t => t.textContent), packs: KCT.App.app ? Object.keys(window.kctTheme.packs.felts) : [] };
    `);
    expect('Theme is the first setting in the Game tab', first.head === 'Theme' && first.firstCard === 'setTheme', first);
    expect('one tile for each felt: Classic and the four seasons', first.tiles.join('|') === 'Classic|Spring|Summer|Fall|Winter', first.tiles);
    const start = await now();
    expect('Classic is the default, with no color pack', start.tile === 'classic' && !start.cb && start.felt === '#155a36' && start.bar === '#0c3a22', start);

    console.log('Pick a felt');
    await page.click('#setFelt .felt-tile:has(input[value="winter"])');
    let t = await now();
    expect('Winter sets the felt and the browser bar at once', t.felt === '#2d4560' && t.bar === '#1d2f43' && t.tile === 'winter', t);
    expect('the choice is kept in the settings', t.saved.felt === 'winter' && t.saved.colors === '', t.saved);
    await page.click('#setFelt .felt-tile:has(input[value="fall"])');
    t = await now();
    expect('Fall replaces Winter', t.felt === '#6b3a1c' && t.tile === 'fall', t);
    const sd = await step(`return getComputedStyle(document.documentElement).getPropertyValue('--felt-showdown').trim().toLowerCase();`);
    expect('Fall has its own Showdown felt', sd === '#283a6b', sd);

    console.log('Color-blind safe colors');
    await page.click('label.set-row:has(#setColorBlind)');
    t = await now();
    expect('the switch lays the color pack over the felt', t.cb && t.vex === '#fe7f9d' && t.felt === '#6b3a1c' && t.saved.colors === 'colorblind', t);

    console.log('Reload');
    await page.reload();
    t = await now();
    expect('the head script applies the saved theme again', t.felt === '#6b3a1c' && t.vex === '#fe7f9d' && t.bar === '#4a2712', t);
    const boot = await step(`return document.documentElement.style.getPropertyValue('--felt');`);
    expect('the tokens are set on the root element', boot === '#6b3a1c', boot);
    await step(`click('[data-action="toggle-settings"]'); click('#setTabGame'); await sleep(20); return 1;`);
    t = await now();
    expect('Settings shows the saved theme', t.tile === 'fall' && t.cb, t);
    await page.click('label.set-row:has(#setColorBlind)');
    await page.click('#setFelt .felt-tile:has(input[value="classic"])');
    t = await now();
    expect('Classic with the switch off brings back every default', t.felt === '#155a36' && t.vex === '#ff7a7a' && t.bar === '#0c3a22' && t.saved.felt === 'classic' && t.saved.colors === '', t);
    const inline = await step(`
      const p = window.kctTheme.packs, names = new Set([...Object.values(p.felts), ...Object.values(p.colors)].flatMap(x => Object.keys(x.tokens)));
      return [...names].filter(k => document.documentElement.style.getPropertyValue(k));
    `);
    expect('and leaves no theme token on the root element', inline.length === 0, inline);

    console.log('A theme change in a game with seated bots');
    const seated = await step(`
      click('[data-action="toggle-settings"]'); A.newGame(4242, 1); speed('fast');
      await drive(() => app.state.handNumber >= 1 && KCT.Engine.actors(app.state).includes(0), 60000);
      const want = [1, 2].map(p => KCT.PERSONAS.find(x => x.id === app.ui.personas[p]).color);
      click('[data-action="toggle-settings"]'); click('#setTabGame'); await sleep(20);
      q('#setFelt input[value="winter"]').click(); q('#setColorBlind').click();
      const r = document.documentElement.style;
      return { want, got: [r.getPropertyValue('--name1'), r.getPropertyValue('--name2')] };
    `);
    expect('keeps the seated bots\' colors on --name1 and --name2', JSON.stringify(seated.got) === JSON.stringify(seated.want), seated);

    console.log('An unknown saved theme');
    await step(`const s = JSON.parse(localStorage.getItem('kct.settings')); s.felt = 'mars'; s.colors = 'neon'; localStorage.setItem('kct.settings', JSON.stringify(s)); return 1;`);
    await page.reload();
    t = await now();
    expect('falls back to Classic, with no color pack', t.felt === '#155a36' && t.vex === '#ff7a7a' && t.tile === 'classic' && !t.cb, t);

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
