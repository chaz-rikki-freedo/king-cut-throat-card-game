#!/usr/bin/env node
/* Every setting through the real controls: each control changes what it names, is kept (or, for the ones kept for one
   page load, is not), shows the same after a reload, and a new game takes it. Game tab: Theme, Table memory, House
   rules, Your seat. Bots tab: every control of every seat, Who sits in West and East, Reset this seat and Bot defaults.
   Tools tab: Event log, Clear log, Self-tests. resets.js, theme.js, backup-ui.js and sw.js go deeper on their own
   parts. Exit code 1 on a failed check. */
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
  const tab = name => step(`if (q('#settingsPanel').hidden) click('[data-action="toggle-settings"]'); click('#setTab' + arg); await sleep(20); return 1;`, name);
  const saved = () => step(`return JSON.parse(localStorage.getItem('kct.settings') || '{}');`);
  /* Sets a control as a player does: a click for a switch, a value and a change event for a list or a number. */
  const set = (id, value) => step(`
    const c = q('#' + arg[0]);
    if (c.type === 'checkbox') { if (c.checked !== arg[1]) c.click(); }
    else { c.value = String(arg[1]); c.dispatchEvent(new Event('change', { bubbles: true })); }
    await sleep(10);
    return c.type === 'checkbox' ? c.checked : c.value;
  `, [id, value]);
  const reload = async () => { await page.reload(); await page.waitForFunction(() => window.KCT && window.KCT.App); };
  /* A Free play game started from the menu's code path, with no seat dialog wait. */
  const newFree = () => step(`KCT.App.newGame(4242); await sleep(50); const s = app.state;
    return { mediatorLead: s.mediatorLead, jokerFlip: s.jokerFlip || '', personas: app.ui.personas.slice(), tunes: app.ui.tunes.slice() };`);
  try {
    console.log('Game tab');
    await tab('Game');
    for (const f of ['spring', 'summer', 'fall', 'winter', 'classic']) {
      await page.click('#setFelt .felt-tile:has(input[value="' + f + '"])');
      expect('Felt ' + f + ' is kept', (await saved()).felt === f);
    }
    await set('setColorBlind', true);
    expect('Color-blind safe colors on is kept', (await saved()).colors === 'colorblind');
    await set('setColorBlind', false);
    expect('Color-blind safe colors off is kept', (await saved()).colors === '');

    const mem = { setMemTrumps: 'trumps', setMemKings: 'kings', setMemTurned: 'turned', setMemVoids: 'voids' };
    for (const [id, key] of Object.entries(mem)) {
      await set(id, true);
      const on = await saved();
      await set(id, false);
      const off = await saved();
      expect('Table memory ' + key + ': on and off are kept, one switch at a time',
        on.memory[key] === true && Object.keys(mem).every(k => k === id || on.memory[mem[k]] === false) && off.memory[key] === false, [on.memory, off.memory]);
    }

    await set('setMediatorLead', false);
    let s = await saved(), g = await newFree();
    /* The Engine keeps the rule only when it is on. */
    expect('Mediator picks the Showdown lead off: kept, and a new game takes it', s.mediatorLead === false && !g.mediatorLead, [s.mediatorLead, g]);
    await tab('Game');
    await set('setMediatorLead', true);
    g = await newFree();
    expect('Mediator picks the Showdown lead on: a new game takes it', g.mediatorLead === true, g);
    for (const v of ['S', 'H', 'D', 'C', 'random', '']) {
      await tab('Game');
      await set('setJokerFlip', v);
      s = await saved(); g = await newFree();
      expect('Turned-up Joker "' + (v || 'Redeal') + '": kept, and a new game takes it', s.jokerFlip === v && g.jokerFlip === v, [s.jokerFlip, g.jokerFlip]);
    }
    /* A running game keeps its rules: the note under the switch says so. */
    await tab('Game');
    await set('setMediatorLead', false);
    const note = await step(`return { shown: !q('#setMediatorNow').hidden, text: q('#setMediatorNow').textContent };`);
    expect('a house rule changed mid-game: the note says the game keeps its rule', note.shown && note.text.length > 0, note);
    await set('setMediatorLead', true);
    await set('setPolitePlay', false);
    s = await saved();
    const pp = await step(`return app.houseRules.politePlay;`);
    expect('Polite Play off: kept and applied at once', s.politePlay === false && pp === false, [s.politePlay, pp]);
    await set('setPolitePlay', true);

    await set('setSeatAI', true);
    const ai = await step(`return app.ui.allowSeatAI;`);
    expect('AI can play your seat: on at once', ai === true);

    console.log('Bots tab');
    await tab('Bots');
    /* Every value of every list of every seat; worlds is a number. */
    const fields = await step(`return [...document.querySelectorAll('#setSeats [data-field]')].map(c => ({ id: c.id, seat: Number(c.id[4]), tag: c.tagName, values: c.tagName === 'SELECT' ? [...c.options].map(o => o.value).filter(Boolean) : ['3', '12'] }));`);
    expect('each seat has 21 controls', [0, 1, 2].every(p => fields.filter(f => f.seat === p).length === 21), fields.length);
    const bad = [];
    for (const f of fields) {
      if (f.id.endsWith('-who')) continue;
      for (const v of f.values) {
        const shown = await set(f.id, v);
        const r = await step(`const p = arg; return { tune: app.seats[p].tune, saved: JSON.parse(localStorage.getItem('kct.settings')).seats[p].tune, sum: q('#setSeatSum' + p).textContent };`, f.seat);
        /* custom is a label for a mix of skill fields, not a value to pick: picking it changes nothing. */
        const changed = v === 'custom' ? true : !!r.tune && JSON.stringify(r.tune) === JSON.stringify(r.saved) && /change/.test(r.sum);
        const showsIt = v === 'custom' || shown === v;
        if (!changed || !showsIt) bad.push({ id: f.id, v, shown, r });
      }
      await set(f.id, '');
    }
    expect('every value of every seat control is applied, kept and counted in the seat summary', bad.length === 0, bad.slice(0, 3));
    const back = await step(`return [0, 1, 2].map(p => app.seats[p].tune);`);
    expect('setting each control back to Its own leaves the seat as itself', back.every(t => t === null), back);

    for (const id of ['vex', 'doc', 'ace', 'mei', 'gus', 'lou', 'viv', 'tex', 'kit', 'zen']) {
      await set('seat1-who', id);
      const w = await step(`return app.seats[1].who;`);
      if (w !== id) bad.push({ who: id, got: w });
    }
    expect('Who sits: every bot can sit West', bad.length === 0, bad.slice(-3));
    await set('seat1-who', 'vex');
    await set('seat2-who', 'vex');
    const who = await step(`return [app.seats[1].who, app.seats[2].who];`);
    expect('West and East never pin the same bot: West gives way', who[0] === '' && who[1] === 'vex', who);
    await set('seat1-who', 'doc');
    await set('seat1-courage', 'bold');
    await set('seat0-who', 'zen');
    await reload();
    await tab('Bots');
    const after = await step(`return { w: q('#seat1-who').value, e: q('#seat2-who').value, c: q('#seat1-courage').value, y: q('#seat0-who').value, sum: q('#setSeatSum1').textContent };`);
    expect('after a reload, the seat controls show what was set', after.w === 'doc' && after.e === 'vex' && after.c === 'bold' && after.y === 'zen' && /1 change/.test(after.sum), after);
    g = await newFree();
    expect('a new Free play game seats them, with the tune', g.personas[1] === 'doc' && g.personas[2] === 'vex' && g.tunes[1] && g.tunes[1].courage === 'bold' && !g.tunes[2], g);
    await tab('Bots');
    await set('seat1-courage', 'timid');
    const seatNote = await step(`return { shown: !q('#setSeatNow1').hidden, text: q('#setSeatNow1').textContent };`);
    expect('a seat changed mid-game: the note says what this game seats', seatNote.shown && /This game: .*Your settings apply from your next game/.test(seatNote.text), seatNote);
    await step(`click('[data-action="seat-reset"][data-seat="1"]'); await sleep(10); return 1;`);
    const one = await step(`return [app.seats[0].who, app.seats[1], app.seats[2].who];`);
    expect('Reset this seat resets that seat only', one[0] === 'zen' && one[1].who === '' && one[1].tune === null && one[2] === 'vex', one);
    await step(`click('[data-action="settings-reset"]'); await sleep(10); return 1;`);
    const all = await step(`return { seats: app.seats, saved: JSON.parse(localStorage.getItem('kct.settings')).seats };`);
    expect('Bot defaults → All seats resets every seat, and is kept', all.seats.every(x => x.who === '' && x.tune === null) && all.saved.every(x => x.who === '' && x.tune === null), all);

    console.log('Kept after a reload');
    await tab('Game');
    await page.click('#setFelt .felt-tile:has(input[value="fall"])');
    await set('setMemKings', true);
    await set('setMediatorLead', false);
    await set('setJokerFlip', 'H');
    await set('setPolitePlay', false);
    await tab('Tools');
    await set('setEnable', true);
    await reload();
    await tab('Game');
    const kept = await step(`return { felt: q('#setFelt input:checked').value, kings: q('#setMemKings').checked, ml: q('#setMediatorLead').checked, jf: q('#setJokerFlip').value,
      pp: q('#setPolitePlay').checked, seatAI: q('#setSeatAI').checked, log: q('#setEnable').checked };`);
    expect('Game settings and Event log show as set after a reload', kept.felt === 'fall' && kept.kings && !kept.ml && kept.jf === 'H' && !kept.pp && kept.log, kept);
    expect('AI can play your seat is off after a reload (by design)', kept.seatAI === false, kept);

    console.log('Tools tab');
    /* The game waits while Settings is open: it plays with Settings closed, then the log is read. */
    await step(`click('[data-action="toggle-settings"]'); KCT.App.newGame(77); speed('instant'); (await waitFor('[data-action="swap-done"]')).click(); await sleep(1500); return 1;`);
    await tab('Tools');
    const log = await step(`return q('#setLog').textContent.split('\\n').filter(Boolean).length;`);
    expect('Event log on: game events are listed', log > 2, log);
    await step(`click('[data-action="clear-log"]'); await sleep(10); return 1;`);
    const cleared = await step(`return q('#setLog').textContent;`);
    expect('Clear log empties it', cleared === '', cleared.slice(0, 80));
    await set('setEnable', false);
    expect('Event log off is kept', (await saved()).logging === false);
    await step(`click('[data-action="run-tests"]'); return 1;`);
    await page.waitForFunction(() => !/Running/.test(document.querySelector('#setTests').textContent), null, { timeout: 30000 });
    /* This page blocks the service worker, so its two checks fail here (tests/sw.js runs them with the worker). */
    const tests = await step(`return { sum: q('#setTests .t-sum') ? q('#setTests .t-sum').textContent : q('#setTests').textContent.slice(0, 80),
      fails: [...document.querySelectorAll('#setTests .t-fail')].map(x => x.textContent).filter(t => !/^✖ Service worker/.test(t)) };`);
    expect('Self-tests: Run shows the result; with these settings nothing fails but the blocked service worker', /checks/.test(tests.sum) && tests.fails.length === 0, tests);

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
