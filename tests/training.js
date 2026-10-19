#!/usr/bin/env node
/* Training through the real controls (docs/ui/teacher-bubbles.md): a first launch opens on the lobby (Ace offers
   Training, no menu); each lesson's bubbles, a wrong answer, Try again and Hint (the right card glows); every lesson
   solved by clicks, the guided hand played out with its tips; then Puzzles in the menu, no saved game, results or
   replays written, and the lessons kept over a reload. Also a lesson on a phone: the bubble moves the table down and
   your hand stays in view. Exit code 1 on a failed check. */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

let failed = 0;
function expect(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? '  ✔ ' : '  ✖ ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400)));
}

/* Page helpers on top of drive.js: the bubble, the lesson, and the move that solves it (from the search). */
const LESSON = `
  const talkBtn = a => q('#talk [data-action="' + a + '"]');
  const lesson = () => app.lesson;
  const until = async (f, ms = 20000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) return false; await sleep(20); } return true; };
  /* Reads the bubbles up to the task: Next until Play. */
  async function toPlay() { while (talkBtn('talk-next')) { click('#talk [data-action="talk-next"]'); await sleep(10); } if (talkBtn('talk-close')) click('#talk [data-action="talk-close"]'); await sleep(10); }
  /* The answer: a card that wins against the best defence, or for a call, Accept. */
  function answer(right) {
    const L = lesson(), g = L.item.goal;
    if (g.type === 'decide') return right ? '[data-action="bid-accept"]' : '[data-action="bid-pass"]';
    const ans = KCT.Puzzles.answers(g, L.start, app.state);
    const pick = ans.find(x => x.wins === right);
    return '#hand button[data-card="' + pick.action.card + '"]';
  }
  const verdict = () => { const L = lesson(); return L && L.verdict ? L.verdict.verdict : null; };
`;

