#!/usr/bin/env node
/* Not a check. Measures the pace of Dynamic's slow path (issue #117, decision 14: w = h / (h + PROFILE_HANDS)).
   For each PROFILE_HANDS value and each player strength, the player plays careers of Dynamic games in a row from a
   blank profile: two random personalities (as the app seats them), eased each hand by Dynamic.tracker exactly as in the
   app, then the post-game review updates the profile for the next game. The same seeds run for every value.
   Prints, per value and player: the starting easing and the mean easing in each game of a career, how many hands
   until the easing first reaches 0.3, and the player's win rate.
   It serves a patched copy of index.html (PROFILE_HANDS read from the page) and does not change the file.
   Usage: node pace.js [careers=12] [games-per-career=4] [workers=4] [values=100,50,30] */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { launch, openPage, run, ROOT } = require('./lib/browser');

const OFF = { bids: false, turnedCard: false, ownDiscards: false, voids: false, scoreAware: false, showdownPlans: false };
const PLAYERS = [
  { name: 'floor (row 8)', thinking: { worlds: 1, playoutSkill: 0.4 }, knowledge: OFF },
  { name: 'Novice strength (row 6)', thinking: { worlds: 3, playoutSkill: 0.4 }, knowledge: OFF },
  { name: 'Casual strength (row 4)', thinking: { worlds: 5, playoutSkill: 1 }, knowledge: OFF },
  { name: 'Club strength (row 1)', thinking: { worlds: 20, playoutSkill: 1 } }
];

function patchedPage() {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const at = '(x.h / (x.h + PROFILE_HANDS))';
  if (!html.includes(at)) throw new Error('index.html changed: the patch point is gone');
  return html.replace(at, '(x.h / (x.h + (window.__PH || PROFILE_HANDS)))');
}
function servePatched(html) {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/' || u === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); return; }
    const file = path.join(ROOT, u);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); } else { res.writeHead(200); res.end(data); } });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ url: 'http://127.0.0.1:' + srv.address().port + '/index.html', close: () => srv.close() })));
}

const PAGE = `
  const { Engine, AI, Replay, RNG, buildView, Dynamic: DY, PERSONAS } = KCT;
  const job = arg.job;
  window.__PH = job.K;
  const base = AI.personaConfig({ tier: 'shark', courage: 'normal', realTable: false, leadPick: 'fair' });
  const me = AI.config(base, { thinking: job.player.thinking, knowledge: job.player.knowledge || base.knowledge });
  /* The table a seed seats, as App.seedTable. */
  const seats = s => RNG.shuffle(PERSONAS.map(x => x.id), { s: (s ^ 0x5bd1e995) >>> 0 }).slice(0, 2).map(id => PERSONAS.find(x => x.id === id));
  let profile = DY.cleanProfile(null);
  const games = [];
  for (let g = 0; g < job.games; g++) {
    const seed = (job.seed + g * 7919) >>> 0, bots = seats(seed), t = DY.tracker(DY.snapshotOf(profile)), es = [];
    const s = Engine.createGame(seed); Engine.dispatch(s, { type: 'START_GAME' });
    for (let k = 0; k < 9000 && !s.gameOver; k++) {
      const ac = Engine.actors(s);
      let a;
      if (ac.length) {
        const p = ac[0], v = buildView(s, p), c = p === 0 ? me : DY.ease(bots[p - 1], t.e);
        a = AI.decide(v, c); if (Engine.validate(s, a)) a = AI.fallbackAction(v, c);
      } else a = Engine.systemAction(s);
      const res = Engine.dispatch(s, a);
      if (!res.ok) break;
      if (DY.handEnded(res.events, s)) { t.hand(buildView(s, 1)); es.push(t.e); }
    }
    const rv = DY.review(Replay.fromState(s, { mode: 'dynamic' }));
    if (rv) profile = DY.addGame(profile, rv, 'dynamic');
    const tot = s.scores[0] + s.scores[1] + s.scores[2];
    games.push({ e0: t.e0, es, won: s.gameOver && s.winner === 0, share: tot ? s.scores[0] / tot : 1 / 3, done: s.gameOver });
  }
  return games;`;

const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const r2 = x => Math.round(x * 100) / 100;

(async () => {
  const [c = '12', g = '4', w = '4', v = '100,50,30'] = process.argv.slice(2);
  const careers = Number(c), games = Number(g), workers = Number(w), values = v.split(',').map(Number);
  const jobs = [];
  for (const K of values) for (const player of PLAYERS) for (let i = 0; i < careers; i++) jobs.push({ K, player, games, seed: (1170 * 1000003 + i * 104729) >>> 0 });
  const srv = await servePatched(patchedPage()), browser = await launch(), t0 = Date.now();
  let done = 0;
  const res = (await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const mine = jobs.filter((_, i) => i % workers === k), { page } = await openPage(browser, srv.url), r = [];
    for (const job of mine) {
      r.push({ K: job.K, name: job.player.name, games: await run(page, PAGE, { job }) });
      if (++done % 8 === 0) console.error(done + '/' + jobs.length + ' careers, ' + Math.round((Date.now() - t0) / 1000) + ' s');
    }
    await page.context().close(); return r;
  }))).flat();
  await browser.close(); srv.close();

  const out = [];
  for (const K of values) for (const { name } of PLAYERS) {
    const C = res.filter(x => x.K === K && x.name === name);
    /* Hands until the easing first reaches 0.3, counted across the career; null when it never does. */
    const reach = C.map(x => { let n = 0; for (const gm of x.games) for (const e of gm.es) { n++; if (e >= 0.3) return n; } return null; });
    const reached = reach.filter(x => x !== null);
    out.push({
      PROFILE_HANDS: K, player: name, careers: C.length,
      startEasingByGame: Array.from({ length: games }, (_, i) => r2(mean(C.map(x => x.games[i].e0)))),
      meanEasingByGame: Array.from({ length: games }, (_, i) => r2(mean(C.flatMap(x => x.games[i].es)))),
      reached03: reached.length + ' of ' + C.length, medianHandsTo03: reached.length ? reached.sort((a, b) => a - b)[Math.floor(reached.length / 2)] : null,
      winRate: r2(100 * mean(C.flatMap(x => x.games.map(gm => gm.won ? 1 : 0)))), share: r2(100 * mean(C.flatMap(x => x.games.map(gm => gm.share))))
    });
  }
  console.log(JSON.stringify({ careers, gamesPerCareer: games, seconds: Math.round((Date.now() - t0) / 1000), results: out }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
