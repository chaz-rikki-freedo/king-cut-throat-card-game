#!/usr/bin/env node
/* Not a check. Measures bot strength for named sets of settings (the Dynamic easing ladder and its dials, issue #117).
   Each game: one test seat (rotating 0, 1, 2) plays two opponents with fixed settings. Prints, per setting, the test
   seat's win rate with a 95% margin and its share of the final scores (an even share is 33.3%).
   The page is a patched copy of index.html: AI.handValue and the round-1 bid value take an override that is set only
   while the test seat decides, so the "handvalue" set can give the test seat the fitted weights
   (data/handvalue-fit.json) while the opponents keep the current ones. The repository file is not changed.
   The "courage" set gives the test seat a raw bid courage bias (the win chance added to a buy when a bot plans its bid;
   COURAGE in index.html), in every seat or only as the dealer's left, and also prints the test seat's buy rate.
   Usage: node levers.js <dials|ladder|handvalue|courage> [games=300] [workers=4] */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { launch, openPage, run, ROOT } = require('./lib/browser');

const OFF = { bids: false, turnedCard: false, ownDiscards: false, voids: false, scoreAware: false, showdownPlans: false };
const shark = (name, thinking, knowledge) => ({ name, test: { tier: 'shark', thinking, knowledge } });
const SETS = {
  /* Each dial on its own, from Shark, and steps below Novice. */
  dials: { opp: { tier: 'casual' }, seed: 3, configs: [
    { name: 'casual (control)', test: { tier: 'casual' } },
    shark('shark'),
    ...[20, 10, 3, 1].map(n => shark('shark, hunches ' + n, { worlds: n })),
    ...[0.9, 0.7, 0.4, 0.1].map(p => shark('shark, brain farts ' + Math.round(100 - 100 * p) + '%', { playoutSkill: p })),
    ...Object.keys(OFF).map(k => shark('shark without ' + k, null, { [k]: false })),
    { name: 'novice', test: { tier: 'novice' } },
    { name: 'novice, hunches 1', test: { tier: 'novice', thinking: { worlds: 1 } } },
    { name: 'novice, brain farts 90%', test: { tier: 'novice', thinking: { playoutSkill: 0.1 } } },
    { name: 'novice, hunches 1, brain farts 90%', test: { tier: 'novice', thinking: { worlds: 1, playoutSkill: 0.1 } } }
  ] },
  /* The rows of the easing ladder, and the tier baselines. */
  ladder: { opp: { tier: 'casual' }, seed: 21, configs: [
    shark('row 0: 40 hunches'), shark('row 1: 20 hunches', { worlds: 20 }), shark('row 2: 10 hunches', { worlds: 10 }),
    shark('row 3: 5 hunches', { worlds: 5 }), shark('row 4: 5 hunches, knowledge off', { worlds: 5 }, OFF),
    shark('row 5: 3 hunches, knowledge off', { worlds: 3 }, OFF), shark('row 6: 3 hunches, knowledge off, brain farts 60%', { worlds: 3, playoutSkill: 0.4 }, OFF),
    shark('row 7: 2 hunches, knowledge off, brain farts 60%', { worlds: 2, playoutSkill: 0.4 }, OFF),
    shark('row 8 (floor): 1 hunch, knowledge off, brain farts 60%', { worlds: 1, playoutSkill: 0.4 }, OFF),
    shark('10 hunches, knowledge off', { worlds: 10 }, OFF),
    { name: 'club (baseline)', test: { tier: 'club' } }, { name: 'casual (baseline)', test: { tier: 'casual' } }, { name: 'novice (baseline)', test: { tier: 'novice' } }
  ] },
  /* Does a Shark buy too often? The courage bias, against two normal Sharks. bias 0 is a normal Shark. */
  courage: { opp: { tier: 'shark' }, seed: 31, configs: [
    ...[0.05, 0, -0.025, -0.05, -0.075, -0.1, -0.15].map(b => ({ name: 'shark, bias ' + b + (b ? '' : ' (control)'), test: { tier: 'shark', bias: b } })),
    { name: "shark, bias -0.1 as dealer's left only", test: { tier: 'shark', bias: -0.1, seatOnly: 1 } }
  ] },
  /* The fitted weights and the bid thresholds, for planning bots and for rule bidders. */
  handvalue: { runs: [
    { opp: { tier: 'shark' }, seed: 5, configs: [
      { name: 'shark, current weights (control)', test: { tier: 'shark' } },
      { name: 'shark, fitted weights', test: { tier: 'shark', fitted: true } }] },
    { opp: { tier: 'casual', realTable: true }, seed: 9, configs: [
      { name: 'real table casual, current weights (control)', test: { tier: 'casual', realTable: true } },
      { name: 'real table casual, fitted weights', test: { tier: 'casual', realTable: true, fitted: true } },
      { name: 'real table casual, thresholds +0.5', test: { tier: 'casual', realTable: true, thresholdsUp: 0.5 } },
      { name: 'real table casual, thresholds +1.0', test: { tier: 'casual', realTable: true, thresholdsUp: 1.0 } }] }
  ] }
};

