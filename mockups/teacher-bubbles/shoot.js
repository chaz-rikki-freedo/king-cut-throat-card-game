#!/usr/bin/env node
/* Screenshots of Training and Puzzles in the real app (docs/ui/teacher-bubbles.md): the lobby on a first launch, a
   lesson's bubble, a hint, the guided hand's coach, a puzzle, and the menu's fourth card, on a wide screen and a phone.
   Needs Playwright, as the tests do (tests/README.md). From the repository root: node mockups/teacher-bubbles/shoot.js */
'use strict';
const path = require('path');
const { serve, launch, openPage, run } = require('../../tests/lib/browser');

const H = `
  const talk = a => q('#talk [data-action="' + a + '"]');
  const next = async () => { while (talk('talk-next')) { click('#talk [data-action="talk-next"]'); await sleep(10); } };
  const done = ids => localStorage.setItem('kct.lessons', JSON.stringify({ done: ids }));
`;
const SHOTS = [
  { file: 'lobby-desktop.png', w: 1100, h: 760, src: 'await sleep(200);' },
  { file: 'lobby-phone.png', w: 390, h: 844, src: 'await sleep(200);' },
  { file: 'lesson-bowers-desktop.png', w: 1100, h: 760, src: `click('#talk [data-action="training-start"]'); await sleep(50);
      click('[data-action="menu"]'); await sleep(50); click('#overlay [data-action="lesson-list"]'); await sleep(50);
      click('#overlay [data-action="lesson-pick"][data-i="2"]'); await sleep(200); click('#talk [data-action="talk-next"]'); await sleep(300);` },
  { file: 'lesson-bowers-phone.png', w: 390, h: 844, src: `click('#talk [data-action="training-start"]'); await sleep(50);
      click('[data-action="menu"]'); await sleep(50); click('#overlay [data-action="lesson-list"]'); await sleep(50);
      click('#overlay [data-action="lesson-pick"][data-i="2"]'); await sleep(200); click('#talk [data-action="talk-next"]'); await sleep(300);` },
  { file: 'lesson-hint-desktop.png', w: 1100, h: 760, src: `click('#talk [data-action="training-start"]'); await sleep(50); await next(); click('#talk [data-action="talk-close"]');
      click('#hand button[data-card="8S"]'); while (!talk('lesson-hint')) await sleep(30); click('#talk [data-action="lesson-hint"]'); await sleep(300);` },
  { file: 'coach-call-desktop.png', w: 1100, h: 760, src: `done(KCT.TRAINING.slice(0, 6).map(x => x.id)); click('[data-action="menu"]'); await sleep(50); click('#overlay [data-action="training-start"]'); await sleep(50);
      speed('fast'); await next(); click('#talk [data-action="talk-close"]'); await sleep(50); click('#talk [data-action="talk-close"]'); await sleep(50);
      for (const c of ['8S', '7D', '8D']) click('#hand button[data-card="' + c + '"]'); click('[data-action="confirm-discard"]');
      while (!talk('talk-close')) await sleep(30); await sleep(400);` },
  { file: 'puzzle-desktop.png', w: 1100, h: 760, src: `done(KCT.TRAINING.map(x => x.id)); click('[data-action="menu"]'); await sleep(50); click('#overlay [data-action="puzzles-open"]'); await sleep(300); await next(); await sleep(200);` },
  { file: 'menu-desktop.png', w: 1100, h: 900, src: `done(KCT.TRAINING.slice(0, 3).map(x => x.id)); click('[data-action="menu"]'); await sleep(300);` }
];

(async () => {
  const srv = await serve(), browser = await launch();
  try {
    for (const s of SHOTS) {
      const { page, errors } = await openPage(browser, srv.url);
      await page.setViewportSize({ width: s.w, height: s.h });
      await page.reload();
      await page.waitForTimeout(400);
      await run(page, H + s.src, null, ['drive.js']);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(__dirname, s.file) });
      console.log((errors.length ? '✖ ' : '✔ ') + s.file + (errors.length ? ' ' + errors.join(' | ') : ''));
      await page.context().close();
    }
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
