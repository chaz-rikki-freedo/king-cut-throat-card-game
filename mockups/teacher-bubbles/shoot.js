#!/usr/bin/env node
/* Teacher bubbles on the real table (docs/ui/teacher-bubbles.md). Loads lesson 1 into the app (Advanced UI), seats
   Mei (West) and Kit (East), draws a prototype bubble in the style of the game's information popups, and saves the
   screenshots next to this file. The table, the cards and the mini cards are the game's own; only the bubble and
   the gold pointer ring are the prototype (PROTO_CSS). Needs Playwright, as the tests do (tests/README.md).
   From the repository root: node mockups/teacher-bubbles/shoot.js */
'use strict';
const path = require('path');
const { serve, launch, openPage } = require('../../tests/lib/browser');

/* The prototype: a .panel that speaks. Dark like every popup in the game; the speaker's color on the border, the
   tail and the name. Desktop: in the speaker's seat panel, under the trick circles. Phone: a row of its own under
   the seats, which pushes the table down (as the Latest Scroll does). */
const PROTO_CSS = `
body.adv .talk{position:relative;margin-top:auto;background:#0b2a1a;border:0.125rem solid var(--who);border-radius:0.75rem;
  box-shadow:0 0.625rem 1.625rem rgba(0,0,0,.55);font-size:0.875rem;line-height:1.4;color:#f5f2e9}
body.adv .talk::before{content:"";position:absolute;top:-0.6875rem;left:var(--tail,1.25rem);width:1.125rem;height:0.625rem;
  background:var(--who);clip-path:polygon(50% 0,100% 100%,0 100%);transform:translateX(-50%)}
body.adv .talk .speaker{display:block;padding:0.5rem 0.75rem 0;font-size:0.6875rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--who)}
body.adv .talk p{margin:0.25rem 0.75rem 0.625rem}
body.adv .talk .acts{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:0.5rem;padding:0 0.625rem 0.625rem}
body.adv .talk .acts .btn{white-space:nowrap}
body.adv .talk .tagref{white-space:nowrap;font-weight:800;color:#f2c14e}
/* In a seat panel the bubble comes last, under the trick circles. */
body.adv .seat > .talk{order:99;margin-top:0.875rem}
body.adv .hand .card.taught{box-shadow:0 0 0 0.1875rem #f2c14e,0 0 1.25rem rgba(242,193,78,.8)!important;transform:translateY(-0.5rem)}
@media (max-width:720px){
  body.adv .table.lesson{grid-template-areas:"west east" "talk talk" "center center" "me me"}
  body.adv .table.lesson > .talk{grid-area:talk;margin:0.375rem 0 0}
}`;

const SHOTS = [
  { file: 'desktop-1-kit-asks.png', w: 1100, h: 760, seat: 2, who: 'kit', point: null,
    say: 'Spades led, and I have none. Which one\'s trump again?', acts: ['Next'] },
  { file: 'desktop-2-mei-answers.png', w: 1100, h: 760, seat: 1, who: 'mei', point: 'JD',
    say: 'Hearts. Now read your tags: {JD} says <span class="tagref">LEFT ♥</span>. It counts as a heart, and it beats {QH}.', acts: ['Next'] },
  { file: 'phone-2-mei-answers.png', w: 390, h: 844, seat: 1, who: 'mei', point: 'JD',
    say: 'Hearts. Now read your tags: {JD} says <span class="tagref">LEFT ♥</span>. It counts as a heart, and it beats {QH}.', acts: ['Next'] },
  { file: 'desktop-3-solved.png', w: 1100, h: 760, seat: 1, who: 'mei', point: null, play: 'JD',
    say: 'Third-highest trump, after the Joker and {JH}. Tags first, then cards.', acts: ['Lessons', 'Next lesson'] }
];

(async () => {
  const srv = await serve(), browser = await launch();
  try {
    for (const s of SHOTS) {
      const { page, errors } = await openPage(browser, srv.url, { uiMode: 'advanced' });
      await page.setViewportSize({ width: s.w, height: s.h });
      await page.reload();
      await page.waitForTimeout(300);
      await page.evaluate(async ([shot, css]) => {
        const K = window.KCT, A = K.App, sleep = ms => new Promise(r => setTimeout(r, ms));
        const sp = document.querySelector('#speedSel'); sp.value = 'instant'; sp.dispatchEvent(new Event('change'));
        A.newGame(undefined, undefined);
        await sleep(200);
        const done = document.querySelector('[data-action="swap-done"]'); if (done) done.click();
        await sleep(200);
        /* Lesson 1 from the loader, with Mei and Kit in the seats. */
        const ld = K.Puzzles.load(K.PUZZLES[0]);
        ld.state.players = [{ name: 'You', human: true }, { name: 'Mei', human: false }, { name: 'Kit', human: false }];
        A.app.ui.personas = [null, 'mei', 'kit'];
        A.app.state = ld.state;
        if (shot.play) A.act({ type: 'PLAY', player: 0, card: shot.play }); else A.act({ type: 'NOPE' });
        await sleep(600);
        /* The Latest line from the game started above is not the lesson's. */
        const latest = document.querySelector('#latestCell'); if (latest) latest.style.visibility = 'hidden';
        document.head.insertAdjacentHTML('beforeend', '<style>' + css + '</style>');
        const P = K.PERSONAS.find(x => x.id === shot.who);
        const text = shot.say.replace(/\{(\w+)\}/g, (_, id) => K.Render.microHTML(id, 'Jkr'));
        const acts = shot.acts.map((a, i) => '<button type="button" class="btn' + (i === shot.acts.length - 1 ? ' primary' : '') + '">' + a + '</button>').join('');
        const html = '<div class="talk" role="dialog" aria-label="' + P.name + '" style="--who:' + P.color + '">' +
          '<b class="speaker">' + P.name + '</b><p>' + text + '</p><div class="acts">' + acts + '</div></div>';
        const phone = innerWidth <= 720;
        if (phone) {
          const table = document.querySelector('#table');
          table.classList.add('lesson');
          table.insertAdjacentHTML('beforeend', html);
          table.querySelector(':scope > .talk').style.setProperty('--tail', shot.seat === 2 ? '75%' : '25%');
        } else {
          document.querySelector('#seat' + shot.seat).insertAdjacentHTML('beforeend', html);
        }
        if (shot.point) { const c = document.querySelector('.hand [data-card="' + shot.point + '"]'); if (c) c.classList.add('taught'); }
      }, [s, PROTO_CSS]);
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, s.file) });
      console.log((errors.length ? '✖ ' : '✔ ') + s.file + (errors.length ? ' ' + errors.join(' | ') : ''));
      await page.context().close();
    }
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
