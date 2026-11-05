#!/usr/bin/env node
/* Not a check. How often each feedback cue fires, from bot games: the moments of interest above all, so each one stays
   rare (docs/ui/feedback.md, Moments of interest, rule 4). Plays games in the page with three personalities, from the
   bottom seat, turns each action's events into moments (KCT.Moments.build), groups them into batches by anchor as the
   game sends them, and runs the module's own derive, cueFor and compose (KCTFeedback.core), so novelty counts. Prints each cue's rate per game,
   and how many special cues and how many vibrations a game gives the player. Then the repeat count for trick cards
   (docs/ui/feedback.md, Variation within a game): how often a card's sound comes back within 3 plays of itself, the
   same take with the same tone (within 0.5 dB), against the variants and no tone before phase 8.
   Usage: node interest.js [games=200] [--json] */
'use strict';
const { serve, launch, openPage } = require('./lib/browser');

const args = process.argv.slice(2);
const games = Math.max(1, Number(args.find((a) => /^\d+$/.test(a))) || 200);
const json = args.includes('--json');

(async () => {
  const server = await serve();
  const browser = await launch();
  try {
    const { page } = await openPage(browser, server.url);
    await page.waitForFunction(() => /** @type {any} */ (window).KCTFeedback && /** @type {any} */ (window).KCT, null, { timeout: 15000 });
    const r = await page.evaluate(async (n) => {
      const { Engine, AI, Moments, buildView, PERSONAS } = /** @type {any} */ (window).KCT;
      const F = /** @type {any} */ (window).KCTFeedback.core;
      const count = {}, perGame = { special: [], vibrate: [], youVibrateSpecial: [] };
      /* Repeat count: each stream (your cards, the bots' cards) keeps its last 3 plays. */
      const OLD = { you: ['card-play', 'card-play-2', 'card-play-3'], bot: ['card-slide-in'] };
      const rep = { you: { n: 0, now: 0, before: 0 }, bot: { n: 0, now: 0, before: 0 } };
      const recent = { you: { now: [], before: [] }, bot: { now: [], before: [] } };
      const R = /** @type {any} */ (window).KCT.Rules;
      const hear = (who, now, before) => {
        const r = rep[who], q = recent[who];
        r.n++;
        if (q.now.some((x) => x.sound === now.sound && Math.abs(x.tone - now.tone) < 0.5)) r.now++;
        if (q.before.includes(before)) r.before++;
        q.now.push(now); q.before.push(before);
        if (q.now.length > 3) { q.now.shift(); q.before.shift(); }
      };
      const ids = PERSONAS.map((p) => p.id);
      let hands = 0, done = 0;
      for (let gi = 0; gi < n; gi++) {
        const seed = 1000 + gi * 7919;
        const cfgs = [0, 1, 2].map((k) => AI.personaConfig(PERSONAS[(gi * 3 + k) % ids.length]));
        const g = Engine.createGame(seed, ['A', 'B', 'C']);
        const mem = F.newMemory();
        let special = 0, vib = 0, youSpecialVib = 0;
        /* A sweep waits for the next action, as the game sends it; a game's end carries its trick. */
        let heldSweep = [];
        let version = 0;
        const run = (batch) => {
          const before = mem.scores ? mem.scores.slice() : null;
          const d = F.derive(mem, batch);
          const full = { version: ++version, moments: batch.moments.concat(d) };
          const found = F.cueFor(full, { you: mem.you });
          if (!found) return;
          /* What plays: after novelty (a repeated special gives way to its ordinary cue) and escalation. */
          const parts = F.compose(found, full, mem, F.stakesOf(before, full));
          count[parts.name] = (count[parts.name] || 0) + 1;
          if (parts.special) special++;
          if (parts.vibrate) { vib++; if (parts.special) youSpecialVib++; }
        };
        for (let k = 0; !g.gameOver && k < 8000; k++) {
          const ac = Engine.actors(g);
          const a = ac.length ? AI.decide(buildView(g, ac[0]), cfgs[ac[0]]) : Engine.systemAction(g);
          if (!a) break;
          const res = Engine.dispatch(g, a);
          if (!res.ok) break;
          if (res.events.some((e) => e.type === 'HAND_SCORED')) hands++;
          for (const e of res.events) {
            if (e.type !== 'CARD_PLAYED') continue;
            const sd = !!(g.showdown && g.showdown.active), you = e.player === 0, c = R.card(e.card);
            const key = 'card|' + g.handNumber + '|' + (sd ? 'sd' : '') + '|' + g.trickNumber + '|' + e.player + e.card;
            const bs = F.beatSound({ beat: 'card', key, you, seat: e.player, cards: 1, high: !!c && (c.isJoker || c.rank === 'A' || c.rank === 'K') });
            const old = you ? OLD.you : OLD.bot;
            hear(you ? 'you' : 'bot', { sound: bs.sound, tone: bs.hits[0].tone }, old[F.hash(key) % old.length]);
          }
          const ms = Moments.build(res.events, buildView(g, 0), { mode: 'free' });
          const by = (an) => ms.filter((m) => Moments.ANCHOR[m.type] === an);
          if (heldSweep.length && !by('gameOver').length) { run({ moments: heldSweep }); heldSweep = []; }
          if (by('land').length) run({ moments: by('land') });
          if (by('gameOver').length) { run({ moments: heldSweep.concat(by('sweep'), by('gameOver')) }); heldSweep = []; }
          else if (by('sweep').length) heldSweep = by('sweep');
          if (by('result').length) run({ moments: by('result') });
        }
        if (g.gameOver) done++;
        perGame.special.push(special); perGame.vibrate.push(vib); perGame.youVibrateSpecial.push(youSpecialVib);
      }
      const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      const pct = (a, q) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(q * a.length))];
      return { games: n, finished: done, hands, count, special: { avg: avg(perGame.special), p90: pct(perGame.special, 0.9) },
        vibrate: { avg: avg(perGame.vibrate) }, youVibrateSpecial: { avg: avg(perGame.youVibrateSpecial), p90: pct(perGame.youVibrateSpecial, 0.9) },
        specials: Object.keys(F.CUES).filter((k) => F.CUES[k].special), rep };
    }, games);
    if (json) { console.log(JSON.stringify(r, null, 2)); return; }
    console.log(`${r.games} bot games (${r.finished} finished), ${r.hands} hands, from the bottom seat.\n`);
    console.log('Moments of interest, per game:');
    for (const k of r.specials) console.log('  ' + k.padEnd(16) + (((r.count[k] || 0) / r.games).toFixed(3)).padStart(7) + '   (' + (r.count[k] || 0) + ')');
    console.log('\nOrdinary cues, per game:');
    for (const k of Object.keys(r.count).filter((k) => !r.specials.includes(k)).sort()) console.log('  ' + k.padEnd(16) + ((r.count[k] / r.games).toFixed(2)).padStart(7));
    console.log(`\nSpecial cues per game: ${r.special.avg.toFixed(2)} on average, ${r.special.p90} at the 90th percentile.`);
    console.log(`Special cues that vibrate for you, per game: ${r.youVibrateSpecial.avg.toFixed(2)} on average, ${r.youVibrateSpecial.p90} at the 90th percentile.`);
    console.log(`All vibrating cues per game: ${r.vibrate.avg.toFixed(1)}.`);
    const pc = (x, k) => (100 * x[k] / Math.max(1, x.n)).toFixed(1) + '%';
    console.log('\nRepeat count: a trick card\'s sound back within 3 plays of itself (same take, tone within 0.5 dB).');
    console.log(`  Your cards (${r.rep.you.n}):    ${pc(r.rep.you, 'now')} now, ${pc(r.rep.you, 'before')} before phase 8 (3 takes, no tone).`);
    console.log(`  Bots' cards (${r.rep.bot.n}):  ${pc(r.rep.bot, 'now')} now, ${pc(r.rep.bot, 'before')} before phase 8 (1 take, no tone).`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
