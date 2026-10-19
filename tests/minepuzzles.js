#!/usr/bin/env node
/* Puzzle mining (docs/puzzles.md). Bots play hand 1 of many seeded games. At each of your moves in the last four
   main tricks, the search (Puzzles.answers) asks how many tricks you can force, and how many points. A position is a
   candidate when the goal can be forced, few of your moves force it, and the move a quick player would make (the fast
   AI) does not. Prints the candidates as puzzlekit specs. Not a check.

     node minepuzzles.js 400 4 > candidates.json      # 400 games in 4 pages */
'use strict';
const { serve, launch, openPage } = require('./lib/browser');

const games = Number(process.argv[2] || 200), workers = Number(process.argv[3] || 4);

(async () => {
  const srv = await serve(), browser = await launch();
  try {
    const jobs = Array.from({ length: workers }, (_, k) => k);
    const results = await Promise.all(jobs.map(async k => {
      const { page } = await openPage(browser, srv.url);
      return page.evaluate(([k, workers, games]) => {
        const K = window.KCT, E = K.Engine, P = E.P, R = K.Rules, Pz = K.Puzzles;
        const out = [];
        for (let g = k; g < games; g += workers) {
          const seed = 1000 + g * 7919;
          const st = E.createGame(seed, ['You', 'West', 'East']);
          const step = () => { const sys = E.systemAction(st); if (sys) return E.dispatch(st, sys); const p = E.actors(st)[0]; return E.dispatch(st, K.AI.fastAction(st, p)); };
          let deal = null, dealer = null;
          while (!st.gameOver && st.handNumber <= 1) {
            if (st.phase === P.DISCARD && !deal) { deal = { hands: st.hands.map(h => h.slice()), kitty: st.kitty.slice() }; dealer = st.dealer; }
            if (st.phase === P.JOKER_VOID || (st.redeals || 0) > 0) break;
            if (st.phase === P.TRICK_PLAY && E.actors(st)[0] === 0 && st.trickNumber >= 4 && deal) {
              const script = st.decisions.slice();
              const base = { format: 2, id: 'mined-' + seed + '-' + st.trickNumber + '-' + st.trick.plays.length, kind: 'puzzle', title: 'T', teachers: { west: 'mei', east: 'kit' }, prompt: 'P', lesson: 'L', dealer, scores: [0, 0, 0], deal, script };
              const ld = Pz.load(Object.assign({ goal: { type: 'playHand' } }, base));
              if (ld.ok) {
                const s0 = ld.state, left = E.C.MAIN_TRICKS - s0.trickWinners.length, have = s0.tricksWon[0];
                const fast = K.AI.fastAction(s0, 0).card;
                /* Each trick target you can force, where some of your moves fail and the quick move is one of them. */
                for (let min = have + left; min >= have + 2; min--) {
                  const goal = { type: 'tricks', min };
                  const ans = Pz.answers(goal, s0, s0);
                  if (!ans) break;
                  const wins = ans.filter(x => x.wins).map(x => x.action.card);
                  if (!wins.length) continue;
                  if (wins.length < ans.length && !wins.includes(fast))
                    out.push({ spec: Object.assign({}, base, { goal }), seed, trick: s0.trickNumber, led: s0.trick.plays.map(x => x.card), trump: s0.trump, hand: s0.hands[0], others: [s0.hands[1], s0.hands[2]], have, left, min, wins, fast, legal: ans.length, kind: 'tricks' });
                  break;
                }
                /* King points: a King of yours can win, but only if played right. */
                if (s0.hands[0].some(id => R.isKing(id))) {
                  const goal = { type: 'score', min: s0.scores[0] + 1 };
                  const ans = Pz.answers(goal, s0, s0);
                  if (ans) {
                    const wins = ans.filter(x => x.wins).map(x => x.action.card);
                    if (wins.length && wins.length < ans.length && !wins.includes(fast))
                      out.push({ spec: Object.assign({}, base, { goal }), seed, trick: s0.trickNumber, led: s0.trick.plays.map(x => x.card), trump: s0.trump, hand: s0.hands[0], others: [s0.hands[1], s0.hands[2]], have, left, wins, fast, legal: ans.length, kind: 'score+1' });
                  }
                }
              }
            }
            const r = step();
            if (!r.ok) break;
          }
        }
        return out;
      }, [k, workers, games]);
    }));
    const all = results.flat();
    console.error(all.length + ' candidates from ' + games + ' games');
    console.log(JSON.stringify(all, null, 1));
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
