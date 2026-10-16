#!/usr/bin/env node
/* Waves: leaving a game from hand 2 on counts as a try, through the real menu buttons and questions.
   Each case runs in its own page (own storage). Exit code 1 on a failed check. */
'use strict';
const { serve, launch, openPage } = require('./lib/browser');

let failed = 0;
function expect(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? '  ✔ ' : '  ✖ ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail)));
}

/* Starts wave 1 with SEED and plays every seat until the given hand. setup: 'cleared' (wave 1 cleared first),
   'assisted' (the AI has played your seat) or 'saved' (Free play is then started, so the wave game waits in its slot). */
const PLAY = ({ hand, setup, seed }) => {
  const { App, Engine, AI, Waves } = KCT, a = App.app;
  if (setup === 'cleared') Waves.record(1, true);
  App.newGame(seed, 1);
  if (setup === 'assisted') a.humanSeatWasAutoplayed = true;
  const no = s => s.handNumber + (s.phase === Engine.P.HAND_START ? 1 : 0) - (s.redeals || 0);
  for (let i = 0; i < 5000 && no(a.state) < hand && !a.state.gameOver; i++) {
    const ac = Engine.actors(a.state);
    App.act(ac.length ? AI.fastAction(a.state, ac[0]) : Engine.systemAction(a.state));
  }
  const at = no(a.state);
  if (setup === 'saved') App.newGame(undefined, undefined, { mode: 'free' });
  App.showMenu();
  return { at, tries: Waves.tries(1) };
};

/* Leaves the wave game with a menu button, agrees, and returns the question and the tries after. */
async function leave(page, button) {
  await page.click('[data-action="' + button + '"]');
  await page.waitForSelector('#askText', { timeout: 5000 });
  const text = await page.textContent('#askText');
  await page.click('[data-action="ask-ok"]');
  await page.waitForSelector('#askLayer', { state: 'hidden' });
  return { text, tries: await page.evaluate(() => KCT.Waves.tries(1)) };
}

const CASES = [
  { name: 'Discard in hand 1: free, no note', hand: 1, button: 'discard-waves', note: false, tries: 0 },
  { name: 'Discard in hand 2: one try, with the note', hand: 2, button: 'discard-waves', note: true, tries: 1 },
  { name: 'Play wave in hand 7: one try, with the note', hand: 7, button: 'play-wave', note: true, tries: 1 },
  { name: 'a saved wave game, discarded while Free play runs: one try', hand: 3, setup: 'saved', button: 'discard-waves', note: true, tries: 1 },
  { name: 'a cleared wave: no try, no note', hand: 3, setup: 'cleared', button: 'discard-waves', note: false, tries: 1 },
  { name: 'the AI played your seat: no try, no note', hand: 3, setup: 'assisted', button: 'discard-waves', note: false, tries: 0 }
];

/* A seed whose game lasts past hand 7 (the bots' play is fixed by the seed), so every case reaches its hand. */
const SEED = 1001;

(async () => {
  const srv = await serve(), browser = await launch();
  try {
    for (const c of CASES) {
      const { page, errors } = await openPage(browser, srv.url);
      try {
        const start = await page.evaluate(PLAY, { hand: c.hand, setup: c.setup, seed: SEED });
        const r = await leave(page, c.button);
        const note = r.text.includes('This counts as a try on wave 1.');
        expect(c.name, start.at === c.hand && note === c.note && r.tries === c.tries && !errors.length, { start, r, errors });
      } catch (e) {
        expect(c.name, false, e instanceof Error ? e.message.split('\n')[0] : String(e));
      } finally {
        await page.context().close();
      }
    }
  } finally {
    await browser.close();
    srv.close();
  }
  console.log(failed ? 'FAIL: ' + failed + ' check(s) failed' : 'OK: all checks passed');
  process.exit(failed ? 1 : 0);
})();