(async () => {
  const srv = await serve(), browser = await launch();
  try {
    console.log('Training on a wide screen');
    const { page, errors } = await openPage(browser, srv.url);
    await page.setViewportSize({ width: 1100, height: 780 });
    const step = (src, arg) => run(page, LESSON + src, arg, ['drive.js']);
    let r = await step(`
      await sleep(300);
      return { menu: overlayOpen(), talk: !!q('#talk'), start: !!talkBtn('training-start'), who: q('#talk .speaker') && q('#talk .speaker').textContent,
        voice: getComputedStyle(q('#talk p')).fontFamily, table: getComputedStyle(q('#seat1 .seat-name') || document.body).fontFamily,
        mode: app.mode, choose: !!q('#center [data-action="menu"]') };`);
    expect('a first launch opens on the lobby, not the menu', !r.menu && r.mode === null, r);
    expect('Ace offers Training in a bubble', r.talk && r.start && r.who === 'Ace', r);
    expect('only the dialogue has the lesson font; the table keeps the game\'s font', /Lesson Voice/.test(r.voice) && !/Lesson Voice/.test(r.table), r);
    expect('the table still offers Choose a game', r.choose, r);

    r = await step(`
      speed('fast');
      click('#talk [data-action="training-start"]'); await sleep(50);
      const out = { mode: app.mode, id: lesson().item.id, chip: q('#modeChip').textContent, latest: q('#latestCell') && q('#latestCell').textContent };
      await toPlay();
      /* Lesson 1: a wrong card first. */
      click(answer(false));
      out.failed = await until(() => verdict() === 'failed' && !!talkBtn('lesson-retry'));
      out.hintBtn = !!talkBtn('lesson-hint');
      click('#talk [data-action="lesson-hint"]'); await sleep(50);
      out.hintFresh = !verdict() && lesson().tries === 1;
      out.glow = q('#hand .taught') && q('#hand .taught').getAttribute('data-card');
      await toPlay();
      out.glowAfterPlay = q('#hand .taught') && q('#hand .taught').getAttribute('data-card');
      click(answer(true));
      out.solved = await until(() => verdict() === 'solved' && !!talkBtn('lesson-next'));
      out.done = JSON.parse(localStorage.getItem('kct.lessons') || '{}');
      return out;`);
    expect('Start training opens lesson 1 of 7, with its chip', r.mode === 'training' && r.id === 'follow-suit' && /Training 1/i.test(r.chip), r);
    expect('a wrong card fails the lesson: Try again and Hint', r.failed && r.hintBtn, r);
    expect('Hint starts the lesson again with the right card glowing', r.hintFresh && r.glow === 'AS' && r.glowAfterPlay === 'AS', r);
    expect('the right card solves it, and the lesson is kept', r.solved && (r.done.done || []).includes('follow-suit'), r);

    r = await step(`
      const out = [];
      for (let k = 0; k < 5; k++) {
        click('#talk [data-action="lesson-next"]'); await sleep(50);
        const id = lesson().item.id;
        await toPlay();
        click(answer(true));
        const ok = await until(() => verdict() === 'solved' && !!talkBtn('lesson-next'));
        out.push({ id, ok, score: app.state.scores[0], over: app.state.gameOver });
      }
      return out;`);
    expect('lessons 2 to 6 are solved by their answers', r.length === 5 && r.every(x => x.ok), r);
    expect('First to 10 ends the game at once, and the lesson says so', r.some(x => x.id === 'first-to-ten' && x.over && x.score === 10), r);

    r = await step(`
      click('#talk [data-action="lesson-next"]'); await sleep(50);
      const L = lesson(), out = { id: L.item.id, phase: app.state.phase };
      const stop = await drive(() => !!verdict(), 300000);
      out.stop = stop;
      out.verdict = verdict();
      out.tips = Object.keys(L.said);
      await until(() => !!talkBtn('puzzles-open') || !!talkBtn('talk-next'));
      while (talkBtn('talk-next')) { click('#talk [data-action="talk-next"]'); await sleep(20); }
      out.end = { puzzles: !!talkBtn('puzzles-open'), play: !!talkBtn('play-first-wave'), text: q('#talk p').textContent };
      out.store = { lessons: JSON.parse(localStorage.getItem('kct.lessons')).done.length, slots: localStorage.getItem('kct.slots'), stats: localStorage.getItem('kct.stats'), replays: localStorage.getItem('kct.replays') };
      return out;`);
    expect('lesson 7 is a whole hand from the discard', r.id === 'first-hand' && r.phase === 'discard', r);
    expect('the hand plays to its end and solves the lesson', r.stop === 'stop' && r.verdict === 'solved', r);
    expect('the coach spoke on the discard, the call and the play', ['discard', 'bid1'].every(k => r.tips.includes(k)) && (r.tips.includes('lead') || r.tips.includes('follow')), r.tips);
    expect('Training ends with Play a game and Puzzles', r.end.puzzles && r.end.play && /Training done/.test(r.end.text), r.end);
    const emptyish = x => x === null || x === '{}' || x === '[]' || /"modes":\{\}/.test(x);
    expect('lessons write no saved game, no results and no replays', r.store.lessons === 7 && emptyish(r.store.slots) && emptyish(r.store.stats) && emptyish(r.store.replays), r.store);

    r = await step(`
      click('[data-action="menu"]'); await sleep(50);
      const card = q('#overlay .mcard[data-mode="puzzles"]');
      return { card: !!card, chip: card && card.querySelector('.mode-chip').textContent, training: !!q('#overlay [data-action="training-replay"]') };`);
    expect('the menu now has Puzzles as its fourth mode, and Training stays in the tools', r.card && r.chip === 'Puzzles' && r.training, r);
    await page.reload();
    r = await step(`await sleep(300); return { menu: overlayOpen(), lobbyHost: q('#talk .speaker') && q('#talk .speaker').textContent };`);
    expect('after Training, a launch opens the menu; the lobby behind it is hosted by Mei', r.menu && r.lobbyHost === 'Mei', r);

    console.log('Puzzles');
    r = await step(`
      speed('fast');
      click('#overlay [data-action="puzzles-open"]'); await sleep(50);
      const out = { mode: app.mode, id: lesson().item.id };
      await toPlay();
      /* A wrong move: the opponents defend, and the puzzle fails. */
      click(answer(false));
      out.wrong = await until(() => verdict() === 'failed' && !!talkBtn('lesson-retry'), 30000);
      out.verdict = verdict();
      click('#talk [data-action="lesson-retry"]'); await sleep(50);
      await toPlay();
      out.solved = [];
      for (let n = 0; n < KCT.PUZZLES.length; n++) {
        const id = lesson().item.id;
        /* Each of your moves: one that still forces the goal; the opponents answer with the best defence. */
        while (!verdict()) {
          if (KCT.Engine.actors(app.state).includes(0) && !app.timerFn) { await toPlay(); click(answer(true)); }
          await sleep(30);
        }
        out.solved.push(id + ':' + verdict());
        await until(() => !!talkBtn('lesson-next') || !!talkBtn('lesson-list'));
        if (talkBtn('lesson-next')) { click('#talk [data-action="lesson-next"]'); await sleep(50); await toPlay(); }
      }
      out.count = JSON.parse(localStorage.getItem('kct.lessons')).done.length;
      out.slots = localStorage.getItem('kct.slots');
      click('#talk [data-action="menu"]'); await sleep(50);
      out.tail = q('#overlay .mcard[data-mode="puzzles"] .mtail').textContent;
      click('#overlay [data-action="close-menu"]'); await sleep(50);
      return out;`);
    expect('Puzzles opens on puzzle 1', r.mode === 'puzzles' && r.id === 'win-cheaply', r);
    expect('a wrong move fails a puzzle against the best defence', r.wrong, r);
    expect('all ten puzzles are solved by their answers', r.solved.length === 10 && r.solved.every(x => x.endsWith(':solved')), r.solved);
    expect('the menu counts 10 of 10 solved, and nothing is saved as a game', r.tail === '10 of 10 solved' && r.count === 17 && (r.slots === null || r.slots === '{}'), r);
    expect('no page errors', !errors.length, errors);
    await page.context().close();

    console.log('A lesson on a phone');
    const ph = await openPage(browser, srv.url);
    await ph.page.setViewportSize({ width: 390, height: 844 });
    await ph.page.reload();
    r = await run(ph.page, LESSON + `
      await sleep(300);
      click('#talk [data-action="training-start"]'); await sleep(400);
      const talk = q('#talk'), table = q('#table'), hand = Array.from(document.querySelectorAll('#hand .card'));
      const lastBottom = Math.max(...hand.map(c => c.getBoundingClientRect().bottom));
      return { inRow: getComputedStyle(talk).gridArea.startsWith('talk'), talking: table.classList.contains('talking'),
        handInView: lastBottom <= innerHeight + 1, lastBottom, h: innerHeight, scrollW: document.documentElement.scrollWidth };`, null, ['drive.js']);
    expect('on a phone the bubble is a row of the table', r.inRow && r.talking, r);
    expect('your hand stays in view while a bubble shows', r.handInView, r);
    expect('no sideways scroll on a phone', r.scrollW <= 390, r);
    expect('no page errors on the phone', !ph.errors.length, ph.errors);
  } finally { await browser.close(); srv.close(); }
  console.log(failed ? 'FAIL: ' + failed + ' check(s) failed' : 'OK: all checks passed');
  process.exitCode = failed ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