function patchedPage() {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const hv = 'function handValue(hand, trump) {', r1 = 'function round1Value(hand, flipped, s) {';
  if (!html.includes(hv) || !html.includes(r1)) throw new Error('index.html changed: the patch points are gone');
  html = html.replace(hv, hv + ' if (window.__HV) return window.__HV(hand, trump);');
  html = html.replace(r1, r1 + ' if (window.__HV) return handValue(hand, s) - 0.85 * window.__TV[R.trumpRank(flipped, s)];');
  const cb = 'const bias = COURAGE[style.courage].bias;';
  if (html.split(cb).length !== 3) throw new Error('index.html changed: the courage patch points are gone');
  html = html.split(cb).join('const bias = window.__BIAS != null ? window.__BIAS : COURAGE[style.courage].bias;');
  return html;
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
  const { Engine, AI, Rules: R, buildView } = KCT;
  const W = arg.fit, BASE = Object.assign({}, AI.BID_THRESHOLDS);
  const fittedHV = (hand, trump) => heValue(W, hand, trump);
  const fittedTV = Object.fromEntries(HE_RANKS.map(r => [r, W.tricks['tr' + r] || 0]));
  const mk = c => {
    const base = AI.personaConfig({ tier: c.tier, courage: 'normal', realTable: !!c.realTable, leadPick: 'fair' });
    if (!c.thinking && !c.knowledge) return base;
    return Object.freeze({ thinking: Object.freeze(Object.assign({}, base.thinking, c.thinking || {})),
      knowledge: Object.freeze(Object.assign({}, base.knowledge, c.knowledge || {})), style: base.style, persona: base.persona });
  };
  const out = [];
  for (const job of arg.jobs) {
    const T = job.test, cfgs = [0, 1, 2].map(p => mk(p === job.seat ? T : job.opp));
    const th = T.fitted ? W.toCurrentScale.thresholds : T.thresholdsUp ? Object.fromEntries(Object.entries(BASE).map(([k, v]) => [k, k === 'BID_TEMP' ? v : v + T.thresholdsUp])) : null;
    const s = Engine.createGame(job.seed, ['A', 'B', 'C']);
    let steps = 0, turns = 0, buys = 0;
    while (!s.gameOver && steps++ < 8000) {
      const actors = Engine.actors(s);
      let a;
      if (actors.length) {
        const p = actors[0], v = buildView(s, p), mine = p === job.seat;
        if (mine && T.fitted) { window.__HV = fittedHV; window.__TV = fittedTV; }
        if (mine && th) Object.assign(AI.BID_THRESHOLDS, th);
        if (mine && T.bias != null && (T.seatOnly == null || (p - s.dealer + 3) % 3 === T.seatOnly)) window.__BIAS = T.bias;
        try { a = AI.decide(v, cfgs[p]); if (Engine.validate(s, a)) a = AI.fallbackAction(v, cfgs[p]); }
        finally { window.__HV = null; window.__BIAS = null; Object.assign(AI.BID_THRESHOLDS, BASE); }
      } else a = Engine.systemAction(s);
      if (a && a.player === job.seat && (a.type === 'BID' || a.type === 'NAME')) { turns++; if (a.accept || a.suit) buys++; }
      if (!a || !Engine.dispatch(s, a).ok) break;
    }
    const tot = s.scores.reduce((x, y) => x + y, 0);
    out.push({ name: job.name, done: s.gameOver, win: s.gameOver && s.winner === job.seat, share: tot ? s.scores[job.seat] / tot : 1 / 3, turns, buys });
  }
  return out;`;

async function measure(browser, url, set, games, workers, fit) {
  const jobs = [];
  for (const c of set.configs) for (let i = 0; i < games; i++)
    jobs.push({ name: c.name, test: c.test, opp: set.opp, seat: i % 3, seed: (set.seed * 1000003 + i * 7919) >>> 0 });
  /* Same deals and seats for every setting; interleaved so the workers share the slow settings. */
  jobs.sort((x, y) => (x.seed - y.seed) || x.name.localeCompare(y.name));
  const res = (await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const mine = jobs.filter((_, i) => i % workers === k), { page, errors } = await openPage(browser, url), r = [];
    for (let i = 0; i < mine.length; i += 6) r.push(...await run(page, PAGE, { jobs: mine.slice(i, i + 6), fit }, ['handest.js']));
    if (errors.length) console.error(errors.slice(0, 3));
    await page.context().close(); return r;
  }))).flat();
  return set.configs.map(c => {
    const g = res.filter(x => x.name === c.name && x.done), n = g.length, p = g.filter(x => x.win).length / n;
    return { name: c.name, games: n, unfinished: res.filter(x => x.name === c.name).length - n, winRate: Math.round(1000 * p) / 10,
      margin95: Math.round(1960 * Math.sqrt(p * (1 - p) / n)) / 10, scoreShare: Math.round(1000 * g.reduce((s, x) => s + x.share, 0) / n) / 10,
      buyRate: Math.round(1000 * g.reduce((s, x) => s + x.buys, 0) / Math.max(1, g.reduce((s, x) => s + x.turns, 0))) / 10 };
  });
}

(async () => {
  const [name, g = '300', w = '4'] = process.argv.slice(2);
  if (!SETS[name]) { console.error('Usage: node levers.js <' + Object.keys(SETS).join('|') + '> [games] [workers]'); process.exit(2); }
  const fit = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'handvalue-fit.json'), 'utf8'));
  const srv = await servePatched(patchedPage()), browser = await launch(), t0 = Date.now();
  const runs = SETS[name].runs || [SETS[name]], out = [];
  for (const set of runs) out.push({ opponents: set.opp, results: await measure(browser, srv.url, set, Number(g), Number(w), fit) });
  await browser.close(); srv.close();
  console.log(JSON.stringify({ set: name, gamesPerSetting: Number(g), seconds: Math.round((Date.now() - t0) / 1000), runs: out }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
