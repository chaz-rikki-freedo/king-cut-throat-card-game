#!/usr/bin/env node
/* Not a check. The habit report: how each personality plays its cards and bids, counted with KCT.Habits from bot games
   (every table of three personalities, seat orders rotating, as in roundrobin.js). With --backup or --codes it adds a
   "you" column from your own finished games (seat 0, games where the AI never played your seat).
   Usage: node habits.js [games=1] [workers=4] [seed=1] [--backup file.kct] [--codes file.txt] [--json]
   games is the number per table of three (120 tables). --backup reads a Your data backup (Settings → Tools → Your data:
   Save file, or its code); its kct.replays holds your last 20 finished games. --codes reads replay codes, one per line.
   The spread column is the highest bot rate minus the lowest: a small spread is a habit that all ten bots share. */
'use strict';
const fs = require('fs');
const { serve, launch, openPage, run } = require('./lib/browser');

const addCounts = (a, b) => Object.fromEntries(Object.keys(a).map(k => [k, a[k] + b[k]]));

const PAGE = `
  const { Engine, AI, buildView, Replay, Habits } = KCT;
  const out = [];
  for (const job of arg.jobs) {
    const cfgs = job.seats.map(id => AI.personaConfig(arg.personas[id]));
    const s = Engine.createGame(job.seed, job.seats.map(id => arg.personas[id].name));
    let steps = 0;
    while (!s.gameOver && steps++ < 5000) {
      const actors = Engine.actors(s);
      let a;
      if (actors.length) {
        const p = actors[0], v = buildView(s, p);
        a = AI.decide(v, cfgs[p]);
        if (Engine.validate(s, a)) a = AI.fallbackAction(v, cfgs[p]);
      } else a = Engine.systemAction(s);
      if (!a) break;
      if (!Engine.dispatch(s, a).ok) break;
    }
    out.push({ seats: job.seats, hands: s.handNumber, counts: s.gameOver ? Habits.count(Replay.fromState(s)) : null });
  }
  return out;`;

/* Your games: seat 0's counts from replay codes. Codes from a backup skip games where the AI played your seat. */
const MINE = `
  const { Replay, Habits, Backup } = KCT;
  let codes = arg.codes;
  if (arg.backup) {
    const env = await Backup.parse(arg.backup);
    const list = JSON.parse(env.data['kct.replays'] || '[]');
    codes = list.filter(e => e && typeof e.code === 'string' && e.assisted !== true).map(e => e.code);
  }
  const you = Habits.blank();
  let games = 0, skipped = 0;
  for (const code of codes) {
    try { Habits.add(you, Habits.count(Replay.decode(code))[0]); games++; } catch (e) { skipped++; }
  }
  return { games, skipped, you };`;

(async () => {
  const args = process.argv.slice(2), flag = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
  const backupFile = flag('--backup'), codesFile = flag('--codes');
  const json = args.includes('--json');
  const [g = '1', w = '4', sd = '1'] = args.filter(x => x !== '--json');
  const games = Number(g), workers = Number(w), seed0 = Number(sd);
  const srv = await serve(), browser = await launch();
  const { page } = await openPage(browser, srv.url);
  const info = await run(page, `return { personas: PERSONAS.map(x => Object.assign({}, x)), keys: KCT.Habits.KEYS, labels: KCT.Habits.LABELS };`);
  let mine = null;
  if (backupFile || codesFile) {
    const arg = backupFile ? { backup: fs.readFileSync(backupFile, 'utf8') } : { codes: fs.readFileSync(codesFile, 'utf8').split(/\s+/).filter(x => /^KCT\d+-/.test(x)) };
    mine = await run(page, MINE, arg);
  }
  const P = Object.fromEntries(info.personas.map(x => [x.id, x])), ids = info.personas.map(x => x.id);

  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const jobs = [];
  let n = 0, t = 0;
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) for (let c = b + 1; c < ids.length; c++) {
    const trio = [ids[a], ids[b], ids[c]];
    for (let k = 0; k < games; k++) jobs.push({ seats: perms[(t + k) % 6].map(i => trio[i]), seed: (seed0 * 1000003 + n++) >>> 0 });
    t++;
  }
  const shards = Array.from({ length: workers }, (_, i) => jobs.filter((_, j) => j % workers === i));
  const t0 = Date.now();
  const results = (await Promise.all(shards.map(async (sh) => {
    const { page: pg, errors } = await openPage(browser, srv.url);
    const res = [];
    for (let i = 0; i < sh.length; i += 100) res.push(...await run(pg, PAGE, { jobs: sh.slice(i, i + 100), personas: P }));
    if (errors.length) console.error(errors.slice(0, 5));
    await pg.context().close();
    return res;
  }))).flat();

  const counts = Object.fromEntries(ids.map(id => [id, null])), hands = Object.fromEntries(ids.map(id => [id, 0]));
  let unfinished = 0;
  for (const r of results) {
    if (!r.counts) { unfinished++; continue; }
    r.seats.forEach((id, p) => { hands[id] += r.hands; counts[id] = counts[id] ? addCounts(counts[id], r.counts[p]) : r.counts[p]; });
  }
  /* The rates come from the page's KCT.Habits.rates, so this report and the console's KCT.App.habits() agree. */
  const all = await run(page, 'return Object.fromEntries(Object.entries(arg).map(([k, c]) => [k, KCT.Habits.rates(c || KCT.Habits.blank())]));',
    Object.assign({}, counts, mine && mine.games ? { you: mine.you } : {}));
  await page.context().close();
  await browser.close(); srv.close();
  const rates = id => all[id];
  const cols = ids.map(id => ({ name: P[id].name, r: rates(id) }));
  if (mine && mine.games) cols.push({ name: 'You', r: rates('you') });
  const keys = Object.keys(info.labels);
  const spread = Object.fromEntries(keys.map(k => {
    const v = ids.map(id => rates(id)[k]).filter(x => x !== null);
    return [k, v.length ? Math.max(...v) - Math.min(...v) : null];
  }));
  if (json) {
    console.log(JSON.stringify({ gamesPerTable: games, total: results.length, unfinished, seconds: Math.round((Date.now() - t0) / 1000), hands, mine,
      rates: Object.fromEntries(cols.map(c => [c.name, c.r])), spread, counts }, null, 1));
    return;
  }
  /* Shares as percentages; averages (King trick, hand values) with two decimals. */
  const avg = new Set(['kingTrick', 'call1Value', 'pass1Value', 'call2Value', 'pass2Value']);
  const fmt = (k, x) => (x === null ? '–' : avg.has(k) ? x.toFixed(2) : Math.round(100 * x) + '%');
  const width = Math.max(...keys.map(k => info.labels[k].length));
  const head = ''.padEnd(width) + cols.map(c => c.name.padStart(6)).join('') + 'spread'.padStart(8);
  console.log('Habit report: ' + results.length + ' bot games (' + unfinished + ' unfinished), ' + Math.round((Date.now() - t0) / 1000) + ' s.' +
    (mine ? ' Your games: ' + mine.games + (mine.skipped ? ' (' + mine.skipped + ' could not be read)' : '') + '.' : ''));
  console.log(head);
  for (const k of keys) console.log(info.labels[k].padEnd(width) + cols.map(c => fmt(k, c.r[k]).padStart(6)).join('') + fmt(k, spread[k]).padStart(8));
})().catch(e => { console.error(e); process.exit(1); });
