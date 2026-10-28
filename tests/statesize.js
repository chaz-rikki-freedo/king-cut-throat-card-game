#!/usr/bin/env node
/* Not a check. The serialized size of one representative bot decision: three bots at the default config play a seeded game
   to hand 3, trick 4 of the main play, and the script prints the size of what the deciding seat's AI reads (the view),
   the full game state and the decision, as JSON. For estimating what an LLM prompt per decision would cost.
   Usage: node statesize.js [seed] [hand] [trick] [--dump] */
'use strict';
const { serve, launch, openPage, run } = require('./lib/browser');

const args = process.argv.slice(2), dump = args.includes('--dump');
const [seed = 4242, hand = 3, trick = 4] = args.filter(a => !a.startsWith('--')).map(Number);

(async () => {
  const srv = await serve(), browser = await launch();
  const { page, errors } = await openPage(browser, srv.url);
  try {
    const r = await run(page, `
      const { Engine, AI, buildView } = window.KCT, P = Engine.P;
      const s = Engine.createGame(arg.seed);
      Engine.dispatch(s, { type: 'START_GAME' });
      /* Plays on until the wanted hand and trick of the main play, with a seat to act. */
      const at = () => s.phase === P.TRICK_PLAY && (s.handNumber - (s.redeals || 0)) === arg.hand && s.trickNumber === arg.trick && s.trick.plays.length === 1;
      for (let k = 0; k < 20000 && !s.gameOver && !at(); k++) {
        const ac = Engine.actors(s);
        const res = Engine.dispatch(s, ac.length ? AI.decide(buildView(s, ac[0])) : Engine.systemAction(s));
        if (!res.ok) throw new Error(res.error);
      }
      if (!at()) throw new Error('never reached hand ' + arg.hand + ', trick ' + arg.trick);
      const seat = Engine.actors(s)[0], view = buildView(s, seat), decision = AI.decide(view);
      /* The view without its empty fields (null, false, [], {}), as a prompt could carry it. */
      const prune = v => Array.isArray(v) ? v.map(prune) : v && typeof v === 'object'
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, prune(x)]).filter(([, x]) => !(x === null || x === false || (Array.isArray(x) && !x.length) || (x && typeof x === 'object' && !Array.isArray(x) && !Object.keys(x).length))))
        : v;
      const noLog = Object.assign({}, s, { decisions: undefined });
      const bytes = x => new TextEncoder().encode(x).length;
      const m = (name, x) => ({ name, compact: bytes(JSON.stringify(x)), pretty: bytes(JSON.stringify(x, null, 2)) });
      return {
        at: { seed: arg.seed, hand: (s.handNumber - (s.redeals || 0)), trick: s.trickNumber, of: s.totalTricks, seat, phase: s.phase, legal: view.legal.length, decisionsSoFar: (s.decisions || []).length },
        sizes: [m('view (what the bot reads)', view), m('view, empty fields pruned', prune(view)), m('game state', s), m('game state without the decisions log', noLog), m('decision', decision)],
        fields: Object.entries(view).map(([k, v]) => [k, bytes(JSON.stringify(v) || '')]).sort((a, b) => b[1] - a[1]).slice(0, 8),
        view: arg.dump ? view : undefined, decision
      };`, { seed, hand, trick, dump });
    const { at, sizes, fields, decision } = r;
    console.log(`Seed ${at.seed}, hand ${at.hand}, trick ${at.trick} of ${at.of}, seat ${at.seat} to follow (${at.legal} legal cards), ${at.decisionsSoFar} decisions logged so far`);
    console.log('Decision: ' + JSON.stringify(decision) + '\n');
    console.log('What'.padEnd(40) + 'Compact B'.padStart(10) + 'Pretty B'.padStart(10) + '  ~Tokens (compact ÷ 3.5 … ÷ 2.5)');
    for (const x of sizes) console.log(x.name.padEnd(40) + String(x.compact).padStart(10) + String(x.pretty).padStart(10) + `  ${Math.round(x.compact / 3.5)} … ${Math.round(x.compact / 2.5)}`);
    console.log('\nLargest view fields (compact bytes): ' + fields.map(([k, b]) => k + ' ' + b).join(', '));
    if (dump) console.log('\n' + JSON.stringify(r.view));
    if (errors.length) { console.log('\nPage errors: ' + errors.join('; ')); process.exitCode = 1; }
  } finally {
    await browser.close(); srv.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
